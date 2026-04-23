/**
 * Authentication Service
 * Service để quản lý authentication và authorization
 */

import { API_BASE_URL } from '../config/api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    is_verified: boolean;
  };
  accessToken: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  is_verified: boolean;
}

class AuthService {
  private baseUrl = `${API_BASE_URL}/auth`;

  /**
   * Login user
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const result: LoginResponse = await response.json();
      
      if (result.success && result.accessToken) {
        // Store token in localStorage
        localStorage.setItem('accessToken', result.accessToken);
        localStorage.setItem('user', JSON.stringify(result.user));
      }

      return result;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  /**
   * Get current user from localStorage
   */
  getCurrentUser(): User | null {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    return !!token;
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {
    return localStorage.getItem('accessToken') || localStorage.getItem('token');
  }

  /**
   * Get current user info from API
   */
  async getMe(): Promise<User> {
    try {
      const token = this.getToken();
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${this.baseUrl}/me`, {
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
        throw new Error('Failed to fetch user info');
      }

      return result.user;
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
export default authService;
