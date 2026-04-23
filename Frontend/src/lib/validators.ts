/**
 * Validators
 * A set of validation functions for form fields
 */
import logger from './logger';

/**
 * Interface defining validation result
 */
export interface ValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Validate if a value is not empty
 * @param value - Value to check
 * @param message - Optional custom error message
 * @returns ValidationResult
 */
export const required = (
  value: any, 
  message = 'Trường này không được để trống'
): ValidationResult => {
  if (value === undefined || value === null) {
    return { valid: false, message };
  }
  
  if (typeof value === 'string' && value.trim() === '') {
    return { valid: false, message };
  }
  
  if (Array.isArray(value) && value.length === 0) {
    return { valid: false, message };
  }
  
  return { valid: true };
};

/**
 * Validate if a string is a valid email
 * @param value - Email to validate
 * @param message - Optional custom error message
 * @returns ValidationResult
 */
export const isEmail = (
  value: string,
  message = 'Email không hợp lệ'
): ValidationResult => {
  if (!value) {
    return { valid: true }; // Skip validation if empty (use required validator for that)
  }
  
  // Basic email pattern
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const valid = emailPattern.test(value);
  
  if (!valid) {
    logger.debug('Email validation failed', { 
      context: 'Validators',
      data: { email: value }
    });
  }
  
  return {
    valid,
    message: valid ? undefined : message
  };
};

/**
 * Validate minimum length
 * @param value - String to validate
 * @param min - Minimum length
 * @param message - Optional custom error message
 * @returns ValidationResult
 */
export const minLength = (
  value: string,
  min: number,
  message = `Phải có ít nhất ${min} ký tự`
): ValidationResult => {
  if (!value) {
    return { valid: true }; // Skip validation if empty
  }
  
  const valid = value.length >= min;
  
  return {
    valid,
    message: valid ? undefined : message
  };
};

/**
 * Validate maximum length
 * @param value - String to validate
 * @param max - Maximum length
 * @param message - Optional custom error message
 * @returns ValidationResult
 */
export const maxLength = (
  value: string,
  max: number,
  message = `Không được vượt quá ${max} ký tự`
): ValidationResult => {
  if (!value) {
    return { valid: true }; // Skip validation if empty
  }
  
  const valid = value.length <= max;
  
  return {
    valid,
    message: valid ? undefined : message
  };
};

/**
 * Validate password strength
 * @param value - Password to validate
 * @param message - Optional custom error message
 * @returns ValidationResult
 */
export const isStrongPassword = (
  value: string,
  message = 'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số'
): ValidationResult => {
  if (!value) {
    return { valid: true }; // Skip validation if empty
  }
  
  // At least 8 chars, 1 uppercase, 1 lowercase, 1 number
  const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  const valid = strongPasswordPattern.test(value);
  
  if (!valid) {
    logger.debug('Password strength validation failed', {
      context: 'Validators'
    });
  }
  
  return {
    valid,
    message: valid ? undefined : message
  };
};

/**
 * Validate Vietnamese phone number
 * @param value - Phone number to validate
 * @param message - Optional custom error message
 * @returns ValidationResult
 */
export const isVietnamesePhone = (
  value: string,
  message = 'Số điện thoại không hợp lệ'
): ValidationResult => {
  if (!value) {
    return { valid: true }; // Skip validation if empty
  }
  
  // Vietnamese phone number pattern
  const phonePattern = /^(\+84|84|0)[3|5|7|8|9][0-9]{8}$/;
  const valid = phonePattern.test(value);
  
  if (!valid) {
    logger.debug('Phone validation failed', { 
      context: 'Validators',
      data: { phone: value }
    });
  }
  
  return {
    valid,
    message: valid ? undefined : message
  };
};

/**
 * Validate that two fields match (e.g., password confirmation)
 * @param value - Current value
 * @param matchValue - Value to match against
 * @param message - Optional custom error message
 * @returns ValidationResult
 */
export const matches = (
  value: string,
  matchValue: string,
  message = 'Các giá trị không khớp'
): ValidationResult => {
  if (!value || !matchValue) {
    return { valid: true }; // Skip validation if either is empty
  }
  
  const valid = value === matchValue;
  
  return {
    valid,
    message: valid ? undefined : message
  };
};

/**
 * Run multiple validators and return first error
 * @param value - Value to validate
 * @param validators - Array of validator functions
 * @returns ValidationResult
 */
export const validate = (
  value: any,
  validators: ((value: any) => ValidationResult)[]
): ValidationResult => {
  for (const validator of validators) {
    const result = validator(value);
    if (!result.valid) {
      return result;
    }
  }
  
  return { valid: true };
}; 