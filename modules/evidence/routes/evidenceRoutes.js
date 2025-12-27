import express from 'express';
import {
  uploadEvidenceFile,
  getEvidenceFiles,
  getEvidenceFile,
  downloadEvidenceFile,
  deleteEvidenceFile,
  getEvidenceAccessHistory,
  upload
} from '../controllers/evidenceController.js';
import { authenticate, isAdmin } from '../../../server/middleware/auth.js';

const router = express.Router();

// Evidence routes
router.post('/', authenticate, upload.single('file'), uploadEvidenceFile);
router.get('/', authenticate, getEvidenceFiles);
router.get('/:id', authenticate, getEvidenceFile);
router.get('/:id/download', authenticate, downloadEvidenceFile);
router.delete('/:id', authenticate, isAdmin, deleteEvidenceFile);
router.get('/:id/access-history', authenticate, isAdmin, getEvidenceAccessHistory);

export default router;
