/**
 * Validation Utilities
 * Common validation functions for the application
 */
const validator = require('validator');
const logger = require('./logger');

/**
 * Validate if a string is a valid email
 * @param {string} email - Email to validate
 * @returns {boolean} True if email is valid
 */
exports.isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const result = validator.isEmail(email);
  if (!result) {
    logger.debug('Email validation failed', { email });
  }
  return result;
};

/**
 * Validate if a password meets strength requirements
 * @param {string} password - Password to validate
 * @param {Object} options - Password requirements
 * @returns {boolean} True if password is strong
 */
exports.isStrongPassword = (password, options = {}) => {
  if (!password || typeof password !== 'string') return false;
  
  const defaultOptions = {
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 0
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  
  const result = validator.isStrongPassword(password, mergedOptions);
  if (!result) {
    logger.debug('Password strength validation failed');
  }
  return result;
};

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
exports.sanitizeInput = (input) => {
  if (!input || typeof input !== 'string') return input;
  return validator.escape(input);
};

/**
 * Validate if a string is a valid Vietnamese phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if phone number is valid
 */
exports.isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  // Vietnamese phone number pattern: +84|0 followed by 9, 7, 8, 5, 3 and 8 more digits
  const result = validator.isMobilePhone(phone, 'vi-VN') || 
                /^(\+84|0)[3|5|7|8|9][0-9]{8}$/.test(phone);
  if (!result) {
    logger.debug('Phone validation failed', { phone });
  }
  return result;
};

/**
 * Validate if a value is not empty
 * @param {*} value - Value to check
 * @returns {boolean} True if value is not empty
 */
exports.isNotEmpty = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
};

/**
 * Validate if a string is a valid date
 * @param {string} date - Date string to validate
 * @param {string} format - Expected date format (default: YYYY-MM-DD)
 * @returns {boolean} True if date is valid
 */
exports.isValidDate = (date, format = 'YYYY-MM-DD') => {
  if (!date || typeof date !== 'string') return false;
  const result = validator.isDate(date, { format });
  if (!result) {
    logger.debug('Date validation failed', { date, format });
  }
  return result;
}; 