import { pool } from '../../../server/config/database.js';
import logger from '../../../server/utils/logger.js';
import { generateAssessmentReport, generateCertificate } from '../services/pdfService.js';

/**
 * Generate assessment report PDF
 */
export const generateAssessmentPDF = async (req, res) => {
  try {
    const { id } = req.params;

    // Get assessment data
    const assessmentResult = await pool.query(
      `SELECT a.*,
        o.name as organization_name,
        o.vat_number,
        o.address,
        o.city,
        o.postal_code,
        o.country,
        t.name as template_name,
        t.type as template_type,
        t.template_data,
        u.name as specialist_name
      FROM assessments a
      LEFT JOIN organizations o ON a.organization_id = o.id
      LEFT JOIN assessment_templates t ON a.template_id = t.id
      LEFT JOIN users u ON a.assigned_to = u.id
      WHERE a.id = $1`,
      [id]
    );

    if (assessmentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assessment non trovato'
      });
    }

    const assessment = assessmentResult.rows[0];

    // Generate PDF
    const pdfBuffer = await generateAssessmentReport(assessment);

    logger.info(`✅ Assessment report generated for ID ${id} by user ${req.user.id}`);

    // Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="assessment-report-${id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    logger.error('Error generating assessment report:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la generazione del report'
    });
  }
};

/**
 * Generate certificate PDF
 */
export const generateCertificatePDF = async (req, res) => {
  try {
    const { id } = req.params;

    // Get assessment data
    const assessmentResult = await pool.query(
      `SELECT a.*,
        o.name as organization_name,
        o.vat_number,
        t.name as template_name,
        t.type as template_type
      FROM assessments a
      LEFT JOIN organizations o ON a.organization_id = o.id
      LEFT JOIN assessment_templates t ON a.template_id = t.id
      WHERE a.id = $1 AND a.status = 'approved'`,
      [id]
    );

    if (assessmentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assessment non trovato o non approvato'
      });
    }

    const assessment = assessmentResult.rows[0];

    // Generate certificate PDF
    const pdfBuffer = await generateCertificate(assessment);

    logger.info(`✅ Certificate generated for assessment ${id} by user ${req.user.id}`);

    // Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    logger.error('Error generating certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la generazione del certificato'
    });
  }
};

/**
 * Get organization statistics report
 */
export const getOrganizationReport = async (req, res) => {
  try {
    const { id } = req.params;

    const stats = await pool.query(
      `SELECT
        o.id,
        o.name,
        o.vat_number,
        o.type,
        o.status,
        o.created_at,
        COUNT(DISTINCT a.id) as total_assessments,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'approved') as approved_assessments,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'draft') as draft_assessments,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'submitted') as submitted_assessments,
        COUNT(DISTINCT ou.user_id) as total_users,
        MAX(a.approved_at) as last_approval_date
      FROM organizations o
      LEFT JOIN assessments a ON o.id = a.organization_id
      LEFT JOIN organization_users ou ON o.id = ou.organization_id
      WHERE o.id = $1
      GROUP BY o.id, o.name, o.vat_number, o.type, o.status, o.created_at`,
      [id]
    );

    if (stats.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Organizzazione non trovata'
      });
    }

    // Get recent assessments
    const recentAssessments = await pool.query(
      `SELECT a.id, a.status, a.created_at, a.submitted_at, a.approved_at,
        t.name as template_name, t.type as template_type
      FROM assessments a
      LEFT JOIN assessment_templates t ON a.template_id = t.id
      WHERE a.organization_id = $1
      ORDER BY a.created_at DESC
      LIMIT 10`,
      [id]
    );

    res.json({
      success: true,
      data: {
        statistics: stats.rows[0],
        recentAssessments: recentAssessments.rows
      }
    });
  } catch (error) {
    logger.error('Error generating organization report:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la generazione del report organizzazione'
    });
  }
};

/**
 * Get specialist statistics report
 */
