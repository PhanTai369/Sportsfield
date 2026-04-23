const express = require('express');
const { 
  register, 
  login, 
  googleAuth, 
  verifyEmail, 
  resendVerification,
  requestPasswordReset,
  resetPassword,
  checkGoogleAccount
} = require('../controllers/auth.controller');
const { validateRequest, schemas } = require('../middlewares/validation.middleware');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { authService } = require('../services');

const router = express.Router();

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', validateRequest(schemas.register), register);

/**
 * @route POST /api/auth/login
 * @desc Login a user
 * @access Public
 */
router.post('/login', validateRequest(schemas.login), login);

/**
 * @route GET /api/auth/verify/:token
 * @desc Verify user email with token
 * @access Public
 */
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const result = await authService.verifyEmail(token);
    
    // Redirect to frontend verification success page
    return res.redirect(`${process.env.FRONTEND_URL}/verification-success?email=${result.user.email}`);
  } catch (error) {
    // Redirect to frontend verification failure page
    return res.redirect(`${process.env.FRONTEND_URL}/verification-failed?error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * @route POST /api/auth/resend-verification
 * @desc Resend verification email
 * @access Public
 */
router.post('/resend-verification', validateRequest(schemas.resendVerification), resendVerification);

/**
 * @route POST /api/auth/forgot-password
 * @desc Request password reset email
 * @access Public
 */
router.post('/forgot-password', validateRequest(schemas.forgotPassword), requestPasswordReset);

/**
 * @route POST /api/auth/reset-password
 * @desc Reset password with token
 * @access Public
 */
router.post('/reset-password', validateRequest(schemas.resetPassword), resetPassword);

/**
 * @route POST /api/auth/google
 * @desc Google authentication
 * @access Public
 */
router.post('/google', validateRequest(schemas.googleAuth), googleAuth);

/**
 * @route POST /api/auth/check-google-account
 * @desc Check if Google account exists and get role
 * @access Public
 */
router.post('/check-google-account', validateRequest(schemas.checkGoogleAccount), checkGoogleAccount);

/**
 * @route GET /api/auth/me
 * @desc Get current user info
 * @access Private
 */
router.get('/me', authMiddleware, (req, res) => {
  // User is attached to req by authMiddleware
  return res.status(200).json({
    success: true,
    user: req.user
  });
});

/**
 * @route POST /api/auth/logout
 * @desc Logout user (just for API completeness)
 * @access Public
 */
router.post('/logout', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router; 