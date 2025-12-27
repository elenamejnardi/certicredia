import { pool } from '../../../server/config/database.js';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import logger from '../../../server/utils/logger.js';

/**
 * Evidence Service - Local file storage
 * Simple implementation for file uploads without S3
 */

/**
 * Upload evidence file (local storage)
 */
export const uploadEvidence = async (evidenceData) => {
  const client = await pool.connect();

  try {
    const {
      assessmentId,
      documentType,
      fileName,
      filePath,
      fileSize,
      mimeType,
      description,
      uploadedBy
    } = evidenceData;

    // Calculate file hash
    const fileBuffer = await fs.readFile(filePath);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO evidence_files (
        assessment_id, file_name, file_path, file_size_bytes,
        mime_type, file_hash, description, uploaded_by,
        storage_provider, storage_bucket
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'local', 'uploads')
      RETURNING *`,
      [
        assessmentId,
        fileName,
        filePath,
        fileSize,
        mimeType,
        fileHash,
        description || null,
        uploadedBy
      ]
    );

    await client.query('COMMIT');

    logger.info(`✅ Evidence uploaded: ${fileName}`);

    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error uploading evidence:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get evidence by ID
 */
export const getEvidenceById = async (id) => {
  try {
    const result = await pool.query(
      `SELECT e.*, u.name as uploaded_by_name
       FROM evidence_files e
       LEFT JOIN users u ON e.uploaded_by = u.id
       WHERE e.id = $1`,
      [id]
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error getting evidence:', error);
    throw error;
  }
};

/**
 * Get all evidence with filters
 */
export const getAllEvidence = async (filters = {}) => {
  try {
    let query = `
      SELECT e.*, u.name as uploaded_by_name,
        a.id as assessment_id
      FROM evidence_files e
      LEFT JOIN users u ON e.uploaded_by = u.id
      LEFT JOIN assessments a ON e.assessment_id = a.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (filters.assessmentId) {
      query += ` AND e.assessment_id = $${paramCount++}`;
      params.push(filters.assessmentId);
    }

    if (filters.documentType) {
      query += ` AND e.document_type = $${paramCount++}`;
      params.push(filters.documentType);
    }

    query += ` ORDER BY e.uploaded_at DESC`;

    const result = await pool.query(query, params);

    return result.rows;
  } catch (error) {
    logger.error('Error getting all evidence:', error);
    throw error;
  }
};

/**
 * Delete evidence
 */
export const deleteEvidence = async (id) => {
  const client = await pool.connect();

  try {
    // Get file info
    const evidence = await getEvidenceById(id);
    if (!evidence) {
      throw new Error('Evidence non trovato');
    }

    await client.query('BEGIN');

    // Delete file from filesystem
    try {
      await fs.unlink(evidence.file_path);
    } catch (err) {
      logger.warn(`Could not delete file ${evidence.file_path}: ${err.message}`);
    }

    // Delete from database
    await client.query('DELETE FROM evidence_files WHERE id = $1', [id]);

    await client.query('COMMIT');

    logger.info(`✅ Evidence deleted: ${evidence.file_name}`);

    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error deleting evidence:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Track evidence access
 */
export const trackAccess = async (accessData) => {
  try {
    const { evidenceId, userId, action, ipAddress } = accessData;

    // Create access log table if it doesn't exist (optional)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS evidence_access_log (
        id BIGSERIAL PRIMARY KEY,
        evidence_id BIGINT REFERENCES evidence_files(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(50),
        ip_address VARCHAR(50),
        accessed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(
      `INSERT INTO evidence_access_log (evidence_id, user_id, action, ip_address)
       VALUES ($1, $2, $3, $4)`,
      [evidenceId, userId, action, ipAddress]
    );

    // Update access count
    await pool.query(
      `UPDATE evidence_files
       SET accessed_at = CURRENT_TIMESTAMP,
           access_count = COALESCE(access_count, 0) + 1
       WHERE id = $1`,
      [evidenceId]
    );

    return { success: true };
  } catch (error) {
    logger.error('Error tracking access:', error);
    // Don't throw - access tracking should not break the main flow
    return { success: false };
  }
};

export default {
  uploadEvidence,
  getEvidenceById,
  getAllEvidence,
  deleteEvidence,
  trackAccess
};
