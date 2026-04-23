const { 
  apiResponse, 
  errorHandler, 
  constants, 
  validationUtils,
  passwordUtils
} = require('../common');
const { userService } = require('../services');
const { User } = require('../models');

const { asyncHandler } = errorHandler;
const { 
  successResponse, 
  errorResponse, 
  notFoundResponse
} = apiResponse;
const { SUCCESS_MESSAGES, HTTP_STATUS } = constants;
const { getPaginationParams, getSortingParams } = validationUtils;

// Get current user profile
const getCurrentUser = asyncHandler(async (req, res) => {
  try {
    // Fetch complete user data from database instead of using req.user
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return errorResponse(res, 'Không tìm thấy người dùng', HTTP_STATUS.NOT_FOUND);
    }

    // Ensure all fields are included in the response
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      profileImage: user.profileImage || '',
      profileImageId: user.profileImageId || '',
      bio: user.bio || '',
      gender: user.gender || '',
      dateOfBirth: user.dateOfBirth || '',
      address: user.address || '',
      role: user.role,
      is_active: user.is_active,
      is_verified: user.is_verified,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    return successResponse(res, 'User profile fetched successfully', userData, HTTP_STATUS.OK);
  } catch (error) {
    return errorResponse(
      res, 
      error.message, 
      error.statusCode || HTTP_STATUS.BAD_REQUEST,
      error.errors
    );
  }
});

// Update current user profile
const updateCurrentUser = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, phone, bio, gender, dateOfBirth, address } = req.body;
    
    const updatedUser = await userService.updateCurrentUser(userId, { 
      name, email, phone, bio, gender, dateOfBirth, address 
    });

    // Fetch fresh user data after update
    const user = await User.findByPk(userId);
    
    if (!user) {
      return errorResponse(res, 'Không tìm thấy người dùng sau khi cập nhật', HTTP_STATUS.NOT_FOUND);
    }
    
    // Return the same structure as getCurrentUser
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      profileImage: user.profileImage || '',
      profileImageId: user.profileImageId || '',
      bio: user.bio || '',
      gender: user.gender || '',
      dateOfBirth: user.dateOfBirth || '',
      address: user.address || '',
      role: user.role,
      is_active: user.is_active,
      is_verified: user.is_verified,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    return successResponse(res, SUCCESS_MESSAGES.USER_UPDATED, userData, HTTP_STATUS.OK);
  } catch (error) {
    return errorResponse(
      res, 
      error.message, 
      error.statusCode || HTTP_STATUS.BAD_REQUEST,
      error.errors
    );
  }
});

