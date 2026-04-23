const bcrypt = require('bcryptjs');

/**
 * Mã hóa mật khẩu
 * @param {string} password - Mật khẩu cần mã hóa
 * @param {number} saltRounds - Số vòng lặp salt (mặc định: 10)
 * @returns {Promise<string>} Mật khẩu đã mã hóa
 */
const hashPassword = async (password, saltRounds = 10) => {
  const salt = await bcrypt.genSalt(saltRounds);
  return await bcrypt.hash(password, salt);
};

/**
 * So sánh mật khẩu với mật khẩu đã mã hóa
 * @param {string} password - Mật khẩu cần so sánh
 * @param {string} hashedPassword - Mật khẩu đã mã hóa
 * @returns {Promise<boolean>} true nếu khớp, false nếu không khớp
 */
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * Tạo mật khẩu ngẫu nhiên
 * @param {number} length - Độ dài mật khẩu (mặc định: 10)
 * @returns {string} Mật khẩu ngẫu nhiên
 */
const generateRandomPassword = (length = 10) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    password += characters.charAt(randomIndex);
  }
  
  return password;
};

module.exports = {
  hashPassword,
  comparePassword,
  generateRandomPassword,
}; 