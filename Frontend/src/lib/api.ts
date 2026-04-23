import { API_BASE_URL } from '../config/api';

// API base URL - sử dụng từ config
const API_URL = API_BASE_URL;

// Authentication API service
export const authApi = {
  // Login user
  login: async (credentials: { email: string; password: string }) => {
    try {
      console.log('Calling login API:', `${API_URL}/auth/login`);
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Đăng nhập thất bại');
      }
      
      const data = await response.json();
      // Store the token in localStorage
      if (data.accessToken) {
        localStorage.setItem('token', data.accessToken);
      }
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  // Register user
  register: async (userData: { 
    name: string; 
    email: string; 
    password: string; 
    phone?: string;
    role: string;
  }) => {
    try {
      console.log('Calling register API:', `${API_URL}/auth/register`);
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Đăng ký thất bại');
      }
      
      const data = await response.json();
      // Don't store token after registration - user needs to verify email first
      return data;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  },
  
  // Google OAuth authentication
  googleAuth: async (googleData: { tokenId: string, profileObj: any }) => {
    try {
      // Log the data to debug
      console.log('Google auth data:', googleData);
      console.log('Calling Google auth API:', `${API_URL}/auth/google`);
      
      // Make sure profileObj has all required fields
      if (!googleData.profileObj.googleId) {
        throw new Error('Missing googleId in profile data');
      }
      
      // Ensure role is lowercase if it exists
      if (googleData.profileObj.role) {
        googleData.profileObj.role = googleData.profileObj.role.toLowerCase();
      } else {
        // Default to customer role if not provided
        googleData.profileObj.role = 'customer';
      }
      
      const response = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleData),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Đăng nhập Google thất bại');
      }
      
      const data = await response.json();
      // Store the token in localStorage
      if (data.accessToken) {
        localStorage.setItem('token', data.accessToken);
      }
      
      return data;
    } catch (error) {
      console.error('Google auth error:', error);
      throw error;
    }
  },
  
  // Logout user
  logout: async () => {
    try {
      // Remove token from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Optional: Call logout endpoint if the backend requires it
      try {
        console.log('Calling logout API:', `${API_URL}/auth/logout`);
        const response = await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          credentials: 'include',
        });
        
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.error('Logout API error:', error);
        // Continue with local logout even if API call fails
      }
      
      return { success: true, message: 'Đăng xuất thành công' };
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },
  
  // Get the current authenticated user
  getCurrentUser: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }
      
      console.log('Calling getCurrentUser API:', `${API_URL}/auth/me`);
      const response = await fetch(`${API_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          throw new Error('Token expired or invalid');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get user data');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  },
  
  // Resend verification email
  resendVerification: async (email: string) => {
    try {
      console.log('Calling resend verification API:', `${API_URL}/auth/resend-verification`);
      const response = await fetch(`${API_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể gửi lại email xác thực');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Resend verification error:', error);
      throw error;
    }
  },
};

// Notification API service
export const getNotifications = async () => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No token found');
  const response = await fetch(`${API_URL}/notifications`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      throw new Error('Token expired or invalid');
    }
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to get notifications');
  }
  return await response.json();
};

export const markNotificationAsRead = async (notificationId: string) => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No token found');
  const response = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      throw new Error('Token expired or invalid');
    }
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to mark notification as read');
  }
  return await response.json();
};

// Booking API service
export const bookingApi = {
  // Get user's bookings
  getUserBookings: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }
      
      console.log('Calling getUserBookings API:', `${API_URL}/bookings/user`);
      const response = await fetch(`${API_URL}/bookings/user`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          throw new Error('Token expired or invalid');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get user bookings');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get user bookings error:', error);
      throw error;
    }
  },

  // Get booking by ID
  getBookingById: async (bookingId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }
      
      console.log('Calling getBookingById API:', `${API_URL}/bookings/${bookingId}`);
      const response = await fetch(`${API_URL}/bookings/${bookingId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          throw new Error('Token expired or invalid');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get booking details');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get booking by ID error:', error);
      throw error;
    }
  },

  // Cancel booking
  cancelBooking: async (bookingId: string, reason?: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }
      
      console.log('Calling cancelBooking API:', `${API_URL}/bookings/${bookingId}`);
      const response = await fetch(`${API_URL}/bookings/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          status: 'cancelled',
          cancellation_reason: reason 
        }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          throw new Error('Token expired or invalid');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel booking');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Cancel booking error:', error);
      throw error;
    }
  },
};