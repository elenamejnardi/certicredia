import express from 'express';
import { authenticate } from '../../../server/middleware/auth.js';
import { requireActiveSubscription } from '../../../server/middleware/checkSubscription.js';
import {
  getAllOrganizationsWithAssessments,
  getOrganizationAssessment,
  getAllAssessments,
  createOrganizationAssessment,
  updateOrganizationAssessment,
  deleteOrganizationAssessment,
  restoreOrganizationAssessment,
  permanentlyDeleteAssessment,
  getTrash,
  getStatistics
} from '../controllers/auditingController.js';

const router = express.Router();

/**
 * CPF Auditing Routes
 * Base path: /api/auditing
 */

/**
 * @route   GET /api/auditing/statistics
 * @desc    Get assessment statistics
 * @access  Private
 */
router.get('/statistics', authenticate, getStatistics);

/**
 * @route   GET /api/auditing/trash
 * @desc    Get deleted assessments
 * @access  Private
 */
router.get('/trash', authenticate, getTrash);

/**
 * @route   GET /api/auditing/assessments
 * @desc    Get all assessments
 * @access  Private
 */
router.get('/assessments', authenticate, getAllAssessments);

/**
 * @route   GET /api/auditing/organizations
 * @desc    Get all organizations with their assessments
 * @access  Private
 */
router.get('/organizations', authenticate, getAllOrganizationsWithAssessments);

/**
 * @route   GET /api/auditing/organizations/:organizationId
 * @desc    Get assessment for specific organization
 * @access  Private (requires active subscription)
 */
router.get('/organizations/:organizationId', authenticate, requireActiveSubscription, getOrganizationAssessment);

/**
 * @route   POST /api/auditing/organizations/:organizationId
 * @desc    Create assessment for organization
 * @access  Private (requires active subscription)
 */
router.post('/organizations/:organizationId', authenticate, requireActiveSubscription, createOrganizationAssessment);

/**
 * @route   PUT /api/auditing/organizations/:organizationId
 * @desc    Update assessment for organization
 * @access  Private (requires active subscription)
 */
router.put('/organizations/:organizationId', authenticate, requireActiveSubscription, updateOrganizationAssessment);

/**
 * @route   DELETE /api/auditing/organizations/:organizationId
 * @desc    Soft delete assessment (move to trash)
 * @access  Private
 */
router.delete('/organizations/:organizationId', authenticate, deleteOrganizationAssessment);

/**
 * @route   POST /api/auditing/organizations/:organizationId/restore
 * @desc    Restore assessment from trash
 * @access  Private
 */
router.post('/organizations/:organizationId/restore', authenticate, restoreOrganizationAssessment);

/**
 * @route   DELETE /api/auditing/organizations/:organizationId/permanent
 * @desc    Permanently delete assessment
 * @access  Private
 */
router.delete('/organizations/:organizationId/permanent', authenticate, permanentlyDeleteAssessment);

export default router;
