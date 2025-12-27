import express from 'express';
import {
  createSpecialistAssignment,
  getSpecialistAssignments,
  getAssignmentByAccessToken,
  revokeSpecialistAssignment,
  createReviewComment,
  getAssessmentReviewComments,
  resolveComment,
  getWorkflowStats
} from '../controllers/workflowController.js';
import { authenticate, isAdmin } from '../../../server/middleware/auth.js';

const router = express.Router();

// Specialist assignment routes
router.post('/assignments', authenticate, isAdmin, createSpecialistAssignment);
router.get('/assignments', authenticate, getSpecialistAssignments);
router.get('/assignments/token/:token', getAssignmentByAccessToken);
router.delete('/assignments/:id', authenticate, isAdmin, revokeSpecialistAssignment);

// Review comment routes
router.post('/comments', authenticate, createReviewComment);
router.get('/comments/assessment/:assessmentId', authenticate, getAssessmentReviewComments);
router.put('/comments/:id/resolve', authenticate, resolveComment);

// Statistics
router.get('/stats', authenticate, isAdmin, getWorkflowStats);

export default router;
