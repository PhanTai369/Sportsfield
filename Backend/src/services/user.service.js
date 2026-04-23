const { User } = require('../models');
const { 
  errorHandler, 
  constants, 
  validationUtils, 
  passwordUtils 
} = require('../common');
const { uploadImage, deleteImage } = require('../config/s3Config');
const { sendPasswordResetEmail } = require('../utils/emailService');
const crypto = require('crypto');
const { ERROR_MESSAGES, HTTP_STATUS } = constants;
const { 
  AppError, 
  NotFoundError, 
  BadRequestError,
  UnauthorizedError,
  ForbiddenError
} = errorHandler;

class UserService {
  // Repository methods integrated directly into service
  async findById(id) {
    return await User.findByPk(id, {
      attributes: { exclude: ['password_hash'] }
    });
  }

  async findByEmail(email) {
    return await User.findOne({ where: { email } });
  }

  async findAll(whereClause, limit, offset, order) {
    const users = await User.findAll({
      where: whereClause,
      attributes: { exclude: ['password_hash'] },
      order,
      limit,
      offset
    });
    
    const total = await User.count({ where: whereClause });
    
    return { users, total };
  }

  async create(userData) {
    return await User.create(userData);
  }

  async update(user, updateData) {
    return await user.update(updateData);
  }

  async count(whereClause) {
    return await User.count({ where: whereClause });
  }

  // Service methods
  async getCurrentUser(userId) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }
    return user;
  }
  
  async updateCurrentUser(userId, updateData) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }
    
    // Validate email if updating
    if (updateData.email) {
      if (!validationUtils.isValidEmail(updateData.email)) {
        throw new BadRequestError("Invalid email format");
      }
      
      if (updateData.email !== user.email) {
        const existingUser = await this.findByEmail(updateData.email);
        if (existingUser) {
          throw new BadRequestError(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
        }
      }
    }
    
    // Validate password if updating
    if (updateData.password && !validationUtils.isStrongPassword(updateData.password)) {
      throw new BadRequestError("Password must be at least 8 characters and include uppercase, lowercase, and numbers");
    }
    
    // Validate phone if updating
    if (updateData.phone && !validationUtils.isValidVietnamesePhone(updateData.phone)) {
      throw new BadRequestError("Invalid Vietnamese phone number format");
    }
    
    // Create update object
    const userUpdate = {
      name: updateData.name || user.name,
      email: updateData.email || user.email,
      phone: updateData.phone || user.phone,
      bio: updateData.bio || user.bio,
      gender: updateData.gender || user.gender,
      dateOfBirth: updateData.dateOfBirth || user.dateOfBirth,
      address: updateData.address || user.address
    };
    
    // Only update password if provided
    if (updateData.password) {
      userUpdate.password_hash = updateData.password;
    }
    
    // Update the user
    const updatedUser = await this.update(user, userUpdate);
    
    return updatedUser;
  }
  
  // Upload profile image
  async uploadProfileImage(userId, fileBuffer) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }
    
    try {
      // If user already has a profile image, delete it first
      if (user.profileImageId) {
        await deleteImage(user.profileImageId);
      }
      
      // Upload new image to S3
      const result = await uploadImage(fileBuffer, {
        folder: 'profiles',
        public_id: `user_${userId}_${Date.now()}`
      });
      
      // Update user with new image URL and public ID
      await this.update(user, {
        profileImage: result.secure_url,
        profileImageId: result.public_id
      });
      
      return {
        profileImage: result.secure_url,
        profileImageId: result.public_id
      };
    } catch (error) {
      console.error('Error uploading profile image:', error);
      throw new AppError('Failed to upload profile image', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }
  
  // Delete profile image
  async deleteProfileImage(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }
    
    if (!user.profileImageId) {
      throw new BadRequestError('User does not have a profile image');
    }
    
    try {
      // Delete image from S3
      await deleteImage(user.profileImageId);
      
      // Update user to remove image references
      await this.update(user, {
        profileImage: null,
        profileImageId: null
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting profile image:', error);
      throw new AppError('Failed to delete profile image', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }
  
  // Request password reset
  async requestPasswordReset(email) {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Update user with reset token
    await this.update(user, {
      reset_password_token: resetToken
    });
    
    // Generate reset link
    const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password/${resetToken}`;
    
    try {
      // Send password reset email
      await sendPasswordResetEmail(user.email, user.name, resetLink);
      return { success: true, message: 'Password reset email sent' };
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new AppError('Failed to send password reset email', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }
  
  // Reset password with token
  async resetPassword(token, newPassword) {
    if (!validationUtils.isStrongPassword(newPassword)) {
      throw new BadRequestError("Password must be at least 8 characters and include uppercase, lowercase, and numbers");
    }
    
    // Find user with valid reset token
    const user = await User.findOne({
      where: {
        reset_password_token: token
      }
    });
    
    if (!user || !user.reset_password_token) {
      throw new BadRequestError('Invalid or expired password reset token');
    }
    
    // Update user with new password and clear reset token
    await this.update(user, {
      password_hash: newPassword,
      reset_password_token: null
    });
    
    return { success: true, message: 'Password has been reset successfully' };
  }
  
  async getAllUsers(filters, pagination, sorting) {
    const whereClause = {};
    
    if (filters.role) {
      whereClause.role = filters.role;
    }
    
    const { limit, offset } = pagination;
    const order = sorting;
    
    const { users, total } = await this.findAll(whereClause, limit, offset, order);
    
    return {
      total,
      users,
      page: Math.floor(offset / limit) + 1,
      limit
    };
  }
  
  async getUserById(userId) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }
    return user;
  }
  
  async updateUserById(userId, updateData) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }
    
    // Validate email if updating
    if (updateData.email) {
      if (!validationUtils.isValidEmail(updateData.email)) {
        throw new BadRequestError("Invalid email format");
      }
      
      if (updateData.email !== user.email) {
        const existingUser = await this.findByEmail(updateData.email);
        if (existingUser) {
          throw new BadRequestError(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
        }
      }
    }
    
    // Validate password if updating
    if (updateData.password && !validationUtils.isStrongPassword(updateData.password)) {
      throw new BadRequestError("Password must be at least 8 characters and include uppercase, lowercase, and numbers");
    }
    
    // Validate phone if updating
    if (updateData.phone && !validationUtils.isValidVietnamesePhone(updateData.phone)) {
      throw new BadRequestError("Invalid Vietnamese phone number format");
    }
    
    return await this.update(user, {
      name: updateData.name || user.name,
      email: updateData.email || user.email,
      password_hash: updateData.password || user.password_hash,
      phone: updateData.phone || user.phone,
      role: updateData.role || user.role,
      is_active: updateData.is_active !== undefined ? updateData.is_active : user.is_active
    });
  }
  
  async deleteUser(userId) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }
    
    return await this.update(user, { is_active: false });
  }
}

module.exports = new UserService(); 
