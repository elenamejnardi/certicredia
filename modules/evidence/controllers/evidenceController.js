import { pool } from '../../../server/config/database.js';
import logger from '../../../server/utils/logger.js';
import {
  uploadEvidence,
  getEvidenceById,
  getAllEvidence,
  deleteEvidence,
  trackAccess
} from '../services/evidenceService.js';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/evidence/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    cb(null, `${Date.now()}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max
  },
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo di file non supportato'));
    }
  }
});

/**
 * Upload evidence file
 */
export const uploadEvidenceFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nessun file caricato'
      });
    }

    const { assessmentId, documentType, description } = req.body;

    const evidenceData = {
      assessmentId,
      documentType,
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      description,
      uploadedBy: req.user.id
    };

    const evidence = await uploadEvidence(evidenceData);

    logger.info(`✅ Evidence file uploaded: ${req.file.originalname} by user ${req.user.id}`);

    res.status(201).json({
      success: true,
      message: 'File caricato con successo',
      data: evidence
    });
  } catch (error) {
    logger.error('Error uploading evidence:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Errore durante il caricamento del file'
    });
  }
};

/**
 * Get all evidence files
 */
export const getEvidenceFiles = async (req, res) => {
  try {
    const { assessmentId, documentType } = req.query;

    const filters = {};
    if (assessmentId) filters.assessmentId = assessmentId;
    if (documentType) filters.documentType = documentType;

    const files = await getAllEvidence(filters);

    res.json({
      success: true,
      data: files
    });
  } catch (error) {
    logger.error('Error fetching evidence files:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero dei file'
    });
  }
};

/**
 * Get single evidence file metadata
 */
export const getEvidenceFile = async (req, res) => {
  try {
    const { id } = req.params;

    const evidence = await getEvidenceById(id);

    if (!evidence) {
      return res.status(404).json({
        success: false,
        message: 'File non trovato'
      });
    }

    // Track access
    await trackAccess({
      evidenceId: id,
      userId: req.user.id,
      action: 'view',
      ipAddress: req.ip
    });

    res.json({
      success: true,
      data: evidence
    });
  } catch (error) {
    logger.error('Error fetching evidence file:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero del file'
    });
  }
};

/**
 * Download evidence file
 */
export const downloadEvidenceFile = async (req, res) => {
  try {
    const { id } = req.params;

    const evidence = await getEvidenceById(id);

    if (!evidence) {
      return res.status(404).json({
        success: false,
        message: 'File non trovato'
      });
    }

    // Track access
    await trackAccess({
      evidenceId: id,
      userId: req.user.id,
      action: 'download',
      ipAddress: req.ip
    });

    logger.info(`✅ Evidence file downloaded: ${evidence.file_name} by user ${req.user.id}`);

    // Send file
    res.download(evidence.file_path, evidence.file_name);
  } catch (error) {
    logger.error('Error downloading evidence file:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il download del file'
    });
  }
};

/**
 * Delete evidence file
 */
export const deleteEvidenceFile = async (req, res) => {
  try {
    const { id } = req.params;

    await deleteEvidence(id);

    logger.info(`✅ Evidence file deleted: ${id} by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'File eliminato con successo'
    });
  } catch (error) {
    logger.error('Error deleting evidence file:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'eliminazione del file'
    });
  }
};

/**
 * Get evidence access history
 */
export const getEvidenceAccessHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT ea.*, u.name as user_name, u.email as user_email
       FROM evidence_access_log ea
       LEFT JOIN users u ON ea.user_id = u.id
       WHERE ea.evidence_id = $1
       ORDER BY ea.accessed_at DESC
       LIMIT 100`,
      [id]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error fetching evidence access history:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero dello storico accessi'
    });
  }
};

export { upload };