export const getSpecialistReport = async (req, res) => {
  try {
    const { id } = req.params;

    const stats = await pool.query(
      `SELECT
        u.id,
        u.name,
        u.email,
        sp.certification_status,
        sp.exam_score,
        sp.certification_date,
        sp.expiry_date,
        COUNT(DISTINCT sa.id) as total_assignments,
        COUNT(DISTINCT sa.id) FILTER (WHERE sa.status = 'active') as active_assignments,
        COUNT(DISTINCT sa.id) FILTER (WHERE sa.status = 'completed') as completed_assignments,
        COUNT(DISTINCT rc.id) as total_comments,
        SUM(cpe.hours) as total_cpe_hours
      FROM users u
      LEFT JOIN specialist_profiles sp ON u.id = sp.user_id
      LEFT JOIN specialist_assignments sa ON u.id = sa.specialist_id
      LEFT JOIN review_comments rc ON u.id = rc.user_id
      LEFT JOIN specialist_cpe_records cpe ON u.id = cpe.specialist_id
      WHERE u.id = $1
      GROUP BY u.id, u.name, u.email, sp.certification_status, sp.exam_score, sp.certification_date, sp.expiry_date`,
      [id]
    );

    if (stats.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Specialista non trovato'
      });
    }

    // Get recent assignments
    const recentAssignments = await pool.query(
      `SELECT sa.id, sa.status, sa.assigned_at, sa.completed_at,
        a.id as assessment_id,
        o.name as organization_name
      FROM specialist_assignments sa
      LEFT JOIN assessments a ON sa.assessment_id = a.id
      LEFT JOIN organizations o ON a.organization_id = o.id
      WHERE sa.specialist_id = $1
      ORDER BY sa.assigned_at DESC
      LIMIT 10`,
      [id]
    );

    // Get CPE records
    const cpeRecords = await pool.query(
      `SELECT activity_date, activity_type, hours, description, provider
      FROM specialist_cpe_records
      WHERE specialist_id = $1
      ORDER BY activity_date DESC
      LIMIT 20`,
      [id]
    );

    res.json({
      success: true,
      data: {
        statistics: stats.rows[0],
        recentAssignments: recentAssignments.rows,
        cpeRecords: cpeRecords.rows
      }
    });
  } catch (error) {
    logger.error('Error generating specialist report:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la generazione del report specialista'
    });
  }
};

/**
 * Get system-wide analytics
 */
export const getSystemAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = '';
    const params = [];

    if (startDate && endDate) {
      dateFilter = 'WHERE a.created_at BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    }

    const assessmentStats = await pool.query(
      `SELECT
        COUNT(*) as total_assessments,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'submitted') as submitted_count,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
        COUNT(DISTINCT organization_id) as unique_organizations,
        AVG(EXTRACT(EPOCH FROM (approved_at - created_at))/86400)::numeric(10,2) as avg_days_to_approval
      FROM assessments a
      ${dateFilter}`,
      params
    );

    const organizationStats = await pool.query(
      `SELECT
        COUNT(*) as total_organizations,
        COUNT(*) FILTER (WHERE status = 'active') as active_organizations,
        COUNT(*) FILTER (WHERE status = 'suspended') as suspended_organizations,
        COUNT(*) FILTER (WHERE type = 'corporate') as corporate_count,
        COUNT(*) FILTER (WHERE type = 'government') as government_count,
        COUNT(*) FILTER (WHERE type = 'non_profit') as non_profit_count
      FROM organizations`
    );

    const specialistStats = await pool.query(
      `SELECT
        COUNT(*) as total_specialists,
        COUNT(*) FILTER (WHERE certification_status = 'certified') as certified_count,
        COUNT(*) FILTER (WHERE certification_status = 'expired') as expired_count,
        AVG(exam_score)::numeric(10,2) as avg_exam_score
      FROM specialist_profiles`
    );

    const evidenceStats = await pool.query(
      `SELECT
        COUNT(*) as total_files,
        SUM(file_size)::bigint as total_size_bytes,
        COUNT(DISTINCT assessment_id) as assessments_with_evidence
      FROM evidence_files`
    );

    res.json({
      success: true,
      data: {
        assessments: assessmentStats.rows[0],
        organizations: organizationStats.rows[0],
        specialists: specialistStats.rows[0],
        evidence: evidenceStats.rows[0]
      }
    });
  } catch (error) {
    logger.error('Error generating system analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la generazione delle analitiche di sistema'
    });
  }
};
