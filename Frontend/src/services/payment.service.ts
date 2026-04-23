import apiClient from '../lib/apiClient';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

export interface BookingPaymentRequest {
  fieldId: string;
  subFieldIds: string[];
  bookingDate: string;
  timeSlots: Array<{
    sub_field_id: string;
    start_time: string;
    end_time: string;
  }>;
  totalAmount: number;
  customerInfo: {
    name: string;
    email: string;
    phone?: string;
    notes?: string;
  };
  currency?: string;
  return_url?: string;
  cancel_url?: string;
}

export interface BookingPaymentResponse {
  booking_id: string;
  checkout_url: string;
  session_id: string;
  payment_id: string;
  amount: number;
  currency: string;
}

// Interface for booking details returned from the session
export interface BookingSessionResponse {
  id: string;
  bookingDate: string;
  field: {
    id: string;
    name: string;
    description: string;
    price_per_hour: number;
    images1: string;
    location: {
      address_text: string;
      city: string;
      district: string;
      ward: string;
    };
  };
  timeSlots: Array<{
    id: string;
    start_time: string;
    end_time: string;
    date: string;
    sub_field: {
      id: string;
      name: string;
      type: string;
    };
  }>;
  totalPrice: number;
  paymentStatus: string;
  status: string;
  customerInfo: {
    name: string;
    email: string;
    phone?: string;
    notes?: string;
  };
  payment?: {
    id: string;
    payment_method: string;
    amount: number;
    currency: string;
    status: string;
    stripe_session_id?: string;
  };
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  supported_currencies: string[];
  icon: string;
}

export interface PackageStatusResponse {
  success: boolean;
  data: {
    hasPackage: boolean;
    packageType: 'basic' | 'premium' | 'none';
    isExpired: boolean;
    isExpiringSoon: boolean;
    daysUntilExpiry: number;
    expireDate: string | null;
    purchaseDate: string | null;
    fieldsAffected?: number; // Số lượng sân bị ảnh hưởng
  };
  message?: string;
}

export interface PackagePaymentRequest {
  packageType: 'basic' | 'premium';
  return_url?: string;
  cancel_url?: string;
}

export interface PackagePaymentResponse {
  checkout_url: string;
  session_id: string;
  amount: number;
  currency: string;
  packageType: string;
}

class PaymentService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  /**
   * Create booking and payment intent together
   */
  async createBookingWithPayment(data: BookingPaymentRequest): Promise<BookingPaymentResponse> {
    try {
      const response: any = await apiClient.post(
        `${API_BASE_URL}/payments/create-booking-payment`,
        data
      );

      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to create booking and payment');
      }
    } catch (error: any) {
      console.error('Error creating booking with payment:', error);
      throw error;
    }
  }

  /**
   * Sync payment status with Stripe
   */
  async syncPaymentStatus(bookingId: string): Promise<any> {
    try {
      const response: any = await apiClient.post(`${API_BASE_URL}/payments/booking/${bookingId}/sync`);
      return response;
    } catch (error: any) {
      console.error('Error syncing payment status:', error);
      throw error;
    }
  }

  /**
   * Get booking by session ID
   */
  async getBookingBySessionId(sessionId: string): Promise<BookingSessionResponse> {
    try {
      const response: any = await apiClient.get(
        `${API_BASE_URL}/payments/session/${sessionId}/booking`
      );
      
      if (response.success) {
        // The backend returns nested data: response.data.data
        return response.data.data || response.data;
      } else {
        throw new Error(response.message || 'Failed to get booking data');
      }
    } catch (error: any) {
      console.error('Error getting booking by session ID:', error);
      throw error;
    }
  }

  /**
   * Get booking by booking ID
   */
  async getBookingById(bookingId: string): Promise<BookingSessionResponse> {
    try {
      const response: any = await apiClient.get(
        `${API_BASE_URL}/payments/booking/${bookingId}`
      );
      
      if (response.success) {
        // The backend returns nested data: response.data.data
        return response.data.data || response.data;
      } else {
        throw new Error(response.message || 'Failed to get booking data');
      }
    } catch (error: any) {
      console.error('Error getting booking by ID:', error);
      throw error;
    }
  }

  /**
   * Get available payment methods
   */
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const response: any = await apiClient.get(`${API_BASE_URL}/payments/methods/list`);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error('Failed to get payment methods');
      }
    } catch (error: any) {
      console.error('Error getting payment methods:', error);
      throw error;
    }
  }

  /**
   * Continue payment for existing booking
   */
  async continuePaymentForBooking(bookingId: string): Promise<BookingPaymentResponse> {
    try {
      const response: any = await apiClient.post(
        `${API_BASE_URL}/payments/continue-payment/${bookingId}`
      );
      
      if (response.success) {
        // Backend returns nested data: { data: { data: { checkout_url, ... } } }
        return response.data.data;
      } else {
        throw new Error(response.message || 'Failed to continue payment');
      }
    } catch (error: any) {
      console.error('Error continuing payment:', error);
      throw error;
    }
  }

  /**
   * Cancel booking and payment
   */
  async cancelBooking(bookingId: string): Promise<any> {
    try {
      const response: any = await apiClient.post(`${API_BASE_URL}/bookings/${bookingId}/cancel`);
      return response;
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      throw error;
    }
  }

  /**
   * Validate promo code
   */
  async validatePromoCode(code: string, totalAmount: number): Promise<any> {
    const response: any = await apiClient.post(`${API_BASE_URL}/payments/validate-promo`, {
      code,
      totalAmount
    });
    
    return response;
  }

  /**
   * Create package payment for service plans
   */
  async createPackagePayment(data: PackagePaymentRequest): Promise<PackagePaymentResponse> {
    try {
      const response: any = await apiClient.post(
        `${API_BASE_URL}/payments/create-package-payment`,
        data
      );

      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to create package payment');
      }
    } catch (error: any) {
      console.error('Error creating package payment:', error);
      throw error;
    }
  }

  // Get package status
  async getPackageStatus(): Promise<PackageStatusResponse['data']> {
    const response = await axios.get<PackageStatusResponse>(
      `${API_BASE_URL}/payments/package-status`,
      {
        headers: {
          ...this.getAuthHeaders(),
        },
      }
    );
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to get package status');
    }
  }
}

export const paymentService = new PaymentService();
export default paymentService;
