import { Booking, BookingStatus } from '../types/booking';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface OwnerBookingParams {
  page?: number;
  limit?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  fieldId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface OwnerBookingStats {
  totalBookings: number;
  confirmedBookings: number;
  refundBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  averageRating: number;
  totalFields: number;
}

import { API_BASE_URL } from '../config/api';

const API_ROUTES = {
  OWNER_BOOKINGS: `${API_BASE_URL}/revenue/owner-bookings`,
  OWNER_STATS: `${API_BASE_URL}/revenue/owner-booking-stats`
};

const getToken = () => localStorage.getItem('token');

// Define the backend booking type for owner bookings
interface BackendOwnerBooking {
  id: string;
  booking_date: string;
  status: string;
  total_price: string | number;
  payment_status?: string;
  payment_method?: string;
  customer_info?: {
    name: string;
    email: string;
    phone: string;
  };
  field_info?: {
    id: string;
    name: string;
    type: string;
    field_number: string;
    location: string;
    subFields?: Array<{
      id: string;
      name: string;
      type: string;
      timeSlot: string;
    }>;
  };
  booking_metadata?: any;
  timeSlots?: Array<{
    id: string;
    start_time: string;
    end_time: string;
    date: string;
    sub_field_id: string;
    sub_field_name: string;
    sub_field_type: string;
  }>;
  created_at: string;
  review_rating?: number;
  review_comment?: string;
  [key: string]: any;
}

interface BackendOwnerBookingResponse {
  success: boolean;
  data: {
    bookings: BackendOwnerBooking[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    stats: OwnerBookingStats;
  };
}

// Helper functions
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    return 'Không xác định';
  }
};

const getDayOfWeek = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return days[date.getDay()];
  } catch (error) {
    return 'Không xác định';
  }
};

const mapOwnerBookingStatus = (
  bookingStatus: string, 
  paymentStatus: string, 
  bookingDate: string
): BookingStatus => {
  console.log('🔍 DEBUG mapOwnerBookingStatus:', {
    bookingStatus,
    paymentStatus, 
    bookingDate
  });
  
  // Map backend status to frontend status for owner view
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
  
  // Check for pending payment statuses - these should be filtered out
  if (bookingStatus === 'pending' || bookingStatus === 'payment_pending' || 
      paymentStatus === 'pending' || paymentStatus === 'payment_pending') {
    console.log('🚫 PENDING PAYMENT DETECTED:', { bookingStatus, paymentStatus });
    return 'pending';
  }
  
  // For confirmed bookings, return confirmed status (don't auto-convert to completed)
  if (bookingStatus === 'confirmed' && paymentStatus === 'paid') {
    return 'confirmed';
  }
  
  // Default to confirmed for paid bookings
  return 'confirmed';
};

const transformBackendOwnerBooking = (backendBooking: BackendOwnerBooking): Booking => {
  console.log('🔄 Transforming backend owner booking:', backendBooking);
  
  // Get time slots and sub-field info
  const timeSlots = backendBooking.timeSlots || [];
  
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
  const fieldDisplayName = subFieldNames ? `${backendBooking.field_info?.name} (${subFieldNames})` : backendBooking.field_info?.name || 'Không xác định';
  
  const status = mapOwnerBookingStatus(
    backendBooking.status,
    backendBooking.payment_status || 'paid',
    backendBooking.booking_date
  );
  
  console.log('🔍 OwnerBooking - Final mapped status:', {
    bookingId: backendBooking.id,
    customerName: backendBooking.customer_info?.name,
    originalStatus: backendBooking.status,
    paymentStatus: backendBooking.payment_status,
    finalStatus: status,
    willBeFiltered: status === 'pending' || status === 'payment_pending'
  });
  
  const transformedBooking: Booking = {
    id: backendBooking.id,
    fieldId: backendBooking.field_info?.id || '',
    fieldName: fieldDisplayName,
    fieldType: uniqueSubFields.length > 0 ? uniqueSubFields[0].type : backendBooking.field_info?.type || 'Không xác định',
    fieldNumber: subFieldNames || 'Không xác định',
    fieldLocation: backendBooking.field_info?.location || 'Không xác định',
    date: formatDate(backendBooking.booking_date), // Play date (ngày chơi)
    playDate: formatDate(backendBooking.booking_date), // Play date (ngày chơi)
    dayOfWeek: getDayOfWeek(backendBooking.booking_date),
    fullDayName: new Date(backendBooking.booking_date).toLocaleDateString('vi-VN', { weekday: 'long' }),
    timeSlot: timeSlotText,
    subFields: uniqueSubFields, // Add sub-fields with individual time slots
    totalPrice: typeof backendBooking.total_price === 'string' 
      ? parseFloat(backendBooking.total_price) 
      : backendBooking.total_price,
    depositAmount: 0, // Will be calculated based on business logic
    remainingAmount: 0, // Will be calculated based on business logic
    depositPercentage: 30, // Default 30%
    status: status,
    paymentMethod: backendBooking.payment_method || 'Chuyển khoản',
    bookingDate: formatDate(backendBooking.created_at), // Booking date (ngày đặt)
    
    // Additional fields for owner view
    customerName: backendBooking.customer_info?.name || 'Khách vãng lai',
    customerEmail: backendBooking.customer_info?.email || '',
    customerPhone: backendBooking.customer_info?.phone || '',
    rating: backendBooking.review_rating || null,
    review: backendBooking.review_comment || null
  };

  // Calculate deposit and remaining amounts
  transformedBooking.depositAmount = transformedBooking.totalPrice * (transformedBooking.depositPercentage / 100);
  transformedBooking.remainingAmount = transformedBooking.totalPrice - transformedBooking.depositAmount;

  console.log('✅ Transformed owner booking:', transformedBooking);
  return transformedBooking;
};

