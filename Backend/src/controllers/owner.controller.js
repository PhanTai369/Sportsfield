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

// Get owner profile
const getOwnerProfile = asyncHandler(async (req, res) => {
  try {
    // Fetch complete user data from database instead of using req.user
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return errorResponse(res, 'Owner not found', HTTP_STATUS.NOT_FOUND);
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

    return successResponse(res, 'Owner profile fetched successfully', userData, HTTP_STATUS.OK);
  } catch (error) {
    return errorResponse(
      res, 
      error.message, 
      error.statusCode || HTTP_STATUS.BAD_REQUEST,
      error.errors
    );
  }
});

// Update owner profile
const updateOwnerProfile = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      name, email, phone, bio, gender, dateOfBirth, address
    } = req.body;
    
    const updatedUser = await userService.updateCurrentUser(userId, { 
      name, email, phone, bio, gender, dateOfBirth, address
    });

    // Fetch fresh user data after update
    const user = await User.findByPk(userId);
    
    if (!user) {
      return errorResponse(res, 'Owner not found after update', HTTP_STATUS.NOT_FOUND);
    }
    
    // Return the same structure as getOwnerProfile
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

// Upload owner profile image
const uploadOwnerProfileImage = asyncHandler(async (req, res) => {
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

// Change owner password
const changeOwnerPassword = asyncHandler(async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Validate current password
    const user = await User.findByPk(userId);
    if (!user) {
      return errorResponse(res, 'Owner not found', HTTP_STATUS.NOT_FOUND);
    }

    const isPasswordValid = await passwordUtils.comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      return errorResponse(res, 'Current password is incorrect', HTTP_STATUS.BAD_REQUEST);
    }

    // Hash new password and update
    const hashedPassword = await passwordUtils.hashPassword(newPassword);
    await user.update({ password: hashedPassword });

    return successResponse(res, 'Password changed successfully', null, HTTP_STATUS.OK);
  } catch (error) {
    return errorResponse(
      res,
      error.message || 'Failed to change password',
      error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

module.exports = {
  getOwnerProfile,
  updateOwnerProfile,
  uploadOwnerProfileImage,
  changeOwnerPassword
}; 