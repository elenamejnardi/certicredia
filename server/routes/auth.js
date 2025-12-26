import express from 'express';
import {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getAllUsers
} from '../controllers/authController.js';
import { authenticate, isAdmin } from '../middleware/auth.js';
import {
  registerValidationRules,
  loginValidationRules,
  profileUpdateValidationRules,
  changePasswordValidationRules,
  forgotPasswordValidationRules,
  resetPasswordValidationRules,
  validate
} from '../middleware/authValidation.js';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', registerValidationRules, validate, register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', loginValidationRules, validate, login);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post('/logout', logout);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticate, getProfile);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, profileUpdateValidationRules, validate, updateProfile);

/**
 * @route   PUT /api/auth/password
 * @desc    Change password
 * @access  Private
 */
router.put('/password', authenticate, changePasswordValidationRules, validate, changePassword);

/**
 * @route   GET /api/auth/verify/:token
 * @desc    Verify email
 * @access  Private
 */
router.get('/verify/:token', authenticate, verifyEmail);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset (sends email with code)
 * @access  Public
 */
router.post('/forgot-password', forgotPasswordValidationRules, validate, forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', resetPasswordValidationRules, validate, resetPassword);

/**
 * @route   GET /api/auth/users
 * @desc    Get all users (Admin only)
 * @access  Private (Admin)
 */
router.get('/users', authenticate, isAdmin, getAllUsers);

export default router;
