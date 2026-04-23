/**
 * Lớp lỗi tùy chỉnh cho ứng dụng
 * @extends Error
 */
class AppError extends Error {
  /**
   * @param {string} message - Thông báo lỗi
   * @param {number} statusCode - Mã trạng thái HTTP
   * @param {Object} errors - Chi tiết lỗi (tùy chọn)
   */
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true; // Dùng để phân biệt lỗi xử lý với lỗi lập trình

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Lớp lỗi xác thực (401)
 * @extends AppError
 */
class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access', errors = null) {
    super(message, 401, errors);
  }
}

/**
 * Lớp lỗi cấm truy cập (403)
 * @extends AppError
 */
class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden', errors = null) {
    super(message, 403, errors);
  }
}

/**
 * Lớp lỗi không tìm thấy (404)
 * @extends AppError
 */
class NotFoundError extends AppError {
  constructor(message = 'Resource not found', errors = null) {
    super(message, 404, errors);
  }
}

/**
 * Lớp lỗi dữ liệu không hợp lệ (400)
 * @extends AppError
 */
class BadRequestError extends AppError {
  constructor(message = 'Bad request', errors = null) {
    super(message, 400, errors);
  }
}

/**
 * Lớp lỗi xung đột dữ liệu (409)
 * @extends AppError
 */
class ConflictError extends AppError {
  constructor(message = 'Conflict', errors = null) {
    super(message, 409, errors);
  }
}

/**
 * Lớp lỗi máy chủ (500)
 * @extends AppError
 */
class ServerError extends AppError {
  constructor(message = 'Internal server error', errors = null) {
    super(message, 500, errors);
  }
}

/**
 * Middleware xử lý lỗi toàn cục
 * @param {Error} err - Đối tượng lỗi
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const globalErrorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Something went wrong';
  
  // Log lỗi trong môi trường phát triển
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  // Gửi phản hồi phù hợp
  return res.status(statusCode).json({
    success: false,
    message,
    errors: err.errors || null,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

/**
 * Phải gọi asyncHandler bên trong mỗi route/middleware async để bắt lỗi
 * @param {Function} fn - Hàm async
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  AppError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
  ConflictError,
  ServerError,
  globalErrorHandler,
  asyncHandler
}; 