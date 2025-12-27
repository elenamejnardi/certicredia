import express from 'express';
import {
  createAssessmentTemplate,
  getAssessmentTemplates,
  getAssessmentTemplate,
  activateAssessmentTemplate,
  getActiveAssessmentTemplate,
  createAssessment,
  getAssessments,
  getAssessment,
  updateAssessmentResponses,
  deleteAssessment
} from '../controllers/assessmentController.js';
import { authenticate, isAdmin } from '../../../server/middleware/auth.js';

const router = express.Router();

// Template routes (Admin only)
router.post('/templates', authenticate, isAdmin, createAssessmentTemplate);
router.get('/templates', authenticate, getAssessmentTemplates);
router.get('/templates/:id', authenticate, getAssessmentTemplate);
router.post('/templates/:id/activate', authenticate, isAdmin, activateAssessmentTemplate);
router.get('/templates/active/:type', authenticate, getActiveAssessmentTemplate);

// Assessment instance routes
router.post('/', authenticate, createAssessment);
router.get('/', authenticate, getAssessments);
router.get('/:id', authenticate, getAssessment);
router.put('/:id', authenticate, updateAssessmentResponses);
router.delete('/:id', authenticate, isAdmin, deleteAssessment);

export default router;
