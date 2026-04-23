// Booking types and interfaces
export interface BookingCardProps {
  booking: Booking;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export interface Booking {
  id: string;
  fieldId: string; 
  fieldName: string;
  fieldType: string;
  fieldNumber: string;
  fieldLocation: string;
  date: string; // Play date (ngày chơi)
  playDate?: string; // Additional field for play date
  dayOfWeek: string;
  fullDayName: string;
  timeSlot: string;
  // Sub-fields with individual time slots
  subFields?: {
    id: string;
    name: string;
    type: string;
    timeSlot: string;
  }[];
  totalPrice: number;
  depositAmount: number;
  remainingAmount: number;
  depositPercentage: number;
  status: BookingStatus;
  paymentMethod: string;
  bookingDate: string; // Booking date (ngày đặt)
  image1?: string;
  cancellationReason?: string;
  refundMethod?: string;
  refundAmount?: number;
  // For payment timeout countdown
  paymentTimeoutAt?: string; // ISO string - khi nào hết hạn thanh toán
  remainingSeconds?: number; // Số giây còn lại để thanh toán
  // For owner view - customer information
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  rating?: number | null;
  review?: string | null;
}

// Import centralized currency utilities
import { formatCurrencyValue as formatCurrency } from '../utils/shared/currencyUtils';
// Import centralized status utilities
import { 
  BookingStatus as CentralizedBookingStatus,
  getStatusColor,
  getStatusText,
  canCancelBooking,
  canReviewBooking,
  formatRemainingTime,
  getStatusWithCountdown
} from '../utils/shared/bookingStatusUtils';

// Use centralized type
export type BookingStatus = CentralizedBookingStatus;

// Re-export for backward compatibility
export { 
  formatCurrency,
  getStatusColor,
  getStatusText,
  canCancelBooking,
  canReviewBooking,
  formatRemainingTime,
  getStatusWithCountdown
};