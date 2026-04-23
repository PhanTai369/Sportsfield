const { User } = require('../models');
const { 
  jwtUtils, 
  passwordUtils, 
  constants,
  errorHandler,
  validationUtils
} = require('../common');
const { sendRegistrationEmail } = require('../utils/emailService');
const crypto = require('crypto');
const { Op } = require('sequelize');

const { USER_ROLES, CONFIG, ERROR_MESSAGES } = constants;
const { 
  AppError, 
  NotFoundError, 
  BadRequestError,
  UnauthorizedError,
  ForbiddenError
} = errorHandler;

class AuthService {
  // Repository methods integrated directly into service
  async findByEmail(email, shouldThrow = false) {
    const user = await User.findOne({ where: { email } });
    
    if (!user && shouldThrow) {
      throw new NotFoundError('Không tìm thấy người dùng');
    }
    
    return user;
  }

  async findByVerificationToken(token) {
    return await User.findOne({ where: { verification_token: token } });
  }

  async findByGoogleIdOrEmail(googleId, email) {
    return await User.findOne({ 
      where: { 
        [Op.or]: [
          { googleId },
          { email }
        ]
      } 
    });
  }

  async createUser(userData) {
    return await User.create(userData);
  }

  async updateUser(user, updateData) {
    // Handle if user is an ID or an object
    if (typeof user === 'string' || typeof user === 'number') {
      const userObj = await User.findByPk(user);
      if (!userObj) {
        throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
      }
      return await userObj.update(updateData);
    }
    // If user is already an object
    return await user.update(updateData);
  }

