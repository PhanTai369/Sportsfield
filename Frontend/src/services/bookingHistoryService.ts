import { Booking, BookingStatus } from '../types/booking';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface BookingHistoryParams {
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

import { API_BASE_URL } from '../config/api';

const API_ROUTES = {
  BOOKING: {
    USER: `${API_BASE_URL}/bookings/user`
  }
};

const getToken = () => localStorage.getItem('token');

// Define the backend booking type
interface BackendBooking {
  id: string;
  booking_date: string;
  status: string;
  total_price: string | number;
  payment_status?: string;
  customer_info?: any;
  booking_metadata?: any;
  timeSlots?: any[];
  created_at: string;
  [key: string]: any;
}

interface BackendResponse {
  success: boolean;
  data: {
    bookings: BackendBooking[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
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

const mapStatus = (
  bookingStatus: string, 
  paymentStatus: string, 
  bookingDate: string, 
  timeSlot: string,
  backendBooking: BackendBooking
): BookingStatus => {
  console.log('🔍 DEBUG mapStatus:', {
    bookingStatus,
    paymentStatus, 
    bookingDate,
    timeSlot
  });
  
  // If payment was refunded, return refunded status
  if (paymentStatus === 'refunded') {
    console.log('✅ Status: refunded (payment was refunded)');
    return 'refunded';
  }
  
  // Nếu bị hủy thì luôn là cancelled
  if (bookingStatus === 'cancelled') {
    console.log('✅ Status: cancelled (booking cancelled)');
    return 'cancelled';
  }
  
  // Nếu booking status là 'pending' và chưa thanh toán, có thể là booking mới tạo
  if (bookingStatus === 'pending' && paymentStatus === 'pending') {
    console.log('✅ Status: pending (new booking, not yet processed)');
    return 'pending';
  }
  
  // Nếu booking status là 'payment_pending' hoặc chưa thanh toán thì là payment_pending
  if (bookingStatus === 'payment_pending' || paymentStatus !== 'paid') {
    console.log('✅ Status: payment_pending (waiting for payment)');
    return 'payment_pending';
  }
  
  // Nếu đã thanh toán (confirmed + paid hoặc paid status)
  if ((bookingStatus === 'confirmed' && paymentStatus === 'paid') || bookingStatus === 'completed') {
    console.log('🔄 Booking is paid, checking if service is completed');
    
    // Kiểm tra thời gian sử dụng để xác định paid vs completed
    try {
      const now = new Date();
      
      console.log('🕐 Time check:', {
        now: now.toISOString(),
        bookingDate: bookingDate
      });
      
      // Lấy giờ kết thúc từ timeSlot (ví dụ: "17:00:00 - 18:00:00")
      const timeSlotMatch = timeSlot.match(/(\d{2}:\d{2}:\d{2})\s*-\s*(\d{2}:\d{2}:\d{2})/);
      if (timeSlotMatch) {
        const endTime = timeSlotMatch[2]; // "18:00:00"
        const [hours, minutes, seconds] = endTime.split(':').map(Number);
        
        // FIX: Use actual booking play date instead of booking creation time
        let playDate: Date;
        
        // Try to get playDate from booking_metadata first
        const metadataPlayDate = (backendBooking.booking_metadata as any)?.playDate;
        if (metadataPlayDate) {
          // Parse playDate (YYYY-MM-DD format) as local date
          const [year, month, day] = metadataPlayDate.split('-').map(Number);
          playDate = new Date(year, month - 1, day);
          console.log('🎯 Using metadata playDate:', metadataPlayDate, '→', playDate.toISOString());
        } else {
          // Fallback: parse booking date as local time
          if (bookingDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = bookingDate.split('-').map(Number);
            playDate = new Date(year, month - 1, day);
          } else {
            const parsed = new Date(bookingDate);
            playDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
          }
          console.log('🎯 Using fallback booking date:', bookingDate, '→', playDate.toISOString());
        }
        
        // Tạo local datetime cho giờ kết thúc
        const endDateTime = new Date(
          playDate.getFullYear(), 
          playDate.getMonth(), 
          playDate.getDate(), 
          hours, 
          minutes, 
          seconds || 0
        );
        
        console.log('⏰ End time check:', {
          endTime: endTime,
          playDate: playDate.toISOString(),
          endDateTime: endDateTime.toISOString(),
          now: now.toISOString(),
          isPast: now > endDateTime,
          timeDiff: (now.getTime() - endDateTime.getTime()) / (1000 * 60) // minutes
        });
        
        // Nếu đã qua giờ kết thúc sân thì mới là completed (đã sử dụng dịch vụ)
        if (now > endDateTime) {
          console.log('✅ Status: completed (service used)');
          return 'completed';
        }
      } else {
        console.warn('⚠️ Could not parse timeSlot:', timeSlot);
      }
      
      // Đã thanh toán nhưng chưa đến giờ/chưa xong sân
      console.log('✅ Status: paid (paid but not used)');
      return 'paid';
      
    } catch (error) {
      console.error('❌ Error calculating booking status:', error);
      // Fallback: nếu đã thanh toán thì ít nhất là paid
      console.log('✅ Status: paid (fallback)');
      return 'paid';
    }
  }
  
  // Fallback for any other cases
  console.log('⚠️ Unhandled status combination, defaulting to pending');
  return 'pending';
};

class BookingHistoryService {
  private cache = new Map<string, any>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private imageConsistencyCache = new Map<string, string>(); // fieldId -> imageUrl

  /**
   * Get booking history with pagination
   */
  async getBookingHistory(page: number = 1, limit: number = 10, filters?: any): Promise<{
    bookings: Booking[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    try {
      const cacheKey = `bookings_${page}_${limit}_${JSON.stringify(filters || {})}`;
      
      // DEBUG: Force clear cache để debug - force fresh data
      this.cache.clear();
      console.log('🧹 Cache cleared for debugging - force fresh data');
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      // Set default sorting if not provided in filters
      const sortBy = filters?.sortBy || 'booking_date';
      const sortOrder = filters?.sortOrder || 'desc';
      
      queryParams.set('sortBy', sortBy);
      queryParams.set('sortOrder', sortOrder);

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== '' && key !== 'sortBy' && key !== 'sortOrder') {
            queryParams.set(key, String(value));
          }
        });
      }

      const response = await fetch(`${API_ROUTES.BOOKING.USER}?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: BackendResponse = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to fetch booking history');
      }

      console.log('🔄 Raw backend booking data:', data.data.bookings);
      console.log('🔍 First booking raw data:', JSON.stringify(data.data.bookings[0], null, 2));

      // Transform backend data to frontend format
      const transformedBookings = data.data.bookings.map(booking => 
        this.transformBackendBooking(booking)
      );

      const result = {
        bookings: transformedBookings,
        pagination: data.data.pagination
      };

      console.log('✅ Transformed bookings:', transformedBookings);
      
      // Force trigger a re-render by updating a timestamp
      (window as any).lastBookingUpdate = new Date().getTime();
      
      return result;

    } catch (error) {
      console.error('❌ Error fetching booking history:', error);
      throw error;
    }
  }

  /**
   * Get user bookings (alias for getBookingHistory for compatibility)
   */
  async getUserBookings(filters?: any): Promise<{
    data: Booking[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    
    // Remove page and limit from filters to avoid duplication
    const cleanFilters = { ...filters };
    delete cleanFilters.page;
    delete cleanFilters.limit;
    
    const result = await this.getBookingHistory(page, limit, cleanFilters);
    
    // Return in expected format with 'data' property
    return {
      data: result.bookings,
      pagination: result.pagination
    };
  }

  /**
   * Utility function to ensure consistent image selection for a field
   * Priority: timeSlots.field.images1 > booking_metadata.fieldImages > default
   */
  async cancelBooking(bookingId: string, cancellationData: {
    reason: string;
    refundMethod?: string;
  }): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      console.log('Cancelling booking:', bookingId, cancellationData);
      
      // Add retry logic with exponential backoff
      const maxRetries = 2;
      let retries = 0;
      let lastError = null;
      
      while (retries <= maxRetries) {
        try {
          const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/cancel`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(cancellationData)
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          if (result.success) {
            console.log('Booking cancellation succeeded:', result);
            return {
              success: true,
              message: 'Hủy đặt sân thành công!',
              data: result.data
            };
          } else {
            throw new Error(result.message || 'Hủy đặt sân thất bại');
          }
        } catch (requestError) {
          console.warn(`Retry ${retries + 1}/${maxRetries + 1} failed:`, requestError);
          lastError = requestError;
          retries++;
          
          if (retries <= maxRetries) {
            // Wait before retrying: 1s, 2s, 4s...
            const delay = Math.pow(2, retries - 1) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // If we get here, all retries failed
      throw lastError;
    } catch (error) {
      console.error('Error cancelling booking after all retries:', error);
      
      // Extract the most helpful error message possible
      let errorMessage = 'Có lỗi xảy ra khi hủy đặt sân';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 404) {
        errorMessage = 'Không tìm thấy thông tin đặt sân';
      } else if (error.response?.status === 403) {
        errorMessage = 'Bạn không có quyền hủy đặt sân này';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        message: errorMessage
      };
    }
  }

  private getConsistentFieldImage(backendBooking: any): string {
    console.log('🖼️ Getting consistent field image for booking:', backendBooking.id);
    
    // Extract fieldId for caching
    const fieldId = backendBooking.booking_metadata?.fieldId || 
                   backendBooking.timeSlots?.[0]?.subfield?.field?.id ||
                   backendBooking.fieldId;
    
    // Check cache first
    if (fieldId && this.imageConsistencyCache.has(fieldId)) {
      const cachedImage = this.imageConsistencyCache.get(fieldId)!;
      console.log('📦 Using cached image for fieldId', fieldId, ':', cachedImage);
      return cachedImage;
    }
    
    // Priority 1: timeSlots.subfield.field.images1 (most authoritative)
    if (backendBooking.timeSlots && backendBooking.timeSlots.length > 0) {
      const firstTimeSlot = backendBooking.timeSlots[0];
      if (firstTimeSlot.subfield?.field?.images1) {
        const imageUrl = firstTimeSlot.subfield.field.images1;
        console.log('✅ Using timeSlots.field.images1:', imageUrl);
        
        // Cache for consistency
        if (fieldId) {
          this.imageConsistencyCache.set(fieldId, imageUrl);
        }
        return imageUrl;
      }
    }
    
    // Priority 2: booking_metadata.fieldImages
    if (backendBooking.booking_metadata?.fieldImages) {
      const imageUrl = backendBooking.booking_metadata.fieldImages;
      console.log('✅ Using booking_metadata.fieldImages:', imageUrl);
      
      // Cache for consistency
      if (fieldId) {
        this.imageConsistencyCache.set(fieldId, imageUrl);
      }
      return imageUrl;
    }
    
    // Priority 3: other fallbacks
    const fallbackImage = backendBooking.fieldImage || 
                          backendBooking.images?.[0] || 
                          backendBooking.images1 || 
                          '/default-field-image.jpg';
    
    console.log('⚠️ Using fallback image:', fallbackImage);
    
    // Cache fallback too for consistency
    if (fieldId) {
      this.imageConsistencyCache.set(fieldId, fallbackImage);
    }
    
    return fallbackImage;
  }

  /**
   * Transform backend booking data to frontend format
   */
  private transformBackendBooking(backendBooking: BackendBooking): Booking {
    console.log('=== TRANSFORM DEBUG START ===');
    console.log('Raw backend booking:', backendBooking);

    // Get consistent field image using utility function
    const consistentFieldImage = this.getConsistentFieldImage(backendBooking);

    // Helper function to extract field information with proper priority
    const getFieldInfo = () => {
      let fieldInfo = {
        fieldId: '',
        fieldName: 'Sân không xác định',
        fieldType: 'Không xác định',
        fieldLocation: 'Không xác định'
      };

      // Priority 1: Get from booking_metadata 
      if (backendBooking.booking_metadata) {
        const metadata = backendBooking.booking_metadata;
        
        // Handle fieldLocation which can be an object or string
        let fieldLocation = 'Không xác định';
        if (metadata.fieldLocation) {
          if (typeof metadata.fieldLocation === 'object') {
            const loc = metadata.fieldLocation;
            const parts = [];
            if (loc.address) parts.push(loc.address);
            if (loc.city) parts.push(loc.city);
            if (loc.district) parts.push(loc.district);
            if (loc.ward) parts.push(loc.ward);
            fieldLocation = parts.join(', ') || 'Không xác định';
          } else if (typeof metadata.fieldLocation === 'string') {
            fieldLocation = metadata.fieldLocation;
          }
        }
        
        fieldInfo = {
          fieldId: metadata.fieldId || '',
          fieldName: metadata.fieldName || 'Sân không xác định',
          fieldType: metadata.fieldType || metadata.subFields?.[0]?.field_type || 'Không xác định',
          fieldLocation: fieldLocation
        };
      }

      // Priority 2: Override with timeSlots data if available (for name and location accuracy)
      if (backendBooking.timeSlots && backendBooking.timeSlots.length > 0) {
        const firstTimeSlot = backendBooking.timeSlots[0];
        if (firstTimeSlot.subfield && firstTimeSlot.subfield.field) {
          const field = firstTimeSlot.subfield.field;
          const location = field.location;
          
          // Format location string properly
          let locationString = 'Không xác định';
          if (location) {
            const parts = [];
            if (location.address_text) parts.push(location.address_text);
            if (location.city) parts.push(location.city);
            if (location.district) parts.push(location.district);
            locationString = parts.join(', ') || 'Không xác định';
          }
          
          // Update info
          fieldInfo.fieldId = field.id;
          fieldInfo.fieldName = field.name || fieldInfo.fieldName;
          fieldInfo.fieldType = firstTimeSlot.subfield.field_type || fieldInfo.fieldType;
          fieldInfo.fieldLocation = locationString;
        }
      }

      // Final fallback to top-level properties if still missing data
      if (!fieldInfo.fieldId && !fieldInfo.fieldName) {
        fieldInfo = {
          fieldId: backendBooking.fieldId || '',
          fieldName: backendBooking.fieldName || 'Sân không xác định',
          fieldType: backendBooking.fieldType || 'Không xác định',
          fieldLocation: backendBooking.fieldLocation || 'Không xác định'
        };
      }

      return fieldInfo;
    };

    const fieldInfo = getFieldInfo();
    console.log('Field info extracted for booking', backendBooking.id, ':', fieldInfo);

    // Extract time slots from backend data
    const getTimeSlotText = () => {
      if (backendBooking.timeSlots && backendBooking.timeSlots.length > 0) {
        return backendBooking.timeSlots.map(slot => 
          `${slot.start_time} - ${slot.end_time}`
        ).join(', ');
      }
      
      if (backendBooking.booking_metadata && backendBooking.booking_metadata.timeSlots) {
        return backendBooking.booking_metadata.timeSlots.map(slot => 
          `${slot.start_time} - ${slot.end_time}`
        ).join(', ');
      }
      
      return Array.isArray(backendBooking.timeSlots) && backendBooking.timeSlots.length > 0
        ? backendBooking.timeSlots.join(', ')
        : 'Không xác định';
    };

    const timeSlotText = getTimeSlotText();

    // Extract total price
    const totalPrice = typeof backendBooking.total_price === 'number' 
      ? backendBooking.total_price 
      : parseFloat(backendBooking.total_price) || 
        parseFloat(backendBooking.totalPrice) || 0;

    // Use booking_date as the main date field for creation time
    const bookingDate = backendBooking.date || backendBooking.booking_date || new Date().toISOString();

    // Extract play date from booking_metadata for display
    const playDate = (backendBooking.booking_metadata as any)?.playDate || null;
    const displayDate = playDate || bookingDate; // Use play date if available, fallback to booking date

    const status = mapStatus(
      backendBooking.status || 'pending', 
      backendBooking.payment_status || backendBooking.paymentStatus || 'pending',
      bookingDate,
      timeSlotText,
      backendBooking
    );
    
    console.log('🎯 Status mapping result:', {
      bookingId: backendBooking.id,
      backendStatus: backendBooking.status,
      backendPaymentStatus: backendBooking.payment_status || backendBooking.paymentStatus,
      mappedStatus: status,
      playDate: playDate,
      displayDate: displayDate
    });
    
    // For 100% payment system via Stripe - no deposits
    let depositAmount = 0;
    let remainingAmount = totalPrice;
    let depositPercentage = 0;

    if (status === 'paid' || status === 'completed') {
      // Full payment completed via Stripe
      depositAmount = totalPrice;
      remainingAmount = 0;
      depositPercentage = 100;
    } else {
      // Payment pending - full amount needs to be paid via Stripe
      depositAmount = 0;
      remainingAmount = totalPrice;
      depositPercentage = 0;
    }

    // Calculate payment timeout for pending bookings
    let paymentTimeoutAt: string | undefined;
    let remainingSeconds: number | undefined;
    
    if (status === 'pending') {
      // 10 minutes from booking creation time
      const createdAt = new Date(backendBooking.created_at);
      const timeoutAt = new Date(createdAt.getTime() + 10 * 60 * 1000); // +10 minutes
      paymentTimeoutAt = timeoutAt.toISOString();
      
      // Calculate remaining seconds
      const now = new Date();
      remainingSeconds = Math.max(0, Math.floor((timeoutAt.getTime() - now.getTime()) / 1000));
    }

    const transformedBooking: Booking = {
      id: backendBooking.id,
      fieldId: fieldInfo.fieldId,
      fieldName: fieldInfo.fieldName,
      fieldType: fieldInfo.fieldType,
      fieldNumber: backendBooking.fieldNumber || 'N/A',
      fieldLocation: fieldInfo.fieldLocation,
      date: formatDate(displayDate), // Use play date for display
      dayOfWeek: getDayOfWeek(displayDate), // Use play date for display
      fullDayName: `${getDayOfWeek(displayDate)}, ${formatDate(displayDate)}`, // Use play date for display
      timeSlot: timeSlotText,
      totalPrice: totalPrice,
      depositAmount: Math.round(depositAmount),
      remainingAmount: Math.round(remainingAmount),
      depositPercentage: depositPercentage,
      status: status,
      paymentMethod: 'Chuyển khoản', // Default payment method
      bookingDate: formatDate(backendBooking.bookingDate || backendBooking.created_at),
      image1: consistentFieldImage, // Use consistent field image
      paymentTimeoutAt: paymentTimeoutAt,
      remainingSeconds: remainingSeconds
    };

    console.log('Final image1 for booking', backendBooking.id, ':', transformedBooking.image1);
    console.log('Final transformed booking:', transformedBooking);
    console.log('=== END TRANSFORM DEBUG ===');
    return transformedBooking;
  }

  /**
   * Clear image consistency cache (useful for debugging or when field images are updated)
   */
  clearImageCache(): void {
    this.imageConsistencyCache.clear();
    console.log('🧹 Image consistency cache cleared');
  }

  /**
   * Get cache stats for debugging
   */
  getCacheStats(): { totalCachedImages: number, cachedFields: string[] } {
    return {
      totalCachedImages: this.imageConsistencyCache.size,
      cachedFields: Array.from(this.imageConsistencyCache.keys())
    };
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
    this.imageConsistencyCache.clear();
    console.log('🧹 All caches cleared');
  }

  /**
   * Test method to demonstrate the image consistency fix
   */
  testImageConsistency(): void {
    console.clear();
    console.log('🧪 TESTING IMAGE CONSISTENCY');
    console.log('Current image cache:', this.getCacheStats());
    console.log('Image consistency cache has been implemented to ensure:');
    console.log('1. Same fieldId always shows same image');
    console.log('2. Priority: timeSlots.field.images1 > booking_metadata.fieldImages > fallback');
    console.log('3. Cache prevents multiple API lookups');
    console.log('=================');
  }

  /**
   * Cancel a booking
   */

  /**
   * Get detailed booking information for PDF generation
   */
  async getBookingDetails(bookingId: string): Promise<any> {
    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch booking details');
      }

      const booking = result.data;
      
      // Transform booking data for PDF
      return {
        id: booking.id,
        fieldName: booking.timeSlots?.[0]?.field?.name || 'Tên sân không có',
        fieldLocation: this.formatFieldLocation(booking.timeSlots?.[0]?.field),
        customerInfo: {
          fullName: booking.customer_info?.fullName || booking.customer_info?.full_name || 'Không có tên',
          email: booking.customer_info?.email || 'Không có email'
        },
        date: new Date(booking.booking_date).toLocaleDateString('vi-VN'),
        slots: this.formatTimeSlots(booking.timeSlots),
        totalAmount: Number(booking.total_price) || 0,
        paymentStatus: booking.payment_status || 'pending',
        createdAt: new Date(booking.created_at).toLocaleString('vi-VN')
      };
      
    } catch (error) {
      console.error('Error fetching booking details:', error);
      throw error;
    }
  }

  private formatFieldLocation(field: any): string {
    if (!field || !field.location) return 'Địa chỉ không có';
    
    const { address_text, district, city } = field.location;
    const parts = [address_text, district, city].filter(Boolean);
    return parts.join(', ') || 'Địa chỉ không có';
  }

  private formatTimeSlots(timeSlots: any[]): string[] {
    if (!timeSlots || timeSlots.length === 0) return ['Không có khung giờ'];
    
    return timeSlots.map(slot => {
      const startTime = slot.start_time?.substring(0, 5) || '00:00';
      const endTime = slot.end_time?.substring(0, 5) || '00:00';
      return `${startTime} - ${endTime}`;
    });
  }
}

export const bookingHistoryService = new BookingHistoryService();
