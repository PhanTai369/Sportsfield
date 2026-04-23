/**
 * Centralized booking status utilities
 * Single source of truth for all status-related logic across the application
 */

export type BookingStatus = 'pending' | 'payment_pending' | 'paid' | 'completed' | 'cancelled' | 'refunded' | 'refund' | 'confirmed';

/**
 * Get status color classes for UI display
 */
export function getStatusColor(status: BookingStatus): string {
  switch (status) {
    case 'pending':
    case 'payment_pending':
      return 'bg-orange-100 text-orange-800';
    case 'paid':
    case 'confirmed':
      return 'bg-green-100 text-green-800';
    case 'completed':
      return 'bg-blue-100 text-blue-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'refunded':
      return 'bg-purple-100 text-purple-800';
    case 'refund':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get status text in Vietnamese
 */
export function getStatusText(status: BookingStatus): string {
  switch (status) {
    case 'pending':
    case 'payment_pending':
      return 'Chờ thanh toán';
    case 'paid':
      return 'Đã thanh toán';
    case 'confirmed':
      return 'Đã xác nhận';
    case 'completed':
      return 'Hoàn thành';
    case 'cancelled':
      return 'Đã hủy';
    case 'refunded':
      return 'Đã hoàn tiền';
    case 'refund':
      return 'Hoàn tiền';
    default:
      return 'Không xác định';
  }
}

/**
 * Map backend status to frontend status (unified logic)
 */
export function mapBackendStatus(
  backendStatus: string, 
  paymentStatus: string, 
  bookingDate?: string, 
  timeSlot?: string
): BookingStatus {
  // If payment was refunded, return refunded status
  if (paymentStatus === 'refunded') {
    return 'refunded';
  }
  
  // If refunded, always return refunded
  if (backendStatus === 'refunded') {
    return 'refunded';
  }
  
  // If cancelled, always return cancelled
  if (backendStatus === 'cancelled') {
    return 'cancelled';
  }
  
  // If pending and not paid yet
  if (backendStatus === 'pending' && paymentStatus === 'pending') {
    return 'pending';
  }
  
  // If payment_pending or not paid yet
  if (backendStatus === 'payment_pending' || paymentStatus !== 'paid') {
    return 'payment_pending';
  }
  
  // If paid and confirmed
  if ((backendStatus === 'confirmed' && paymentStatus === 'paid') || backendStatus === 'completed') {
    // Check if service is completed (time has passed)
    if (bookingDate && timeSlot) {
      try {
        const now = new Date();
        const [timeRange] = timeSlot.split(' - ');
        const serviceDateTime = new Date(`${bookingDate}T${timeRange}`);
        
        if (now > serviceDateTime) {
          return 'completed';
        }
      } catch (error) {
        console.warn('Error parsing service time:', error);
      }
    }
    
    return 'paid';
  }
  
  // Default fallback
  return 'pending';
}

/**
 * Check if booking can be cancelled
 */
export function canCancelBooking(booking: { 
  status: BookingStatus; 
  remainingSeconds?: number; 
  date: string; 
  timeSlot: string; 
}): boolean {
  // Case 1: Pending payment (10 minutes window)
  if ((booking.status === 'pending' || booking.status === 'payment_pending') && 
      booking.remainingSeconds && booking.remainingSeconds > 0) {
    return true;
  }
  
  // Case 2: Paid booking (paid, but not yet used service)
  if (booking.status === 'paid') {
    try {
      const now = new Date();
      const bookingDateTime = new Date(`${booking.date}T${booking.timeSlot.split(' - ')[0]}`);
      return bookingDateTime > now;
    } catch (error) {
      console.warn('Error parsing booking time for cancellation check:', error);
      return false;
    }
  }
  
  return false;
}

/**
 * Check if booking can be reviewed
 */
export function canReviewBooking(booking: { status: BookingStatus }): boolean {
  // Only allow review for completed bookings
  return booking.status === 'completed';
}

/**
 * Format remaining time for countdown display
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) return '00:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Get status with countdown for display
 */
export function getStatusWithCountdown(booking: { 
  status: BookingStatus; 
  remainingSeconds?: number; 
}): string {
  if ((booking.status === 'pending' || booking.status === 'payment_pending') && 
      booking.remainingSeconds && booking.remainingSeconds > 0) {
    return `${getStatusText(booking.status)} (${formatRemainingTime(booking.remainingSeconds)})`;
  }
  
  return getStatusText(booking.status);
}
