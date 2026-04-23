/**
 * Status Utility Functions
 * Centralized functions for handling various status types across the application
 */

// Time slot statuses
export type TimeSlotStatus = 'available' | 'booked' | 'maintenance';

// Payment statuses
export type PaymentStatus = 'paid' | 'pending' | 'cancelled';

// Field names
export type FieldName = 'A' | 'B' | 'C' | 'D' | 'E';

/**
 * Get status text in Vietnamese for time slots
 */
export const getTimeSlotStatusText = (status: TimeSlotStatus): string => {
  switch (status) {
    case 'available': return 'Còn trống';
    case 'booked': return 'Đã đặt';
    case 'maintenance': return 'Bảo trì';
    default: return '';
  }
};

/**
 * Get status CSS classes for time slots
 */
export const getTimeSlotStatusClass = (status: TimeSlotStatus): string => {
  switch (status) {
    case 'available': return 'bg-green-100 text-green-700';
    case 'booked': return 'bg-blue-100 text-blue-700';
    case 'maintenance': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

/**
 * Get payment status text in Vietnamese
 */
export const getPaymentStatusText = (status: PaymentStatus): string => {
  switch (status) {
    case 'paid': return 'Đã thanh toán';
    case 'pending': return 'Chờ thanh toán';
    case 'cancelled': return 'Đã hủy';
    default: return 'Không xác định';
  }
};

/**
 * Get payment status CSS classes
 */
export const getPaymentStatusClass = (status: PaymentStatus): string => {
  switch (status) {
    case 'paid': return 'bg-green-100 text-green-700';
    case 'pending': return 'bg-yellow-100 text-yellow-700';
    case 'cancelled': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

/**
 * Get field color name in Vietnamese
 */
export const getFieldColorName = (field: FieldName): string => {
  switch (field) {
    case 'A': return 'Xanh lá';
    case 'B': return 'Xanh dương';
    case 'C': return 'Tím';
    case 'D': return 'Vàng';
    case 'E': return 'Đỏ';
    default: return 'Xám';
  }
};

/**
 * Get field CSS class
 */
export const getFieldClass = (field: FieldName): string => {
  return `field-header-${field.toLowerCase()}`;
};

/**
 * Get field dot CSS class
 */
export const getFieldDotClass = (field: FieldName): string => {
  return `field-dot-${field.toLowerCase()}`;
};

/**
 * Validate field name
 */
export const isValidFieldName = (field: string): field is FieldName => {
  return ['A', 'B', 'C', 'D', 'E'].includes(field);
};

/**
 * Validate time slot status
 */
export const isValidTimeSlotStatus = (status: string): status is TimeSlotStatus => {
  return ['available', 'booked', 'maintenance'].includes(status);
};

/**
 * Validate payment status
 */
export const isValidPaymentStatus = (status: string): status is PaymentStatus => {
  return ['paid', 'pending', 'cancelled'].includes(status);
};

/**
 * Get field-specific time slot CSS class
 */
export const getFieldTimeSlotClass = (field: FieldName, status: TimeSlotStatus): string => {
  const fieldClass = `time-slot-field-${field.toLowerCase()}`;
  const statusClass = `time-slot-${status}`;
  return `${fieldClass} ${statusClass}`;
};

/**
 * Get field color theme information
 */
export const getFieldColorTheme = (field: FieldName) => {
  const themes = {
    A: {
      name: 'Xanh lá',
      primary: '#10b981',
      light: '#d1fae5',
      dark: '#065f46',
      gradient: 'from-green-100 to-green-200'
    },
    B: {
      name: 'Xanh dương', 
      primary: '#3b82f6',
      light: '#dbeafe',
      dark: '#1e40af',
      gradient: 'from-blue-100 to-blue-200'
    },
    C: {
      name: 'Tím',
      primary: '#8b5cf6',
      light: '#e9d5ff',
      dark: '#6b21a8',
      gradient: 'from-purple-100 to-purple-200'
    },
    D: {
      name: 'Vàng',
      primary: '#f59e0b',
      light: '#fef3c7',
      dark: '#92400e',
      gradient: 'from-yellow-100 to-yellow-200'
    },
    E: {
      name: 'Đỏ',
      primary: '#ef4444',
      light: '#fecaca',
      dark: '#991b1b',
      gradient: 'from-red-100 to-red-200'
    }
  };
  
  return themes[field];
};
