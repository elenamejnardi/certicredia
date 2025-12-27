import { pool } from '../../../server/config/database.js';
import logger from '../../../server/utils/logger.js';
import {
  assignSpecialist,
  getAssignmentByToken,
  revokeAssignment,
  getAllAssignments
} from '../services/workflowService.js';
import {
  addReviewComment,
  getReviewComments,
  resolveReviewComment
} from '../services/reviewService.js';

/**
 * Assign specialist to assessment
 */
export const createSpecialistAssignment = async (req, res) => {
  try {
    const { assessmentId, specialistId, expiresInDays } = req.body;

    const assignment = await assignSpecialist({
      assessmentId,
      specialistId,
      assignedBy: req.user.id,
      expiresInDays: expiresInDays || 30
    });

    logger.info(`✅ Specialist ${specialistId} assigned to assessment ${assessmentId} by user ${req.user.id}`);

    res.status(201).json({
      success: true,
      message: 'Specialista assegnato con successo',
      data: assignment
    });
  } catch (error) {
    logger.error('Error assigning specialist:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'assegnazione dello specialista'
    });
  }
};

/**
 * Get all specialist assignments
 */
export const getSpecialistAssignments = async (req, res) => {
  try {
    const { assessmentId, specialistId, status } = req.query;

    const filters = {};
    if (assessmentId) filters.assessmentId = assessmentId;
    if (specialistId) filters.specialistId = specialistId;
    if (status) filters.status = status;

    const assignments = await getAllAssignments(filters);

    res.json({
      success: true,
      data: assignments
    });
  } catch (error) {
    logger.error('Error fetching specialist assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero delle assegnazioni'
    });
  }
};

/**
 * Get assignment by access token
 */
export const getAssignmentByAccessToken = async (req, res) => {
  try {
    const { token } = req.params;

    const assignment = await getAssignmentByToken(token);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assegnazione non trovata o scaduta'
      });
    }

    res.json({
      success: true,
      data: assignment
    });
  } catch (error) {
    logger.error('Error fetching assignment by token:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero dell\'assegnazione'
    });
  }
};

/**
 * Revoke specialist assignment
 */
export const revokeSpecialistAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    await revokeAssignment(id);

    logger.info(`✅ Specialist assignment ${id} revoked by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Assegnazione revocata con successo'
    });
  } catch (error) {
    logger.error('Error revoking assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la revoca dell\'assegnazione'
    });
  }
};

/**
 * Add review comment
 */
export const createReviewComment = async (req, res) => {
  try {
    const { assessmentId, section, fieldId, commentText, severity } = req.body;

    const comment = await addReviewComment({
      assessmentId,
      userId: req.user.id,
      section,
      fieldId,
      commentText,
      severity: severity || 'info'
    });

    logger.info(`✅ Review comment added to assessment ${assessmentId} by user ${req.user.id}`);

    res.status(201).json({
      success: true,
      message: 'Commento aggiunto con successo',
      data: comment
    });
  } catch (error) {
    logger.error('Error adding review comment:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'aggiunta del commento'
    });
  }
};

/**
 * Get review comments for assessment
 */
export const getAssessmentReviewComments = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const { section, resolved } = req.query;

    const filters = { assessmentId };
    if (section) filters.section = section;
    if (resolved !== undefined) filters.resolved = resolved === 'true';

    const comments = await getReviewComments(filters);

    res.json({
      success: true,
      data: comments
    });
  } catch (error) {
    logger.error('Error fetching review comments:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero dei commenti'
    });
  }
};

/**
 * Resolve review comment
 */
export const resolveComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution } = req.body;

    await resolveReviewComment(id, req.user.id, resolution);

    logger.info(`✅ Review comment ${id} resolved by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Commento risolto con successo'
    });
  } catch (error) {
    logger.error('Error resolving comment:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la risoluzione del commento'
    });
  }
};

/**
 * Get workflow statistics
 */
export const getWorkflowStats = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active') as active_assignments,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_assignments,
        COUNT(*) FILTER (WHERE status = 'revoked') as revoked_assignments,
        COUNT(DISTINCT specialist_id) as total_specialists,
        COUNT(DISTINCT assessment_id) as total_assessments
      FROM specialist_assignments
    `);

    const commentStats = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE resolved = false) as open_comments,
        COUNT(*) FILTER (WHERE resolved = true) as resolved_comments,
        COUNT(DISTINCT assessment_id) as assessments_with_comments
      FROM review_comments
    `);

    res.json({
      success: true,
      data: {
        assignments: stats.rows[0],
        comments: commentStats.rows[0]
      }
    });
  } catch (error) {
    logger.error('Error fetching workflow stats:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero delle statistiche'
    });
  }
};
