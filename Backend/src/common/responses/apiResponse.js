/**
 * Các hàm trả về response chuẩn cho API
 */
const { HTTP_STATUS } = require('../constants');

/**
 * Trả về response thành công
 * @param {Object} res - Express response object
 * @param {string} message - Thông báo thành công
 * @param {any} data - Dữ liệu trả về
 * @param {number} statusCode - Mã trạng thái HTTP (mặc định là 200)
 */
const successResponse = (res, message, data = null, statusCode = HTTP_STATUS.OK) => {
  const response = {
    success: true,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Trả về response lỗi
 * @param {Object} res - Express response object
 * @param {string} message - Thông báo lỗi
 * @param {number} statusCode - Mã trạng thái HTTP (mặc định là 400)
 * @param {Object} errors - Chi tiết lỗi (nếu có)
 */
const errorResponse = (res, message, statusCode = HTTP_STATUS.BAD_REQUEST, errors = null) => {
  const response = {
    success: false,
    message,
  };

  if (errors !== null) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Trả về response khi xác thực thành công (đăng nhập, đăng ký)
 * @param {Object} res - Express response object
 * @param {string} message - Thông báo
 * @param {Object} userData - Thông tin người dùng
 * @param {string} token - Token xác thực
 * @param {number} statusCode - Mã trạng thái HTTP (mặc định là 200)
 */
const authSuccessResponse = (res, message, userData, token, statusCode = HTTP_STATUS.OK) => {
  return res.status(statusCode).json({
    success: true,
    message,
    user: userData,
    accessToken: token,
  });
};

/**
 * Trả về response lỗi 401 khi không xác thực được
 * @param {Object} res - Express response object
 * @param {string} message - Thông báo lỗi
 */
const unauthorizedResponse = (res, message = 'Unauthorized access') => {
  return errorResponse(res, message, HTTP_STATUS.UNAUTHORIZED);
};

/**
 * Trả về response lỗi 403 khi không có quyền truy cập
 * @param {Object} res - Express response object
 * @param {string} message - Thông báo lỗi
 */
const forbiddenResponse = (res, message = 'Access forbidden') => {
  return errorResponse(res, message, HTTP_STATUS.FORBIDDEN);
};

/**
 * Trả về response lỗi 404 khi không tìm thấy tài nguyên
 * @param {Object} res - Express response object
 * @param {string} message - Thông báo lỗi
 * @param {number} statusCode - Mã trạng thái HTTP (mặc định là 404)
 */
const notFoundResponse = (res, message = 'Resource not found', statusCode = HTTP_STATUS.NOT_FOUND) => {
  return errorResponse(res, message, statusCode);
};

/**
 * Trả về response lỗi 500 khi có lỗi server
 * @param {Object} res - Express response object
 * @param {string} message - Thông báo lỗi
 * @param {Error} error - Đối tượng lỗi
 */
const serverErrorResponse = (res, message = 'Internal server error', error = null) => {
  console.error('Server Error:', error);
  const errorDetails = process.env.NODE_ENV === 'development' ? { stack: error?.stack } : null;
  return errorResponse(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR, errorDetails);
};

module.exports = {
  successResponse,
  errorResponse,
  authSuccessResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
}; 