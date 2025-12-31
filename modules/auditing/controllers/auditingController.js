import * as auditingService from '../services/auditingService.js';
import * as organizationService from '../../organizations/services/organizationService.js';
import logger from '../../../server/utils/logger.js';

/**
 * CPF Auditing Controller
 * Handles HTTP requests for CPF auditing assessments
 */

/**
 * Transform assessment data from DB format to frontend format
 */
function transformAssessmentData(dbAssessment) {
  const assessments = {};
  const categoryStats = {};

  // Transform assessment_data from "1-1" format to "1.1" format with bayesian_score
  const assessmentData = dbAssessment.assessment_data || {};

  for (const [key, data] of Object.entries(assessmentData)) {
    // Convert "1-1" to "1.1"
    const indicatorId = key.replace('-', '.');
    const category = key.split('-')[0];

    // Convert value (0-3) to bayesian_score (0-1)
    const value = data.value || 0;
    const bayesianScore = value === 0 ? 0 : value / 3;

    assessments[indicatorId] = {
      bayesian_score: bayesianScore,
      raw_data: {
        client_conversation: {
          responses: data.notes ? { note: data.notes } : {}
        }
      },
      last_updated: data.last_updated
    };

    // Aggregate by category
    if (!categoryStats[category]) {
      categoryStats[category] = {
        total: 0,
        assessed: 0,
        totalRisk: 0
      };
    }
    categoryStats[category].total++;
    if (value > 0) {
      categoryStats[category].assessed++;
      categoryStats[category].totalRisk += bayesianScore;
    }
  }

  // Calculate aggregates
  const byCategory = {};
  let totalAssessed = 0;
  let totalIndicators = Object.keys(assessmentData).length;

  for (const [cat, stats] of Object.entries(categoryStats)) {
    const avgRisk = stats.assessed > 0 ? stats.totalRisk / stats.assessed : 0;
    const completion = stats.total > 0 ? (stats.assessed / stats.total) * 100 : 0;

    byCategory[cat] = {
      risk: avgRisk,
      completion: completion,
      assessed: stats.assessed,
      total: stats.total
    };

    totalAssessed += stats.assessed;
  }

  const completionPercentage = totalIndicators > 0 ? (totalAssessed / totalIndicators) * 100 : 0;

  return {
    id: dbAssessment.organization_id,
    name: dbAssessment.organization_name,
    organization_type: dbAssessment.organization_type,
    status: dbAssessment.organization_status,
    assessments,
    aggregates: {
      by_category: byCategory,
      completion: {
        percentage: completionPercentage,
        assessed_indicators: totalAssessed
      }
    },
    metadata: dbAssessment.metadata || {},
    created_at: dbAssessment.created_at,
    updated_at: dbAssessment.updated_at
  };
}

/**
 * @route   GET /api/auditing/organizations/:organizationId
 * @desc    Get assessment for a specific organization
 * @access  Private
 */
export async function getOrganizationAssessment(req, res) {
  try {
    const { organizationId } = req.params;
    const assessment = await auditingService.getAssessmentByOrganization(parseInt(organizationId));

    if (!assessment) {
      // If no assessment exists, return organization basic data with empty assessments
      const org = await organizationService.getOrganizationById(parseInt(organizationId));

      return res.json({
        success: true,
        data: {
          id: org.id,
          name: org.name,
          organization_type: org.organization_type,
          status: org.status,
          assessments: {},
          aggregates: {
            by_category: {},
            completion: { percentage: 0, assessed_indicators: 0 }
          },
          metadata: { language: 'it-IT' },
          created_at: org.created_at,
          updated_at: org.updated_at
        }
      });
    }

    // Transform assessment data to frontend format
    const transformedData = transformAssessmentData(assessment);

    res.json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    logger.error('Error getting organization assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve assessment',
      error: error.message
    });
  }
}

/**
 * @route   GET /api/auditing/assessments
 * @desc    Get all assessments
 * @access  Private (admin)
 */
export async function getAllAssessments(req, res) {
  try {
    const { limit, offset, includeDeleted } = req.query;
    const filters = {
      limit: parseInt(limit) || 100,
      offset: parseInt(offset) || 0,
      includeDeleted: includeDeleted === 'true'
    };

    const assessments = await auditingService.getAllAssessments(filters);

    res.json({
      success: true,
      data: assessments,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total: assessments.length
      }
    });
  } catch (error) {
    logger.error('Error getting all assessments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve assessments',
      error: error.message
    });
  }
}

