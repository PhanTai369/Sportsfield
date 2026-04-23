const { 
  apiResponse, 
  constants,
  errorHandler
} = require('../common');
const { authService, userService } = require('../services');

const { asyncHandler } = errorHandler;
const { 
  authSuccessResponse, 
  errorResponse, 
  successResponse 
} = apiResponse;
const { SUCCESS_MESSAGES, HTTP_STATUS } = constants;

// Register a new user
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  try {
    const result = await authService.register({ name, email, password, phone, role });

    // Add verification status to response
    const message = result.emailSent 
      ? SUCCESS_MESSAGES.USER_REGISTERED
      : 'User registered successfully, but verification email could not be sent. Please contact support.';

    return authSuccessResponse(
      res,
      message,
      result.user,
      result.token,
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    console.error('Registration error:', error);
    return errorResponse(
      res, 
      error.message, 
      error.statusCode || HTTP_STATUS.BAD_REQUEST,
      error.errors
    );
  }
});

// Login user
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await authService.login({ email, password });

    return authSuccessResponse(
      res,
      SUCCESS_MESSAGES.LOGIN_SUCCESS,
      result.user,
      result.token,
      HTTP_STATUS.OK
    );
  } catch (error) {
    return errorResponse(
      res, 
      error.message, 
      error.statusCode || HTTP_STATUS.UNAUTHORIZED,
      error.errors
    );
  }
});

// Verify email with token
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  try {
    const result = await authService.verifyEmail(token);
    
    return successResponse(
      res, 
      result.message, 
      result.user, 
      HTTP_STATUS.OK
    );
  } catch (error) {
    return errorResponse(
      res, 
      error.message, 
      error.statusCode || HTTP_STATUS.BAD_REQUEST,
      error.errors
    );
  }
});

// Resend verification email
const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;

  try {
    const result = await authService.resendVerificationEmail(email);
    
    return successResponse(
      res, 
      result.message, 
      null, 
      HTTP_STATUS.OK
    );
  } catch (error) {
    return errorResponse(
      res, 
      error.message, 
      error.statusCode || HTTP_STATUS.BAD_REQUEST,
      error.errors
    );
  }
});

// Request password reset
const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;

  try {
    await userService.requestPasswordReset(email);
    
    // Always return success even if email not found for security reasons
    return successResponse(
      res, 
      'If the email exists, a password reset link will be sent', 
      null, 
      HTTP_STATUS.OK
    );
  } catch (error) {
    // Don't expose if the email doesn't exist
    if (error.statusCode === HTTP_STATUS.NOT_FOUND) {
      return successResponse(
        res, 
        'If the email exists, a password reset link will be sent', 
        null, 
        HTTP_STATUS.OK
      );
    }
    
    return errorResponse(
      res, 
      error.message, 
      error.statusCode || HTTP_STATUS.BAD_REQUEST,
      error.errors
    );
  }
});

// Reset password with token
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const result = await userService.resetPassword(token, newPassword);
    
    return successResponse(
      res, 
      'Password has been reset successfully', 
      null, 
      HTTP_STATUS.OK
    );
  } catch (error) {
    return errorResponse(
      res, 
      error.message, 
      error.statusCode || HTTP_STATUS.BAD_REQUEST,
      error.errors
    );
  }
});

// Google login or registration
const googleAuth = asyncHandler(async (req, res) => {
  const { tokenId, profileObj } = req.body;
  
  // Extra validation
  if (!tokenId || !profileObj) {
    return errorResponse(res, 'Missing required Google auth data', HTTP_STATUS.BAD_REQUEST);
  }
  
  try {
    const result = await authService.googleAuth({ tokenId, profileObj });

    return authSuccessResponse(
      res,
      'Google authentication successful',
      result.user,
      result.token,
      HTTP_STATUS.OK
    );
  } catch (error) {
    console.error('Google auth controller error:', error);
    return errorResponse(
      res, 
      error.message, 
      error.statusCode || HTTP_STATUS.BAD_REQUEST,
      error.errors
    );
  }
});

// Check Google account existence and role
const checkGoogleAccount = asyncHandler(async (req, res) => {
  const { email } = req.body;

  try {
    const user = await authService.findByEmail(email);
    
    if (!user) {
      return errorResponse(res, 'Không tìm thấy người dùng', HTTP_STATUS.NOT_FOUND);
    }

    return successResponse(res, 'User found', {
      email: user.email,
      role: user.role,
      name: user.name,
      profileImage: user.profileImage
    });
  } catch (error) {
    return errorResponse(
      res, 
      error.message, 
      error.statusCode || HTTP_STATUS.BAD_REQUEST,
      error.errors
    );
  }
});

module.exports = {
  register,
  login,
  googleAuth,
  verifyEmail,
  resendVerification,
  requestPasswordReset,
  resetPassword,
  checkGoogleAccount
}; 