  // Generate verification token
  generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Register a new user
  async register(userData) {
    const { name, email, password, phone, role } = userData;

    if (!password) {
      throw new BadRequestError("Password is required");
    }

    // Validate email format
    if (!validationUtils.isValidEmail(email)) {
      throw new BadRequestError("Invalid email format");
    }

    // Validate password strength
    if (!validationUtils.isStrongPassword(password)) {
      throw new BadRequestError("Password must be at least 8 characters and include uppercase, lowercase, and numbers");
    }

    // Validate phone number if provided
    if (phone && !validationUtils.isValidVietnamesePhone(phone)) {
      throw new BadRequestError("Invalid Vietnamese phone number format");
    }

    // Check if email already exists
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new BadRequestError(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
    }

    // Generate verification token
    const verificationToken = this.generateVerificationToken();
    
    // Create new user with verification token and is_verified=false
    const user = await this.createUser({
      name,
      email,
      password_hash: password, // Will be hashed by Sequelize hooks
      phone,
      role: role || USER_ROLES.CUSTOMER,
      verification_token: verificationToken,
      is_verified: false,
      is_active: true
    });

    // Generate verification link
    const verificationLink = `${process.env.BACKEND_URL || 'http://localhost:5001'}/api/auth/verify/${verificationToken}`;
    
    // Send verification email - handle errors without failing registration
    try {
      await sendRegistrationEmail(email, name, verificationLink);
      console.log(`Verification email sent to ${email}`);
    } catch (error) {
      console.error('Failed to send verification email:', error);
    }

    // Return user info without token - user must verify email before getting token
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified
      },
      message: 'Registration successful. Please check your email to verify your account before logging in.',
      emailSent: true
    };
  }

  // Login user
  async login(credentials) {
    const { email, password } = credentials;

    // Validate email format
    if (!validationUtils.isValidEmail(email)) {
      throw new BadRequestError("Invalid email format");
    }

    // Find user by email - should throw error if not found during login
    const user = await this.findByEmail(email, true);

    // Check if account is verified
    if (!user.is_verified) {
      throw new ForbiddenError('Vui lòng xác thực email trước khi đăng nhập');
    }

    // Check if account is active
    if (!user.is_active) {
      throw new ForbiddenError(ERROR_MESSAGES.ACCOUNT_INACTIVE);
    }

    // Validate password
    const isPasswordValid = await passwordUtils.comparePassword(password, user.password_hash);
    
    if (!isPasswordValid) {
      throw new UnauthorizedError(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    // Generate token
    const token = jwtUtils.generateToken({ id: user.id }, CONFIG.JWT_EXPIRATION);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified
      },
      token
    };
  }

  // Verify email with token
  async verifyEmail(token) {
    // Find user by verification token
    const user = await this.findByVerificationToken(token);
    
    if (!user) {
      throw new BadRequestError('Invalid or expired verification token');
    }
    
    // Update user as verified and active
    user.is_verified = true;
    user.is_active = true;
    user.verification_token = null; // Clear the verification token
    
    await user.save();
    
    return {
      message: 'Email verified successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    };
  }

  // Resend verification email
  async resendVerificationEmail(email) {
    // Validate email format
    if (!validationUtils.isValidEmail(email)) {
      throw new BadRequestError("Invalid email format");
    }
    
    // Find user by email
    const user = await this.findByEmail(email);
    
    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }
    
    if (user.is_verified) {
      throw new BadRequestError('User is already verified');
    }
    
    // Generate new verification token
    const verificationToken = this.generateVerificationToken();
    user.verification_token = verificationToken;
    await user.save();
    
    // Generate verification link
    const verificationLink = `${process.env.BACKEND_URL}/api/auth/verify/${verificationToken}`;
    
    // Send verification email - handle errors
    try {
      await sendRegistrationEmail(user.email, user.name, verificationLink);
      return {
        message: 'Verification email resent successfully'
      };
    } catch (error) {
      console.error('Failed to resend verification email:', error);
      throw new AppError('Failed to send verification email. Please try again later.', 500);
    }
  }

  // Google login or registration
  async googleAuth(googleData) {
    try {
      const { profileObj, tokenId } = googleData;
      
      if (!profileObj || !profileObj.email) {
        throw new BadRequestError('Invalid Google profile data');
      }

      // Validate email format
      if (!validationUtils.isValidEmail(profileObj.email)) {
        throw new BadRequestError("Invalid email format");
      }

      // Log the inputs for debugging
      console.log('Google auth input data:', JSON.stringify({
        email: profileObj.email,
        name: profileObj.name,
        googleId: profileObj.googleId,
        role: profileObj.role
      }, null, 2));

      const { email, name, googleId } = profileObj;
      
      // Validate role value for NEW users only
      const requestedRole = (profileObj.role === USER_ROLES.OWNER || profileObj.role === USER_ROLES.CUSTOMER)
        ? profileObj.role 
        : USER_ROLES.CUSTOMER;
      
      // Check if user exists by googleId or email
      let user = await this.findByGoogleIdOrEmail(googleId, email);
      
      if (user) {
        // User already exists - KEEP EXISTING ROLE
        console.log('User already exists with role:', user.role);
        
        // Only update googleId if needed, do NOT change role
        if (!user.googleId && googleId) {
          user = await this.updateUser(user.id, { googleId });
        }

        // If the user registered with Google but hasn't been verified yet
        if (!user.is_verified) {
          // Mark as verified since Google authentication is trusted
          user.is_verified = true;
          user.is_active = true;
          await user.save();
        }
      } else {
        // Create new user with requested role
        console.log('Creating new user with role:', requestedRole);
        const randomPassword = passwordUtils.generateRandomPassword();
        
        // For Google auth users, automatically verify them
        user = await this.createUser({
          name,
          email,
          googleId,
          password_hash: randomPassword, // Will be hashed by Sequelize hooks
          role: requestedRole,
          is_verified: true, // Automatically verify Google users
          is_active: true
        });
      }
      
      // Check if account is active
      if (!user.is_active) {
        throw new ForbiddenError(ERROR_MESSAGES.ACCOUNT_INACTIVE);
      }
      
      // Generate token
      const token = jwtUtils.generateToken({ id: user.id }, CONFIG.JWT_EXPIRATION);
      
      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          is_verified: user.is_verified
        },
        token
      };
    } catch (error) {
      console.error('Google auth error:', error);
      throw error;
    }
  }
}

module.exports = new AuthService(); 