/**
 * @route   POST /api/auditing/organizations/:organizationId
 * @desc    Create assessment for an organization
 * @access  Private
 */
export async function createOrganizationAssessment(req, res) {
  try {
    const { organizationId } = req.params;
    const { assessmentData = {}, metadata = {} } = req.body;

    const assessment = await auditingService.createAssessment(
      parseInt(organizationId),
      assessmentData,
      metadata
    );

    res.status(201).json({
      success: true,
      message: 'Assessment created successfully',
      data: assessment
    });
  } catch (error) {
    logger.error('Error creating assessment:', error);

    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create assessment',
      error: error.message
    });
  }
}

/**
 * @route   PUT /api/auditing/organizations/:organizationId
 * @desc    Update assessment for an organization
 * @access  Private
 */
export async function updateOrganizationAssessment(req, res) {
  try {
    const { organizationId } = req.params;
    const { assessmentData, metadata } = req.body;

    if (!assessmentData) {
      return res.status(400).json({
        success: false,
        message: 'Assessment data is required'
      });
    }

    const assessment = await auditingService.updateAssessment(
      parseInt(organizationId),
      assessmentData,
      metadata
    );

    res.json({
      success: true,
      message: 'Assessment updated successfully',
      data: assessment
    });
  } catch (error) {
    logger.error('Error updating assessment:', error);

    if (error.message === 'Assessment not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update assessment',
      error: error.message
    });
  }
}

/**
 * @route   DELETE /api/auditing/organizations/:organizationId
 * @desc    Soft delete assessment (move to trash)
 * @access  Private
 */
export async function deleteOrganizationAssessment(req, res) {
  try {
    const { organizationId } = req.params;
    const assessment = await auditingService.softDeleteAssessment(parseInt(organizationId));

    res.json({
      success: true,
      message: 'Assessment moved to trash',
      data: assessment
    });
  } catch (error) {
    logger.error('Error deleting assessment:', error);

    if (error.message === 'Assessment not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete assessment',
      error: error.message
    });
  }
}

/**
 * @route   POST /api/auditing/organizations/:organizationId/restore
 * @desc    Restore assessment from trash
 * @access  Private
 */
export async function restoreOrganizationAssessment(req, res) {
  try {
    const { organizationId } = req.params;
    const assessment = await auditingService.restoreAssessment(parseInt(organizationId));

    res.json({
      success: true,
      message: 'Assessment restored successfully',
      data: assessment
    });
  } catch (error) {
    logger.error('Error restoring assessment:', error);

    if (error.message === 'Deleted assessment not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to restore assessment',
      error: error.message
    });
  }
}

/**
 * @route   DELETE /api/auditing/organizations/:organizationId/permanent
 * @desc    Permanently delete assessment
 * @access  Private (admin)
 */
export async function permanentlyDeleteAssessment(req, res) {
  try {
    const { organizationId } = req.params;
    const deleted = await auditingService.permanentlyDeleteAssessment(parseInt(organizationId));

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    res.json({
      success: true,
      message: 'Assessment permanently deleted'
    });
  } catch (error) {
    logger.error('Error permanently deleting assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete assessment',
      error: error.message
    });
  }
}

/**
 * @route   GET /api/auditing/trash
 * @desc    Get deleted assessments (trash)
 * @access  Private
 */
export async function getTrash(req, res) {
  try {
    const deletedAssessments = await auditingService.getDeletedAssessments();

    res.json({
      success: true,
      data: deletedAssessments
    });
  } catch (error) {
    logger.error('Error getting trash:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve deleted assessments',
      error: error.message
    });
  }
}

/**
 * @route   GET /api/auditing/statistics
 * @desc    Get assessment statistics
 * @access  Private
 */
export async function getStatistics(req, res) {
  try {
    const stats = await auditingService.getAssessmentStatistics();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics',
      error: error.message
    });
  }
}

export default {
  getOrganizationAssessment,
  getAllAssessments,
  createOrganizationAssessment,
  updateOrganizationAssessment,
  deleteOrganizationAssessment,
  restoreOrganizationAssessment,
  permanentlyDeleteAssessment,
  getTrash,
  getStatistics
};
