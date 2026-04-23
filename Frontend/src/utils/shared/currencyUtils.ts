/**
 * Centralized currency formatting utilities
 * Single source of truth for all currency formatting across the application
 */

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * Format currency without currency symbol (for display only)
 */
export const formatCurrencyValue = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN').format(amount);
};

/**
 * Parse currency string back to number
 */
export const parseCurrency = (currencyString: string): number => {
  return parseInt(currencyString.replace(/[^\d]/g, ''), 10) || 0;
};

/**
 * Format currency for API (ensure consistent number format)
 */
export const formatCurrencyForAPI = (amount: number | string): number => {
  if (typeof amount === 'string') {
    return parseCurrency(amount);
  }
  return Math.round(amount);
};
