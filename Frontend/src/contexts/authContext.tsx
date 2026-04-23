import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import logger from '../lib/logger';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'customer' | 'admin';
  userType: 'owner' | 'customer' | 'admin';
  profileImage?: string;
  phone?: string;
  address?: string;
  gender?: 'male' | 'female' | 'other';
  dateOfBirth?: string;
  bio?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  roleMessage: string | null;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  register: (name: string, email: string, password: string, role: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  googleAuth: (tokenId: string, profileObj: any, rememberMe: boolean) => Promise<void>;
  clearError: () => void;
  clearRoleMessage: () => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start with true to prevent premature redirects
  const [error, setError] = useState<string | null>(null);
  const [roleMessage, setRoleMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  // Check if user is already logged in
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setIsLoading(true);
        logger.debug('Checking auth status', { context: 'AuthContext' });
        
        // Check both storage locations
        const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        if (storedUser && token) {
          setUser(JSON.parse(storedUser));
          logger.debug('Found stored user and token', { context: 'AuthContext' });
          
          // Verify token is still valid by fetching current user
          try {
            logger.debug('Verifying token validity', { context: 'AuthContext' });
            const userData = await authApi.getCurrentUser();
            if (userData && userData.user) {
              setUser(userData.user);
              // Keep the storage location same as where we found the token
              if (localStorage.getItem('token')) {
                localStorage.setItem('user', JSON.stringify(userData.user));
              } else {
                sessionStorage.setItem('user', JSON.stringify(userData.user));
              }
              logger.info('User session restored successfully', { 
                context: 'AuthContext',
                data: { userId: userData.user.id, role: userData.user.role }
              });
            } else {
              throw new Error('Invalid user data format');
            }
          } catch (error) {
            logger.error('Token validation failed', { context: 'AuthContext', data: error });
            // Clear both storages
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            setUser(null);
          }
        }
      } catch (error) {
        logger.error('Error checking auth status', { context: 'AuthContext', data: error });
        // Clear both storages
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        setUser(null);
      } finally {
        setIsLoading(false); // Always set loading to false when done
      }
    };

    checkAuthStatus();
  }, []);

  const handleApiError = (error: any) => {
    logger.error('API Error occurred', { context: 'AuthContext', data: error });
    
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return 'Đã xảy ra lỗi không xác định';
  };

  const login = async (email: string, password: string, rememberMe: boolean) => {
    setIsLoading(true);
    setError(null);
    setRoleMessage(null);
    try {
      logger.info('User attempting login', { context: 'AuthContext', data: { email } });
      const data = await authApi.login({ email, password });
      if (data && data.user && data.accessToken) {
        // Store token first
        if (rememberMe) {
          localStorage.setItem('token', data.accessToken);
        } else {
          sessionStorage.setItem('token', data.accessToken);
        }

        // Fetch complete user data including package information
        try {
          logger.debug('Fetching complete user data after login', { context: 'AuthContext' });
          const userDataResponse = await authApi.getCurrentUser();
          if (userDataResponse && userDataResponse.user) {
            setUser(userDataResponse.user);
            
            // Store complete user data based on rememberMe preference
            if (rememberMe) {
              localStorage.setItem('user', JSON.stringify(userDataResponse.user));
            } else {
              sessionStorage.setItem('user', JSON.stringify(userDataResponse.user));
            }

            logger.info('User login successful with complete data', { 
              context: 'AuthContext', 
              data: { 
                userId: userDataResponse.user.id, 
                role: userDataResponse.user.role, 
                rememberMe,
                hasPackageInfo: !!(userDataResponse.user as any).package_type
              } 
            });
          } else {
            // Fallback to login response data if getCurrentUser fails
            setUser(data.user);
            if (rememberMe) {
              localStorage.setItem('user', JSON.stringify(data.user));
            } else {
              sessionStorage.setItem('user', JSON.stringify(data.user));
            }
            logger.warn('Using fallback user data from login response', { context: 'AuthContext' });
          }
        } catch (fetchError) {
          // Fallback to login response data if getCurrentUser fails
          logger.warn('Failed to fetch complete user data, using login response', { 
            context: 'AuthContext', 
            data: fetchError 
          });
          setUser(data.user);
          if (rememberMe) {
            localStorage.setItem('user', JSON.stringify(data.user));
          } else {
            sessionStorage.setItem('user', JSON.stringify(data.user));
          }
        }
        
        // Use the common navigation function
        navigateByRole(data.user.role);
      } else {
        throw new Error('Định dạng dữ liệu không hợp lệ từ máy chủ');
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      logger.warn('Login failed', { context: 'AuthContext', data: { email, error: errorMessage } });
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, role: string, phone?: string) => {
    setIsLoading(true);
    setError(null);
    setRoleMessage(null);
    try {
      // Ensure role is lowercase to match backend expectations
      const formattedRole = role.toLowerCase();
      logger.info('User attempting registration', { 
        context: 'AuthContext', 
        data: { name, email, role: formattedRole } 
      });
      
      const data = await authApi.register({ name, email, password, role: formattedRole, phone });
      if (data && data.user) {
        logger.info('User registration successful', { 
          context: 'AuthContext', 
          data: { userId: data.user.id, role: data.user.role } 
        });
        // Don't set user or navigate - let the Register component handle the UI flow
        return data;
      } else {
        throw new Error('Định dạng dữ liệu không hợp lệ từ máy chủ');
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      logger.warn('Registration failed', { context: 'AuthContext', data: { email, error: errorMessage } });
      throw error; // Let the component handle the error display
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setRoleMessage(null);
    try {
      logger.info('User logging out', { context: 'AuthContext' });
      await authApi.logout();
      logger.info('Logout API call successful', { context: 'AuthContext' });
    } catch (error) {
      logger.error('Logout API error', { context: 'AuthContext', data: error });
    } finally {
      // Clear both storages
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('token');
      logger.info('User session cleared locally', { context: 'AuthContext' });
      setIsLoading(false);
      navigate('/auth');
    }
  };

  const getRoleName = (role: string) => {
    switch(role.toLowerCase()) {
      case 'customer': return 'Người dùng';
      case 'owner': return 'Chủ sân bóng';
      case 'admin': return 'Quản trị viên';
      default: return role;
    }
  };

  const navigateByRole = (role: string) => {
    switch(role.toLowerCase()) {
      case 'admin':
        navigate('/admin/dashboard');
        break;
      case 'owner':
        navigate('/owner/fields');
        break;
      default:
        navigate('/');
        break;
    }
  };

  const googleAuth = async (tokenId: string, profileObj: any) => {
    setIsLoading(true);
    setError(null);
    setRoleMessage(null);
    try {
      // Ensure role is lowercase to match backend expectations
      if (profileObj.role) {
        profileObj.role = profileObj.role.toLowerCase();
      }
      
      logger.info('Google authentication attempt', { 
        context: 'AuthContext',
        data: { email: profileObj.email, role: profileObj.role }
      });
      
      const data = await authApi.googleAuth({ tokenId, profileObj });
      
      // Check if the returned role is different from what was requested
      if (data.user && profileObj.role && data.user.role !== profileObj.role) {
        // Save user info but show a message about role
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Set role message that will be displayed on homepage
        const roleName = getRoleName(data.user.role);
        const requestedRoleName = getRoleName(profileObj.role);
        
        const roleMsg = `Bạn đã đăng nhập với vai trò ${roleName}. Hệ thống giữ nguyên vai trò đã đăng ký trước đó và không áp dụng vai trò ${requestedRoleName} mà bạn vừa chọn.`;
        setRoleMessage(roleMsg);
        
        logger.warn('Role mismatch during Google login', { 
          context: 'AuthContext',
          data: { 
            requestedRole: profileObj.role, 
            actualRole: data.user.role,
            message: roleMsg
          }
        });
        
        // Navigate based on actual role
        navigateByRole(data.user.role);
      } else if (data && data.user) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        logger.info('Google authentication successful', { 
          context: 'AuthContext', 
          data: { userId: data.user.id, role: data.user.role } 
        });
        // Navigate based on role
        navigateByRole(data.user.role);
      } else {
        throw new Error('Định dạng dữ liệu không hợp lệ từ máy chủ');
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      logger.warn('Google authentication failed', { 
        context: 'AuthContext', 
        data: { email: profileObj?.email, error: errorMessage } 
      });
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };
  
  const clearRoleMessage = () => {
    setRoleMessage(null);
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        roleMessage,
        login,
        register,
        logout,
        googleAuth,
        clearError,
        clearRoleMessage,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};