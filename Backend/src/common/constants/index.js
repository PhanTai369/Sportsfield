/**
 * Hằng số cho vai trò người dùng
 */
const USER_ROLES = {
  CUSTOMER: 'customer',
  OWNER: 'owner',
  ADMIN: 'admin',
};

/**
 * Hằng số cho mã trạng thái HTTP
 */
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

/**
 * Hằng số cho các thông báo lỗi
 */
const ERROR_MESSAGES = {
  // Auth errors
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không hợp lệ.',
  UNAUTHORIZED: 'Truy cập không được phép.',
  FORBIDDEN: 'Truy cập bị cấm.',
  EMAIL_ALREADY_EXISTS: 'Email already in use',
  USER_NOT_FOUND: 'Không tìm thấy người dùng',
  ACCOUNT_INACTIVE: 'Tài khoản chưa được kích hoạt.',
  INVALID_TOKEN: 'Mã xác thực không hợp lệ',
  TOKEN_EXPIRED: 'Mã xác thực đã hết hạn.',
  
  // Validation errors
  VALIDATION_ERROR: 'Validation failed',
  
  // Server errors
  SERVER_ERROR: 'Internal server error',
  DB_ERROR: 'Database error',
};

/**
 * Hằng số cho các thông báo thành công
 */
const SUCCESS_MESSAGES = {
  USER_REGISTERED: 'Đăng ký người dùng thành công.',
  USER_UPDATED: 'Cập nhật người dùng thành công.',
  USER_DELETED: 'Xóa người dùng thành công.',
  LOGIN_SUCCESS: 'Đăng nhập thành công.',
};

/**
 * Hằng số cho cấu hình
 */
const CONFIG = {
  JWT_EXPIRATION: '1d',
  PASSWORD_SALT_ROUNDS: 10,
};

module.exports = {
  USER_ROLES,
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  CONFIG,
}; 