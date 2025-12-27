import express from 'express';
import {
  generateAssessmentPDF,
  generateCertificatePDF,
  getOrganizationReport,
  getSpecialistReport,
  getSystemAnalytics
} from '../controllers/reportController.js';
import { authenticate, isAdmin } from '../../../server/middleware/auth.js';

const router = express.Router();

// PDF generation routes
router.get('/assessment/:id/pdf', authenticate, generateAssessmentPDF);
router.get('/certificate/:id/pdf', authenticate, generateCertificatePDF);

// Statistics and analytics routes
router.get('/organization/:id', authenticate, getOrganizationReport);
router.get('/specialist/:id', authenticate, getSpecialistReport);
router.get('/analytics', authenticate, isAdmin, getSystemAnalytics);

export default router;
