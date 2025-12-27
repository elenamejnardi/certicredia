import { pool } from '../../../server/config/database.js';
import logger from '../../../server/utils/logger.js';
import {
  createTemplate,
  activateTemplate,
  getActiveTemplate,
  getAllTemplates,
  getTemplateById,
  getTemplatesByType
} from '../services/assessmentTemplateService.js';

/**
 * Create a new assessment template
 */
export const createAssessmentTemplate = async (req, res) => {
  try {
    const { name, type, templateData, description } = req.body;

    const template = await createTemplate({
      name,
      type,
      templateData,
      description,
      createdBy: req.user.id
    });

    logger.info(`✅ Assessment template created: ${name} by user ${req.user.id}`);

    res.status(201).json({
      success: true,
      message: 'Template creato con successo',
      data: template
    });
  } catch (error) {
    logger.error('Error creating assessment template:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la creazione del template'
    });
  }
};

/**
 * Get all assessment templates
 */
export const getAssessmentTemplates = async (req, res) => {
  try {
    const { type } = req.query;

    let templates;
    if (type) {
      templates = await getTemplatesByType(type);
    } else {
      templates = await getAllTemplates();
    }

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    logger.error('Error fetching assessment templates:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero dei template'
    });
  }
};

/**
 * Get single assessment template
 */
export const getAssessmentTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await getTemplateById(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template non trovato'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error('Error fetching assessment template:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero del template'
    });
  }
};

/**
 * Activate a template version
 */
export const activateAssessmentTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    await activateTemplate(id);

    logger.info(`✅ Template activated: ${id} by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Template attivato con successo'
    });
  } catch (error) {
    logger.error('Error activating template:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'attivazione del template'
    });
  }
};

/**
 * Get active template for a type
 */
export const getActiveAssessmentTemplate = async (req, res) => {
  try {
    const { type } = req.params;

    const template = await getActiveTemplate(type);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Nessun template attivo trovato per questo tipo'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error('Error fetching active template:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero del template attivo'
    });
  }
};

/**
 * Create a new assessment instance
 */
export const createAssessment = async (req, res) => {
  const client = await pool.connect();

  try {
    const { organizationId, templateId, assignedTo } = req.body;

    await client.query('BEGIN');

    // Get template
    const template = await getTemplateById(templateId);
    if (!template) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Template non trovato'
      });
    }

    // Create assessment
    const result = await client.query(
      `INSERT INTO assessments (
        organization_id,
        template_id,
        status,
        assigned_to,
        responses,
        created_by
      ) VALUES ($1, $2, 'draft', $3, '{}', $4)
      RETURNING *`,
      [organizationId, templateId, assignedTo || null, req.user.id]
    );

    await client.query('COMMIT');

    logger.info(`✅ Assessment created for organization ${organizationId} by user ${req.user.id}`);

    res.status(201).json({
      success: true,
      message: 'Assessment creato con successo',
      data: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la creazione dell\'assessment'
    });
  } finally {
    client.release();
  }
};

/**
 * Get all assessments
 */
export const getAssessments = async (req, res) => {
  try {
    const { organizationId, status } = req.query;

    let query = `
      SELECT a.*,
        o.name as organization_name,
        t.name as template_name,
        t.type as template_type,
        u.name as assigned_to_name
      FROM assessments a
      LEFT JOIN organizations o ON a.organization_id = o.id
      LEFT JOIN assessment_templates t ON a.template_id = t.id
      LEFT JOIN users u ON a.assigned_to = u.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (organizationId) {
      query += ` AND a.organization_id = $${paramCount++}`;
      params.push(organizationId);
    }

    if (status) {
      query += ` AND a.status = $${paramCount++}`;
      params.push(status);
    }

    query += ` ORDER BY a.created_at DESC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error fetching assessments:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero degli assessment'
    });
  }
};

/**
 * Get single assessment
 */
export const getAssessment = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT a.*,
        o.name as organization_name,
        t.name as template_name,
        t.type as template_type,
        t.template_data,
        u.name as assigned_to_name
      FROM assessments a
      LEFT JOIN organizations o ON a.organization_id = o.id
      LEFT JOIN assessment_templates t ON a.template_id = t.id
      LEFT JOIN users u ON a.assigned_to = u.id
      WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assessment non trovato'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero dell\'assessment'
    });
  }
};

/**
 * Update assessment responses
 */
export const updateAssessmentResponses = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { responses, status } = req.body;

    await client.query('BEGIN');

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (responses) {
      updateFields.push(`responses = $${paramCount++}`);
      values.push(JSON.stringify(responses));
    }

    if (status) {
      updateFields.push(`status = $${paramCount++}`);
      values.push(status);

      if (status === 'submitted') {
        updateFields.push(`submitted_at = NOW()`);
      } else if (status === 'approved') {
        updateFields.push(`approved_at = NOW()`);
        updateFields.push(`approved_by = $${paramCount++}`);
        values.push(req.user.id);
      }
    }

    values.push(id);

    const result = await client.query(
      `UPDATE assessments
       SET ${updateFields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Assessment non trovato'
      });
    }

    await client.query('COMMIT');

    logger.info(`✅ Assessment ${id} updated by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Assessment aggiornato con successo',
      data: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error updating assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'aggiornamento dell\'assessment'
    });
  } finally {
    client.release();
  }
};

/**
 * Delete assessment
 */
export const deleteAssessment = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM assessments WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assessment non trovato'
      });
    }

    logger.info(`✅ Assessment ${id} deleted by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Assessment eliminato con successo'
    });
  } catch (error) {
    logger.error('Error deleting assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'eliminazione dell\'assessment'
    });
  }
};
