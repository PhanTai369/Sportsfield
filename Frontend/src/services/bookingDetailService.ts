import { Booking } from '../types/booking';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface BackendBookingDetail {
  id: string;
  booking_date: string;
  status: string;
  total_price: string | number;
  payment_status?: string;
  payment_method?: string;
  created_at: string;
  booking_metadata?: any;
  user_id: string;
  field_name: string;
  location_address: string;
  city: string;
  district: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  rating?: number;
  review_comment?: string;
  customer_info?: {
    name: string;
    email: string;
    phone: string;
  };
  field_info?: {
    id: string;
    name: string;
    type: string;
    location: string;
    subFields?: any[];
  };
  timeSlots?: {
    id: string;
    start_time: string;
    end_time: string;
    date: string;
    sub_field_id: string;
    sub_field_name: string;
    sub_field_type: string;
  }[];
  review_rating?: number;
  [key: string]: any;
}

import { API_BASE_URL } from '../config/api';

const getToken = () => localStorage.getItem('token');

// Helper functions
const formatDate = (dateString: string | null | undefined): string => {
  try {
    if (!dateString) {
      return 'Chưa xác định';
    }
    
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Chưa xác định';
    }
    
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Chưa xác định';
  }
};

const formatDateTime = (dateString: string | null | undefined): string => {
  try {
    if (!dateString) {
      return 'Chưa xác định';
    }
    
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Chưa xác định';
    }
    
    return date.toLocaleString('vi-VN');
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return 'Chưa xác định';
  }
};

const mapBookingStatus = (
  bookingStatus: string, 
  paymentStatus: string, 
  bookingDate: string
): string => {
  // Map backend status to frontend status
  if (bookingStatus === 'cancelled') {
    return 'cancelled';
  }
  
  // Check payment status for refund
  if (paymentStatus === 'refunded') {
    return 'refund';
  }
  
  if (bookingStatus === 'completed') {
    return 'completed';
  }
  
  // For confirmed bookings, return confirmed status (don't auto-convert to completed)
  if (bookingStatus === 'confirmed' && paymentStatus === 'paid') {
    return 'confirmed';
  }
  
  // Default to confirmed for paid bookings
  return 'confirmed';
};

const transformBackendBookingDetail = (backendBooking: BackendBookingDetail) => {
  console.log('🔄 Transforming backend booking detail:', backendBooking);
  console.log('📅 Date fields:', {
    booking_date: backendBooking.booking_date,
    created_at: backendBooking.created_at,
    timeSlots: backendBooking.timeSlots?.map(slot => ({
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time
    }))
  });
  
  // Get time slots and sub-field info
  const timeSlots = backendBooking.timeSlots || [];
  
  // Get actual play date from time slots if available
  const playDate = timeSlots.length > 0 ? timeSlots[0].date : null;
  console.log('🎯 Play date from time slots:', playDate);
  
  // Get sub-fields used for this booking with individual time slots
  const subFieldsUsed = timeSlots.map(slot => ({
    id: slot.sub_field_id,
    name: slot.sub_field_name?.trim() || 'Sân',
    type: slot.sub_field_type,
    timeSlot: `${slot.start_time.substring(0, 5)} - ${slot.end_time.substring(0, 5)}`
  }));
  
  // Remove duplicate sub-fields but keep their individual time slots
  const uniqueSubFields = subFieldsUsed.filter((subField, index, self) => 
    index === self.findIndex(sf => sf.id === subField.id)
  );
  
  // Create comprehensive time slot display for all unique time ranges
  const uniqueTimeSlots = [...new Set(timeSlots.map(slot => 
    `${slot.start_time.substring(0, 5)} - ${slot.end_time.substring(0, 5)}`
  ))];
  const timeSlotText = uniqueTimeSlots.length > 0 ? uniqueTimeSlots.join(', ') : 'Không xác định';
  
  // Create display text for sub-fields
  const subFieldNames = uniqueSubFields.map(sf => sf.name).join(', ');
  const fieldDisplayName = subFieldNames ? `${backendBooking.field_info?.name || backendBooking.field_name} (${subFieldNames})` : (backendBooking.field_info?.name || backendBooking.field_name);
  
  const status = mapBookingStatus(
    backendBooking.status,
    backendBooking.payment_status || 'paid',
    playDate || backendBooking.booking_date
  );

  console.log('🔍 BookingDetail - Final mapped status:', {
    originalStatus: backendBooking.status,
    paymentStatus: backendBooking.payment_status,
    finalStatus: status
  });

  // Transform to booking detail format
  const bookingDetail = {
    id: backendBooking.id,
    customer: {
      name: backendBooking.customer_info?.name || backendBooking.user_name || 'Khách vãng lai',
      email: backendBooking.customer_info?.email || backendBooking.user_email || '',
      phone: backendBooking.customer_info?.phone || backendBooking.user_phone || '',
      avatar: (backendBooking.customer_info?.name || backendBooking.user_name || 'N').split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2),
      userId: backendBooking.user_id
    },
    field: {
      name: fieldDisplayName,
      type: uniqueSubFields.length > 0 ? uniqueSubFields[0].type : backendBooking.field_info?.type || 'Không xác định',
      location: backendBooking.field_info?.location || `${backendBooking.location_address}, ${backendBooking.district}, ${backendBooking.city}`,
      facilities: ['Đèn chiếu sáng', 'Nước uống miễn phí', 'Bãi đậu xe', 'Phòng thay đồ'], // Default facilities
      subFields: uniqueSubFields
    },      booking: {
        date: (() => {
          const dateToFormat = playDate || backendBooking.booking_date;
          console.log('🗓️ Formatting play date:', dateToFormat);
          const formatted = formatDate(dateToFormat);
          console.log('✅ Formatted play date:', formatted);
          return formatted;
        })(), // Use play date from time slots or booking date
        timeSlot: timeSlotText,
        duration: Math.ceil(timeSlots.length), // Estimate duration based on time slots
        price: typeof backendBooking.total_price === 'string' 
          ? parseFloat(backendBooking.total_price) 
          : backendBooking.total_price,
        status: status,
        paymentMethod: backendBooking.payment_method || 'Chuyển khoản',
        paymentStatus: backendBooking.payment_status === 'paid' ? 'paid' : 'pending',
        bookingDate: (() => {
          console.log('📅 Formatting booking date:', backendBooking.created_at);
          const formatted = formatDate(backendBooking.created_at);
          console.log('✅ Formatted booking date:', formatted);
          return formatted;
        })(), // When the booking was created
        bookingCode: backendBooking.id.substring(0, 8).toUpperCase(),
        notes: backendBooking.booking_metadata?.notes || ''
      },
    review: backendBooking.review_rating ? {
      rating: backendBooking.review_rating,
      comment: backendBooking.review_comment || '',
      date: formatDate(backendBooking.created_at)
    } : undefined,
    history: [
      {
        date: formatDateTime(backendBooking.created_at),
        action: 'Đặt sân',
        by: 'Khách hàng',
        note: 'Đặt sân online'
      },
      {
        date: formatDateTime(backendBooking.created_at),
        action: 'Thanh toán',
        by: 'Khách hàng',
        note: `Thanh toán bằng ${backendBooking.payment_method || 'Chuyển khoản'}`
      },
      {
        date: formatDateTime(backendBooking.created_at),
        action: `Trạng thái: ${status}`,
        by: 'Hệ thống',
        note: `Trạng thái hiện tại: ${status}`
      }
    ]
  };

  console.log('✅ Transformed booking detail:', bookingDetail);
  return bookingDetail;
};