// Upload profile image
const uploadProfileImage = asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'No file uploaded', HTTP_STATUS.BAD_REQUEST);
    }

    // Check file size again as an extra precaution
    if (req.file.size > 5 * 1024 * 1024) {
      return errorResponse(res, 'File size too large. Maximum size is 5MB', HTTP_STATUS.BAD_REQUEST);
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return errorResponse(res, 'Invalid file type. Only .jpg, .jpeg, .png and .gif allowed', HTTP_STATUS.BAD_REQUEST);
    }

    try {
      const result = await userService.uploadProfileImage(req.user.id, req.file.buffer);
      return successResponse(res, 'Profile image uploaded successfully', result, HTTP_STATUS.OK);
    } catch (uploadError) {
      return errorResponse(
        res,
        'Failed to upload image. Please try again.',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  } catch (error) {
    return errorResponse(
      res,
      error.message || 'An error occurred while processing your request',
      error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

// Delete profile image
const deleteProfileImage = asyncHandler(async (req, res) => {
  try {
    const result = await userService.deleteProfileImage(req.user.id);
    
    return successResponse(res, 'Profile image deleted successfully', result, HTTP_STATUS.OK);
  } catch (error) {
    return errorResponse(
      res, 
      error.message, 
      error.statusCode || HTTP_STATUS.BAD_REQUEST,
      error.errors
    );
  }
});

// Change password
const changePassword = asyncHandler(async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    // First verify the current password
    const user = await User.findByPk(userId);
    if (!user) {
      return errorResponse(res, 'Không tìm thấy người dùng', HTTP_STATUS.NOT_FOUND);
    }

    // Compare password using passwordUtils directly
    const isPasswordValid = await passwordUtils.comparePassword(currentPassword, user.password_hash);
    
    if (!isPasswordValid) {
      return errorResponse(res, 'Current password is incorrect', HTTP_STATUS.UNAUTHORIZED);
    }
    
    // Update with new password
    await userService.updateCurrentUser(userId, { password: newPassword });
    
    return successResponse(res, 'Password changed successfully', null, HTTP_STATUS.OK);
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
  try {
    const { email } = req.body;
    
    const result = await userService.requestPasswordReset(email);
    
    return successResponse(res, 'Password reset email sent', null, HTTP_STATUS.OK);
  } catch (error) {
    // Always return success even if email not found for security reasons
    if (error.statusCode === HTTP_STATUS.NOT_FOUND) {
      return successResponse(res, 'If the email exists, a password reset link will be sent', null, HTTP_STATUS.OK);
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
  try {
    const { token, newPassword } = req.body;
    
    const result = await userService.resetPassword(token, newPassword);
    
    return successResponse(res, 'Password has been reset successfully', null, HTTP_STATUS.OK);
  } catch (error) {
    return errorResponse(
      res, 
      error.message, 
      error.statusCode || HTTP_STATUS.BAD_REQUEST,
      error.errors
    );
  }
});

// Get all users (admin only)
const getAllUsers = asyncHandler(async (req, res) => {
  try {
    const { role } = req.query;
    
    // Pagination parameters
    const pagination = getPaginationParams(req.query);
    
    // Sorting parameters
    const sorting = getSortingParams(req.query, 'created_at');
    
    const result = await userService.getAllUsers({ role }, pagination, sorting);
    
    return successResponse(res, 'Users fetched successfully', result, HTTP_STATUS.OK);
  } catch (error) {
    return errorResponse(
      res, 
      error.message, 
      error.statusCode || HTTP_STATUS.BAD_REQUEST,
      error.errors
    );
  }
});

// Get user by ID (admin only)
const getUserById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await userService.getUserById(id);
    
    return successResponse(res, 'User fetched successfully', user, HTTP_STATUS.OK);
  } catch (error) {
    if (error.statusCode === HTTP_STATUS.NOT_FOUND) {
      return notFoundResponse(res, error.message);
    }
    return errorResponse(
      res, 
      error.message, 
      error.statusCode || HTTP_STATUS.BAD_REQUEST,
      error.errors
    );
  }
});

// Update user by ID (admin only)
const updateUserById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, phone, role, is_active } = req.body;
    
    const updatedUser = await userService.updateUserById(id, { 
      name, email, password, phone, role, is_active 
    });
    
    return successResponse(res, SUCCESS_MESSAGES.USER_UPDATED, {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      is_active: updatedUser.is_active
    }, HTTP_STATUS.OK);
  } catch (error) {
    if (error.statusCode === HTTP_STATUS.NOT_FOUND) {
      return notFoundResponse(res, error.message);
    }
    return errorResponse(
      res, 
      error.message, 
      error.statusCode || HTTP_STATUS.BAD_REQUEST,
      error.errors
    );
  }
});

// Delete user (admin only)
const deleteUser = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    await userService.deleteUser(id);
    
    return successResponse(res, SUCCESS_MESSAGES.USER_DELETED, null, HTTP_STATUS.OK);
  } catch (error) {
    if (error.statusCode === HTTP_STATUS.NOT_FOUND) {
      return notFoundResponse(res, error.message);
    }
    return errorResponse(
      res, 
      error.message, 
      error.statusCode || HTTP_STATUS.BAD_REQUEST,
      error.errors
    );
  }
});

module.exports = {
  getCurrentUser,
  updateCurrentUser,
  uploadProfileImage,
  deleteProfileImage,
  changePassword,
  requestPasswordReset,
  resetPassword,
  getAllUsers,
  getUserById,
  updateUserById,
  deleteUser
}; 