class OwnerBookingService {
  private cache = new Map<string, any>();
  private cacheExpiration = 5 * 60 * 1000; // 5 minutes

  /**
   * Get owner booking history with pagination and filters
   */
  async getOwnerBookings(params: OwnerBookingParams = {}): Promise<{
    bookings: Booking[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    stats: OwnerBookingStats;
  }> {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        startDate,
        endDate,
        fieldId,
        sortBy = 'booking_date',
        sortOrder = 'desc',
        search
      } = params;

      const cacheKey = `owner_bookings_${JSON.stringify(params)}`;
      
      // Check cache first
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheExpiration) {
          console.log('📦 Using cached owner bookings data');
          return cached.data;
        }
      }

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder
      });

      if (status && status !== 'all') {
        queryParams.set('status', status);
      }
      if (startDate) {
        queryParams.set('startDate', startDate);
      }
      if (endDate) {
        queryParams.set('endDate', endDate);
      }
      if (fieldId) {
        queryParams.set('fieldId', fieldId);
      }
      if (search) {
        queryParams.set('search', search);
      }

      const response = await fetch(`${API_ROUTES.OWNER_BOOKINGS}?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: BackendOwnerBookingResponse = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to fetch owner bookings');
      }

      console.log('🔄 Raw backend owner booking data:', data.data.bookings);

      // Transform backend data to frontend format and filter out pending payments
      const transformedBookings = data.data.bookings
        .filter(backendBooking => {
          // Filter out pending payment bookings at the backend level first
          const isPendingPayment = 
            backendBooking.status === 'pending' || 
            backendBooking.status === 'payment_pending' || 
            backendBooking.payment_status === 'pending' || 
            backendBooking.payment_status === 'payment_pending';
          
          if (isPendingPayment) {
            console.log('🚫 Filtering out pending payment booking (backend level):', {
              id: backendBooking.id,
              status: backendBooking.status,
              paymentStatus: backendBooking.payment_status
            });
          }
          return !isPendingPayment;
        })
        .map(booking => transformBackendOwnerBooking(booking))
        .filter(booking => {
          // Double-check filter at frontend level after transformation
          const isPendingPayment = booking.status === 'pending' || booking.status === 'payment_pending';
          if (isPendingPayment) {
            console.log('🚫 Filtering out pending payment booking (frontend level):', booking.id, booking.status);
          }
          return !isPendingPayment;
        });

      console.log('✅ Filtered bookings (excluding pending payments):', transformedBookings.length, 'out of', data.data.bookings.length);

      const result = {
        bookings: transformedBookings,
        pagination: data.data.pagination,
        stats: data.data.stats
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      console.log('✅ Transformed owner bookings:', result);
      return result;

    } catch (error) {
      console.error('❌ Error fetching owner bookings:', error);
      
      // Return mock data for development
      return this.getMockOwnerBookings(params);
    }
  }

  /**
   * Get owner booking statistics
   */
  async getOwnerBookingStats(): Promise<OwnerBookingStats> {
    try {
      const response = await fetch(API_ROUTES.OWNER_STATS, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse<OwnerBookingStats> = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to fetch owner booking stats');
      }

      return data.data;

    } catch (error) {
      console.error('❌ Error fetching owner booking stats:', error);
      
      // Return mock stats for development
      return {
        totalBookings: 156,
        confirmedBookings: 89,
        refundBookings: 12,
        completedBookings: 45,
        cancelledBookings: 10,
        totalRevenue: 15600000,
        averageRating: 4.3,
        totalFields: 8
      };
    }
  }

  /**
   * Get mock owner bookings for development
   */
  private getMockOwnerBookings(params: OwnerBookingParams): {
    bookings: Booking[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    stats: OwnerBookingStats;
  } {
    const mockBookings: Booking[] = [
      {
        id: '1',
        fieldId: 'field1',
        fieldName: 'Sân Bóng Ông Bầu',
        fieldType: 'Sân 7',
        fieldNumber: '1',
        fieldLocation: 'Quận 1, TP.HCM',
        date: '16/07/2025',
        dayOfWeek: 'T4',
        fullDayName: 'Thứ Tư',
        timeSlot: '08:00 - 10:00',
        totalPrice: 200000,
        depositAmount: 60000,
        remainingAmount: 140000,
        depositPercentage: 30,
        status: 'confirmed' as BookingStatus,
        paymentMethod: 'Chuyển khoản',
        bookingDate: '15/07/2025',
        customerName: 'Trần Văn Nam',
        customerEmail: 'nam@gmail.com',
        customerPhone: '0987654321',
        rating: 4.5,
        review: 'Sân đẹp, dịch vụ tốt'
      },
      {
        id: '2',
        fieldId: 'field2',
        fieldName: 'Sân Bóng Ông Bầu 2',
        fieldType: 'Sân 5',
        fieldNumber: '2',
        fieldLocation: 'Quận 2, TP.HCM',
        date: '16/07/2025',
        dayOfWeek: 'T4',
        fullDayName: 'Thứ Tư',
        timeSlot: '14:00 - 16:00',
        totalPrice: 150000,
        depositAmount: 45000,
        remainingAmount: 105000,
        depositPercentage: 30,
        status: 'refund' as BookingStatus,
        paymentMethod: 'Tiền mặt',
        bookingDate: '16/07/2025',
        customerName: 'Lê Minh Khoa',
        customerEmail: 'khoa@gmail.com',
        customerPhone: '0912345678',
        rating: null,
        review: null
      },
      {
        id: '3',
        fieldId: 'field1',
        fieldName: 'Sân Bóng Ông Bầu',
        fieldType: 'Sân 7',
        fieldNumber: '1',
        fieldLocation: 'Quận 1, TP.HCM',
        date: '15/07/2025',
        dayOfWeek: 'T3',
        fullDayName: 'Thứ Ba',
        timeSlot: '18:00 - 20:00',
        totalPrice: 250000,
        depositAmount: 75000,
        remainingAmount: 175000,
        depositPercentage: 30,
        status: 'completed' as BookingStatus,
        paymentMethod: 'Chuyển khoản',
        bookingDate: '14/07/2025',
        customerName: 'Nguyễn Thị Hoa',
        customerEmail: 'hoa@gmail.com',
        customerPhone: '0901234567',
        rating: 5,
        review: 'Tuyệt vời, sẽ quay lại'
      }
    ];

    const filteredBookings = mockBookings.filter(booking => {
      if (params.status && params.status !== 'all' && booking.status !== params.status) {
        return false;
      }
      if (params.search && !booking.customerName?.toLowerCase().includes(params.search.toLowerCase()) && 
          !booking.fieldName.toLowerCase().includes(params.search.toLowerCase())) {
        return false;
      }
      return true;
    });

    const page = params.page || 1;
    const limit = params.limit || 10;
    const total = filteredBookings.length;
    const totalPages = Math.ceil(total / limit);

    return {
      bookings: filteredBookings.slice((page - 1) * limit, page * limit),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      stats: {
        totalBookings: 156,
        confirmedBookings: 89,
        refundBookings: 12,
        completedBookings: 45,
        cancelledBookings: 10,
        totalRevenue: 15600000,
        averageRating: 4.3,
        totalFields: 8
      }
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Owner booking cache cleared');
  }

  /**
   * Force refresh data from backend
   */
  async refreshData(): Promise<void> {
    this.clearCache();
    console.log('🔄 Owner booking data refreshed');
  }
}

export const ownerBookingService = new OwnerBookingService();
