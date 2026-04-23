const { User } = require('../models');
const { jwtUtils, apiResponse, errorHandler, constants } = require('../common');
const { verifyToken, extractTokenFromHeader } = jwtUtils;
const { unauthorizedResponse, forbiddenResponse } = apiResponse;
const { asyncHandler } = errorHandler;
const { USER_ROLES, ERROR_MESSAGES } = constants;

const authMiddleware = asyncHandler(async (req, res, next) => {
  // Lấy token từ header
  const token = extractTokenFromHeader(req);
  
  if (!token) {
    return unauthorizedResponse(res, ERROR_MESSAGES.INVALID_TOKEN);
  }

  try {
    // Xác thực token
    const decoded = verifyToken(token);
    
    // Tìm user trong database
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password_hash'] } // Không trả về mật khẩu
    });
    
    if (!user) {
      return unauthorizedResponse(res, ERROR_MESSAGES.USER_NOT_FOUND);
    }
    
    if (!user.is_active) {
      return forbiddenResponse(res, ERROR_MESSAGES.ACCOUNT_INACTIVE);
    }
    
    // Gán user vào request để sử dụng ở các middleware tiếp theo
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      is_active: user.is_active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      // Thêm các trường liên quan đến gói dịch vụ
      package_type: user.package_type,
      package_purchase_date: user.package_purchase_date,
      package_expire_date: user.package_expire_date,
      business_license_image: user.business_license_image,
      identity_card_image: user.identity_card_image,
      identity_card_back_image: user.identity_card_back_image
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return unauthorizedResponse(res, error.message);
  }
});

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === USER_ROLES.ADMIN) {
    next();
  } else {
    return forbiddenResponse(res, ERROR_MESSAGES.FORBIDDEN);
  }
};

const isOwner = (req, res, next) => {
  if (req.user && req.user.role === USER_ROLES.OWNER) {
    next();
  } else {
    return forbiddenResponse(res, ERROR_MESSAGES.FORBIDDEN);
  }
};

const isCustomer = (req, res, next) => {
  if (req.user && req.user.role === USER_ROLES.CUSTOMER) {
    next();
  } else {
    return forbiddenResponse(res, ERROR_MESSAGES.FORBIDDEN);
  }
};

const isOwnerOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === USER_ROLES.OWNER || req.user.role === USER_ROLES.ADMIN)) {
    next();
  } else {
    return forbiddenResponse(res, ERROR_MESSAGES.FORBIDDEN);
  }
};

// Optional auth middleware - doesn't require authentication but adds user info if available
const optionalAuthMiddleware = asyncHandler(async (req, res, next) => {
  const token = extractTokenFromHeader(req);
  
  if (!token) {
    // No token provided, continue without user info
    req.user = null;
    return next();
  }

  try {
    const decoded = verifyToken(token);
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password_hash'] }
    });
    
    if (user && user.is_active) {
      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        is_active: user.is_active,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // Thêm các trường liên quan đến gói dịch vụ
        package_type: user.package_type,
        package_purchase_date: user.package_purchase_date,
        business_license_image: user.business_license_image,
        identity_card_image: user.identity_card_image,
        identity_card_back_image: user.identity_card_back_image
      };
    } else {
      req.user = null;
    }
    
    next();
  } catch (error) {
    // Token invalid, continue without user info
    req.user = null;
    next();
  }
});

module.exports = {
  authMiddleware,
  isAdmin,
  isCustomer,
  isOwner,
  optionalAuthMiddleware,
  isOwnerOrAdmin
};