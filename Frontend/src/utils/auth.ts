/**
 * Utility functions for authentication
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

/**
 * Check if user is currently logged in
 */
export function isAuthenticated(): boolean {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  return !!(token && user);
}

/**
 * Get current user information
 */
export function getCurrentUser(): User | null {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
}

/**
 * Get authentication token
 */
export function getAuthToken(): string | null {
  return localStorage.getItem('token');
}

/**
 * Clear authentication data
 */
export function clearAuth(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

/**
 * Set authentication data
 */
export function setAuth(token: string, user: User): void {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

/**
 * Check if user has specific role
 */
export function hasRole(role: string): boolean {
  const user = getCurrentUser();
  return user?.role === role;
}

/**
 * Check if user is customer
 */
export function isCustomer(): boolean {
  return hasRole('customer');
}

/**
 * Check if user is owner
 */
export function isOwner(): boolean {
  return hasRole('owner');
}

/**
 * Check if user is admin
 */
export function isAdmin(): boolean {
  return hasRole('admin');
}
