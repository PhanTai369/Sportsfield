/**
 * Kiểm tra nếu chuỗi email hợp lệ
 * @param {string} email - Email cần kiểm tra
 * @returns {boolean} true nếu hợp lệ, false nếu không hợp lệ
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Kiểm tra độ mạnh của mật khẩu
 * Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số
 * @param {string} password - Mật khẩu cần kiểm tra
 * @returns {boolean} true nếu đủ mạnh, false nếu không đủ mạnh
 */
const isStrongPassword = (password) => {
  // Kiểm tra độ dài tối thiểu
  if (password.length < 8) {
    return false;
  }
  
  // Kiểm tra có chữ hoa
  if (!/[A-Z]/.test(password)) {
    return false;
  }
  
  // Kiểm tra có chữ thường
  if (!/[a-z]/.test(password)) {
    return false;
  }
  
  // Kiểm tra có số
  if (!/[0-9]/.test(password)) {
    return false;
  }
  
  return true;
};

/**
 * Kiểm tra định dạng số điện thoại Việt Nam
 * @param {string} phone - Số điện thoại cần kiểm tra
 * @returns {boolean} true nếu hợp lệ, false nếu không hợp lệ
 */
const isValidVietnamesePhone = (phone) => {
  const phoneRegex = /^(\+84|84|0[3|5|7|8|9])+([0-9]{8})\b$/;
  return phoneRegex.test(phone);
};

/**
 * Phân tích các tham số phân trang từ query
 * @param {Object} query - Request query object
 * @returns {Object} Đối tượng chứa các tham số phân trang
 */
const getPaginationParams = (query) => {
  // Handle array parameters from duplicate query params
  const rawPage = Array.isArray(query.page) ? query.page[query.page.length - 1] : query.page;
  const rawLimit = Array.isArray(query.limit) ? query.limit[query.limit.length - 1] : query.limit;
  
  const page = parseInt(rawPage) || 1;
  const limit = parseInt(rawLimit) || 10;
  const offset = (page - 1) * limit;
  
  return {
    page,
    limit,
    offset,
  };
};

/**
 * Tạo đối tượng sắp xếp dựa trên tham số query
 * @param {Object} query - Request query object
 * @param {string} defaultSortField - Trường sắp xếp mặc định
 * @returns {Array} Mảng sắp xếp cho Sequelize
 */
const getSortingParams = (query, defaultSortField = 'created_at') => {
  // Handle array parameters from duplicate query params
  const sortField = Array.isArray(query.sortBy) ? query.sortBy[query.sortBy.length - 1] : query.sortBy;
  const sortOrder = Array.isArray(query.sortOrder) ? query.sortOrder[query.sortOrder.length - 1] : query.sortOrder;
  
  const field = sortField || defaultSortField;
  const order = String(sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  
  return [[field, order]];
};

module.exports = {
  isValidEmail,
  isStrongPassword,
  isValidVietnamesePhone,
  getPaginationParams,
  getSortingParams,
}; 