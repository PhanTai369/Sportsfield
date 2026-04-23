/**
 * Định dạng số tiền theo kiểu Việt Nam
 * @param amount - Số tiền cần định dạng
 * @returns Chuỗi tiền tệ đã được định dạng
 */
export const formatCurrency = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return '0';
  }
  
  return new Intl.NumberFormat('vi-VN').format(numAmount);
};

/**
 * Định dạng số tiền với đơn vị VND
 * @param amount - Số tiền cần định dạng
 * @returns Chuỗi tiền tệ đã được định dạng với đơn vị
 */
export const formatCurrencyVND = (amount: number | string): string => {
  return `${formatCurrency(amount)}₫`;
};

/**
 * Parse chuỗi tiền tệ thành số
 * @param currency - Chuỗi tiền tệ
 * @returns Số tiền
 */
export const parseCurrency = (currency: string): number => {
  const cleanStr = currency.replace(/[^\d]/g, '');
  return parseInt(cleanStr) || 0;
};