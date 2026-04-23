/**
 * API Client
 * A wrapper around axios with error handling, logging, and authentication
 */
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import logger from './logger';
import { API_BASE_URL } from '../config/api';

// API URLs
const API_URL = API_BASE_URL;
const AUTH_HEADER = 'Authorization';
const CORRELATION_HEADER = 'x-correlation-id';

// Create API client instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000, // 15 seconds
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

/**
 * Request interceptor
 * - Adds authentication token
 * - Adds correlation ID for request tracing
 * - Logs outgoing requests
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    // Generate correlation ID for request tracing
    const correlationId = uuidv4();
    if (config.headers) {
      config.headers[CORRELATION_HEADER] = correlationId;
    }

    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers[AUTH_HEADER] = `Bearer ${token}`;
    }

    // Log the request
    logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
      context: 'ApiClient',
      data: {
        correlationId,
        method: config.method?.toUpperCase(),
        url: config.url,
        params: config.params,
        // Don't log potentially sensitive body data
      },
    });

    return config;
  },
  (error) => {
    logger.error('API Request Error', { 
      context: 'ApiClient', 
      data: error 
    });
    return Promise.reject(error);
  }
);

/**
 * Response interceptor
 * - Formats response data consistently
 * - Handles authentication errors
 * - Logs responses and errors
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const correlationId = response.config.headers?.[CORRELATION_HEADER] as string;
    
    logger.debug(`API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      context: 'ApiClient',
      data: {
        correlationId,
        status: response.status,
        statusText: response.statusText,
        // Don't log full response data as it could be large
      },
    });
    
    // Return only the data portion
    return response.data;
  },
  (error) => {
    const correlationId = error.config?.headers?.[CORRELATION_HEADER] as string;
    
    if (axios.isAxiosError(error)) {
      // Extract API error message if available
      const errorMessage = error.response?.data?.message || error.message;
      const statusCode = error.response?.status;
      
      logger.error(`API Error: ${errorMessage}`, {
        context: 'ApiClient',
        data: {
          correlationId,
          status: statusCode,
          url: error.config?.url,
          method: error.config?.method?.toUpperCase(),
          message: errorMessage,
        },
      });
      
      // Handle authentication errors
      if (statusCode === 401) {
        // Only clear token if this is not a booking/payment related endpoint
        const isBookingRelated = error.config?.url?.includes('booking') || 
                                error.config?.url?.includes('payment');
        
        if (!isBookingRelated) {
          // Clear user data on unauthorized for non-booking endpoints
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          // Redirect to login if not already there
          const currentPath = window.location.pathname;
          if (currentPath !== '/auth' && currentPath !== '/auth/login') {
            logger.info('Session expired, redirecting to login', { 
              context: 'ApiClient'
            });
            window.location.href = '/auth';
          }
        }
      }
      
      // Return API error in a consistent format
      return Promise.reject({
        message: errorMessage,
        statusCode,
        data: error.response?.data,
        isAxiosError: true,
      });
    }
    
    // Handle network errors and other non-Axios errors
    logger.error('Network or other API error', {
      context: 'ApiClient',
      data: {
        correlationId,
        error: error.message,
      },
    });
    
    return Promise.reject({
      message: 'Network Error',
      isNetworkError: true,
      error,
    });
  }
);

export default apiClient; 