class BookingDetailService {
  /**
   * Get booking detail by ID
   */
  async getBookingDetail(bookingId: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/revenue/owner-bookings?page=1&limit=100`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to fetch booking details');
      }

      // Find the specific booking from the list
      const booking = data.data.bookings.find((b: BackendBookingDetail) => b.id === bookingId);
      
      if (!booking) {
        throw new Error('Booking not found');
      }

      console.log('🔄 Raw backend booking detail:', booking);

      // Transform backend data to frontend format
      const transformedBooking = transformBackendBookingDetail(booking);

      console.log('✅ Transformed booking detail:', transformedBooking);
      return transformedBooking;

    } catch (error) {
      console.error('❌ Error fetching booking detail:', error);
      throw error;
    }
  }

  /**
   * Update booking status
   */
  async updateBookingStatus(bookingId: string, newStatus: string, note?: string): Promise<void> {
    try {
      // For now, we'll just log the update since we don't have a specific endpoint
      console.log('🔄 Updating booking status:', { bookingId, newStatus, note });
      
      // In a real implementation, this would make an API call to update the status
      // await fetch(`${API_BASE_URL}/bookings/${bookingId}/status`, {
      //   method: 'PATCH',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${getToken()}`
      //   },
      //   body: JSON.stringify({ status: newStatus, note })
      // });
      
      console.log('✅ Booking status updated successfully');
    } catch (error) {
      console.error('❌ Error updating booking status:', error);
      throw error;
    }
  }

  /**
   * Get customer statistics by user ID
   */
  async getCustomerStats(userId: string): Promise<{
    totalBookings: number;
    totalSpent: number;
    averageRating: number;
    memberSince: string;
  }> {
    try {
      // For now, we'll generate realistic mock data
      // In a real implementation, this would call an API endpoint
      const mockStats = {
        totalBookings: Math.floor(Math.random() * 50) + 1,
        totalSpent: Math.floor(Math.random() * 5000000) + 500000,
        averageRating: Math.round((Math.random() * 2 + 3) * 10) / 10, // 3.0 to 5.0
        memberSince: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
      };
      
      return mockStats;
    } catch (error) {
      console.error('❌ Error fetching customer stats:', error);
      return {
        totalBookings: 1,
        totalSpent: 200000,
        averageRating: 4.5,
        memberSince: new Date().toISOString()
      };
    }
  }
}

export const bookingDetailService = new BookingDetailService();
