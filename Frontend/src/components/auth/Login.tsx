import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/authContext';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import jwtDecode from 'jwt-decode';
import axios from 'axios';
import { showToast } from '../../utils/toast';
import { authApi } from '../../lib/api';
import { toast } from 'sonner';

interface LoginProps {
  onSwitchToRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState('customer');
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, googleAuth, error: authError, isLoading, user } = useAuth();
  const navigate = useNavigate();

  const error = localError || authError;

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    // Kiểm tra nếu lỗi là chưa xác thực email
    if (error?.includes('verify your email') || error?.includes('xác thực email')) {
      setShowResendVerification(true);
    } else {
      setShowResendVerification(false);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    
    // Basic validation
    if (!email.trim()) {
      setLocalError('Email không được để trống');
      return;
    }
    
    if (!password) {
      setLocalError('Mật khẩu không được để trống');
      return;
    }
    
    try {
      await login(email, password, rememberMe);
    } catch (error) {
      console.error('Login submission error:', error);
      // Error is already handled in authContext
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      showToast.error('Lỗi', 'Vui lòng nhập email của bạn');
      return;
    }

    try {
      setIsResending(true);
      const loadingToastId = toast.loading('Đang gửi lại email xác thực...');
      
      const response = await authApi.resendVerification(email);
      
      // Dismiss loading toast
      toast.dismiss(loadingToastId);
      
      if (response.success) {
        showToast.success(
          'Gửi email thành công',
          'Email xác thực đã được gửi lại. Vui lòng kiểm tra hộp thư của bạn và làm theo hướng dẫn.'
        );
        // Hide resend verification UI after successful resend
        setShowResendVerification(false);
      }
    } catch (error: any) {
      console.error('Error resending verification email:', error);
      showToast.error(
        'Không thể gửi lại email',
        error.message || 'Đã có lỗi xảy ra. Vui lòng thử lại sau.'
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleGoogleLoginSuccess = async (credentialResponse: any) => {
    try {
      console.log('Google login success:', credentialResponse);
      if (!credentialResponse.credential) {
        setLocalError('Không nhận được thông tin đăng nhập từ Google');
        return;
      }
      
      const decoded: any = jwtDecode(credentialResponse.credential);
      console.log('Decoded token:', decoded);

      // Kiểm tra tài khoản đã tồn tại chưa
      try {
        const checkResponse = await axios.post(`${import.meta.env.VITE_API_URL}/auth/check-google-account`, {
          email: decoded.email
        });

        if (checkResponse.data.success) {
          const existingUser = checkResponse.data.data;
          console.log('Existing user:', existingUser);
          
          // Kiểm tra role và hiển thị thông báo phù hợp
          if (existingUser.role === 'owner' && selectedRole !== 'owner') {
            setLocalError('Tài khoản này đã đăng ký với vai trò Chủ sân bóng. Vui lòng chọn vai trò Chủ sân bóng để đăng nhập.');
            return;
          }
          
          if (existingUser.role === 'customer' && selectedRole !== 'customer') {
            setLocalError('Tài khoản này đã đăng ký với vai trò Người dùng. Vui lòng chọn vai trò Người dùng để đăng nhập.');
            return;
          }

          // Role khớp, tiếp tục đăng nhập
          const profileObj = {
            email: decoded.email,
            name: decoded.name,
            imageUrl: decoded.picture,
            googleId: decoded.sub,
            role: existingUser.role // Sử dụng role đã tồn tại
          };
          
          await googleAuth(credentialResponse.credential, profileObj, rememberMe);
        }
      } catch (error: any) {
        if (error.response?.status === 404) {
          // Tài khoản chưa tồn tại, tiếp tục đăng ký mới
          const profileObj = {
            email: decoded.email,
            name: decoded.name,
            imageUrl: decoded.picture,
            googleId: decoded.sub,
            role: selectedRole
          };
          
          await googleAuth(credentialResponse.credential, profileObj,true);
        } else {
          console.error('Error checking Google account:', error);
          setLocalError('Có lỗi xảy ra khi kiểm tra tài khoản. Vui lòng thử lại sau.');
        }
      }
    } catch (error) {
      console.error("Google login error:", error);
      setLocalError('Đăng nhập Google thất bại. Vui lòng thử lại.');
    }
  };

  const handleGoogleLoginError = () => {
    console.error("Google login failed");
    setLocalError('Đăng nhập Google thất bại. Vui lòng thử lại.');
  };

  return (
    <div className="transition-all duration-500 transform translate-x-0 opacity-100 animate-fadeIn">
      {error && (
        <div className="bg-red-50 text-red-600 p-2 rounded-lg mb-3 text-sm animate-slideIn">
          <i className="fas fa-exclamation-circle mr-2"></i>
          {error}
        </div>
      )}
      
      {showResendVerification && (
        <div className="bg-yellow-50 border border-yellow-400 text-yellow-800 p-3 rounded-lg mb-3 text-sm animate-slideIn">
          <div className="flex flex-col space-y-2">
            <p className="flex items-center">          
            </p>
            <button
              onClick={handleResendVerification}
              disabled={isResending}
              className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 py-1.5 px-3 rounded-md text-sm font-medium transition-colors duration-300 flex items-center justify-center"
            >
              {isResending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Đang gửi...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane mr-2"></i>
                  Gửi lại email xác thực
                </>
              )}
            </button>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò đăng nhập</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSelectedRole('customer')}
              className={`flex items-center justify-center p-2 border rounded-lg transition-all duration-300 transform hover:scale-[1.02] ${
                selectedRole === 'customer'
                  ? 'border-[#16A34A] bg-green-50 text-[#16A34A]'
                  : 'border-gray-300 hover:border-[#16A34A] hover:bg-green-50'
              }`}
            >
              <i className={`fas fa-user mr-1.5 ${selectedRole === 'customer' ? 'animate-bounce' : ''}`}></i>
              <span className="text-sm">Người dùng</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('owner')}
              className={`flex items-center justify-center p-2 border rounded-lg transition-all duration-300 transform hover:scale-[1.02] ${
                selectedRole === 'owner'
                  ? 'border-[#16A34A] bg-green-50 text-[#16A34A]'
                  : 'border-gray-300 hover:border-[#16A34A] hover:bg-green-50'
              }`}
            >
              <i className={`fas fa-futbol mr-1.5 ${selectedRole === 'owner' ? 'animate-bounce' : ''}`}></i>
              <span className="text-sm">Chủ sân bóng</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1 italic">
            <i className="fas fa-info-circle mr-1"></i>
            Chọn đúng vai trò của tài khoản để đăng nhập. Nếu chọn sai vai trò, bạn sẽ không thể đăng nhập.
          </p>
        </div>
        
        <div className="flex justify-center w-full mb-2">
          <GoogleLogin
            onSuccess={handleGoogleLoginSuccess}
            onError={handleGoogleLoginError}
            theme="outline"
            size="large"
            width="100%"
            context="signin"
          />
        </div>
        <div className="flex items-center my-3">
          <div className="flex-grow h-px bg-gray-300"></div>
          <span className="px-4 text-sm text-gray-500">Hoặc</span>
          <div className="flex-grow h-px bg-gray-300"></div>
        </div>
        <div className="transform transition-all duration-300 hover:translate-y-[-2px]">
          <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="fas fa-user text-gray-400"></i>
            </div>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setLocalError(null);
              }}
              className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-transparent text-sm transition-all duration-300"
              placeholder="Nhập email"
              required
            />
          </div>
        </div>
        <div className="transform transition-all duration-300 hover:translate-y-[-2px]">
          <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="fas fa-lock text-gray-400"></i>
            </div>
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setLocalError(null);
              }}
              className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-transparent text-sm transition-all duration-300"
              placeholder="Nhập mật khẩu"
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-gray-400`}></i>
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-[#16A34A] focus:ring-[#16A34A] border-gray-300 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
              Ghi nhớ đăng nhập
            </label>
          </div>
          <div className="text-sm">
            <Link to="/forgot-password" className="font-medium text-[#16A34A] hover:text-[#15803D]">
              Quên mật khẩu?
            </Link>
          </div>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-[#16A34A] hover:bg-green-700 text-white font-medium rounded-lg transition duration-300 cursor-pointer whitespace-nowrap flex items-center justify-center transform hover:translate-y-[-2px] hover:shadow-md"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Đang xử lý...
            </>
          ) : (
            'Đăng nhập'
          )}
        </button>
      </form>
      <p className="text-center text-gray-600 mt-4 animate-fadeIn">
        <span>Chưa có tài khoản? <button onClick={onSwitchToRegister} className="text-[#16A34A] hover:text-green-700 font-medium cursor-pointer transition-colors duration-300">Đăng ký ngay</button></span>
      </p>
    </div>
  );
};

export default Login; 