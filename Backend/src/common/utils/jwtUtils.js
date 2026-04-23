const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('./errorHandler');
const { CONFIG, ERROR_MESSAGES } = require('../constants');

/**
 * Tạo JWT token
 * @param {Object} payload - Dữ liệu để mã hóa vào token
 * @param {string} expiresIn - Thời gian hết hạn (mặc định: CONFIG.JWT_EXPIRATION)
 * @returns {string} JWT token
 */
const generateToken = (payload, expiresIn = CONFIG.JWT_EXPIRATION) => {
  const secret = process.env.JWT_SECRET || 'football_booking_secret_key';
  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Xác thực JWT token
 * @param {string} token - JWT token cần xác thực
 * @returns {Object} Dữ liệu đã giải mã
 * @throws {UnauthorizedError} Nếu token không hợp lệ hoặc hết hạn
 */
const verifyToken = (token) => {
  try {
    const secret = process.env.JWT_SECRET || 'football_booking_secret_key';
    return jwt.verify(token, secret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new UnauthorizedError(ERROR_MESSAGES.TOKEN_EXPIRED);
    }
    throw new UnauthorizedError(ERROR_MESSAGES.INVALID_TOKEN);
  }
};

/**
 * Trích xuất token từ header Authorization
 * @param {Object} req - Express request object
 * @returns {string|null} JWT token hoặc null nếu không tìm thấy
 */
const extractTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
};

module.exports = {
  generateToken,
  verifyToken,
  extractTokenFromHeader,
}; 