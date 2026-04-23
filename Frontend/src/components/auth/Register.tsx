import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/authContext';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import jwtDecode from 'jwt-decode';
import { showToast } from '../../utils/toast';
import { toast } from 'sonner';

interface RegisterProps {
  onSwitchToLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ onSwitchToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('customer'); // Sử dụng giá trị 'customer' hoặc 'owner' theo đúng backend constants
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { register, googleAuth, error: authError, isLoading, user } = useAuth();
  const navigate = useNavigate();

  // Combine local and auth errors
  const error = localError || authError;

  useEffect(() => {
    // If user is already logged in, redirect to home page
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const validatePasswords = () => {
    if (password.length < 6) {
      setPasswordError('Mật khẩu phải có ít nhất 6 ký tự');
      return false;
    }
    if (confirmPassword && password !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp');
      return false;
    }
    setPasswordError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    
    // Basic validation
    if (!name.trim()) {
      setLocalError('Họ và tên không được để trống');
      return;
    }
    
    if (!email.trim()) {
      setLocalError('Email không được để trống');
      return;
    }
    
    if (!validatePasswords()) {
      return;
    }

    // Show loading toast
    const loadingToastId = showToast.loading('Đang xử lý đăng ký...', 'Vui lòng đợi trong giây lát');
    
    try {
      await register(name, email, password, role, phone);
      // Dismiss loading toast and show success
      toast.dismiss(loadingToastId);
      showToast.success(
        'Đăng ký thành công!', 
        'Vui lòng kiểm tra email để xác thực tài khoản của bạn. Bạn sẽ được chuyển đến trang đăng nhập sau 2 giây.'
      );
      // Switch to login view after short delay
      setTimeout(() => {
        onSwitchToLogin();
      }, 2000);
    } catch (error) {
      // Dismiss loading toast and show error
      toast.dismiss(loadingToastId);
      if (error instanceof Error) {
        showToast.error('Đăng ký thất bại', error.message);
      }
      console.error("Registration submission error:", error);
    }
  };

  const handleGoogleRegisterSuccess = async (credentialResponse: any) => {
    try {
      console.log('Google registration success:', credentialResponse);
      if (!credentialResponse.credential) {
        setLocalError('Không nhận được thông tin đăng ký từ Google');
        return;
      }
      
      const decoded: any = jwtDecode(credentialResponse.credential);
      console.log('Decoded token:', decoded);
        const profileObj = {
        email: decoded.email,
        name: decoded.name,
        imageUrl: decoded.picture,
        googleId: decoded.sub,
        role: role.toLowerCase() // Ensure role is lowercase
      };
      
      console.log('Sending Google auth data with role:', role.toLowerCase());
      await googleAuth(credentialResponse.credential, profileObj, false);
    } catch (error) {
      console.error("Google registration error:", error);
      setLocalError('Đăng ký Google thất bại. Vui lòng thử lại.');
    }
  };

  const handleGoogleRegisterError = () => {
    console.error("Google registration failed");
    setLocalError('Đăng ký Google thất bại. Vui lòng thử lại.');
  };

  const clearLocalErrors = () => {
    setLocalError(null);
    setPasswordError(null);
  };

  return (
    <div className="transition-all duration-500 transform translate-x-0 opacity-100 animate-fadeIn">
      {error && (
        <div className="bg-red-50 text-red-600 p-2 rounded-lg mb-3 text-sm animate-slideIn">
          <i className="fas fa-exclamation-circle mr-2"></i>
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="transform transition-all duration-300 mb-3">
          <label htmlFor="user-type" className="block text-sm font-medium text-gray-700 mb-1">Chọn loại tài khoản</label>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              type="button"
              onClick={() => setRole('customer')}
              className={`flex items-center justify-center p-2 border rounded-lg transition-all duration-300 transform hover:scale-[1.02] ${
                role === 'customer'
                  ? 'border-[#16A34A] bg-green-50 text-[#16A34A]'
                  : 'border-gray-300 hover:border-[#16A34A] hover:bg-green-50'
              }`}
            >
              <i className={`fas fa-user mr-1.5 ${role === 'customer' ? 'animate-bounce' : ''}`}></i>
              <span className="text-sm">Người dùng</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('owner')}
              className={`flex items-center justify-center p-2 border rounded-lg transition-all duration-300 transform hover:scale-[1.02] ${
                role === 'owner'
                  ? 'border-[#16A34A] bg-green-50 text-[#16A34A]'
                  : 'border-gray-300 hover:border-[#16A34A] hover:bg-green-50'
              }`}
            >
              <i className={`fas fa-futbol mr-1.5 ${role === 'owner' ? 'animate-bounce' : ''}`}></i>
              <span className="text-sm">Chủ sân bóng</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1 italic">
            <i className="fas fa-exclamation-circle mr-1"></i>
            Quan trọng: Sau khi đăng ký, bạn không thể thay đổi vai trò. Vui lòng chọn cẩn thận.
          </p>
        </div>
        
        <div className="flex justify-center w-full mb-2">
          <GoogleLogin
            onSuccess={handleGoogleRegisterSuccess}
            onError={handleGoogleRegisterError}
            theme="outline"
            size="large"
            width="100%"
            context="signup"
            text="signup_with"
            shape="rectangular"
            logo_alignment="center"
          />
        </div>
        <div className="flex items-center my-3">
          <div className="flex-grow h-px bg-gray-300"></div>
          <span className="px-4 text-sm text-gray-500">Hoặc</span>
          <div className="flex-grow h-px bg-gray-300"></div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="transform transition-all duration-300 hover:translate-y-[-2px]">
            <label htmlFor="register-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-envelope text-gray-400"></i>
              </div>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearLocalErrors();
                }}
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-transparent text-sm transition-all duration-300"
                placeholder="Email của bạn"
                required
              />
            </div>
          </div>
          
          <div className="transform transition-all duration-300 hover:translate-y-[-2px]">
            <label htmlFor="register-name" className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-user text-gray-400"></i>
              </div>
              <input
                id="register-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearLocalErrors();
                }}
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-transparent text-sm transition-all duration-300"
                placeholder="Họ và tên"
                required
              />
            </div>
          </div>
        </div>
        
        <div className="transform transition-all duration-300 hover:translate-y-[-2px]">
          <label htmlFor="register-phone" className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="fas fa-phone text-gray-400"></i>
            </div>
            <input
              id="register-phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                clearLocalErrors();
              }}
              className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-transparent text-sm transition-all duration-300"
              placeholder="Số điện thoại của bạn"
            />
          </div>
        </div>
        
        <div className="transform transition-all duration-300 hover:translate-y-[-2px]">
          <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="fas fa-lock text-gray-400"></i>
            </div>
            <input
              id="register-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearLocalErrors();
              }}
              onBlur={() => {
                if (confirmPassword) validatePasswords();
              }}
              className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-transparent text-sm transition-all duration-300"
              placeholder="Mật khẩu"
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
        <div className="transform transition-all duration-300 hover:translate-y-[-2px]">
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="fas fa-lock text-gray-400"></i>
            </div>
            <input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                clearLocalErrors();
              }}
              onBlur={() => {
                if (password) validatePasswords();
              }}
              className={`w-full pl-10 pr-10 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-transparent text-sm transition-all duration-300 ${
                passwordError ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Xác nhận mật khẩu"
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} text-gray-400`}></i>
            </button>
          </div>
          {passwordError && (
            <p className="text-red-500 text-xs mt-1 animate-slideIn">{passwordError}</p>
          )}
        </div>
        <div className="flex items-start mt-2 transform transition-all duration-300">
          <div className="flex items-center h-5">
            <input
              id="terms"
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="h-4 w-4 text-[#16A34A] focus:ring-[#16A34A] border-gray-300 rounded cursor-pointer"
              required
            />
          </div>
          <label htmlFor="terms" className="ml-2 block text-sm text-gray-700 cursor-pointer">
            Tôi đồng ý với <a href="#" className="text-[#16A34A] hover:text-green-700 transition-colors duration-300">Điều khoản dịch vụ</a> và <a href="#" className="text-[#16A34A] hover:text-green-700 transition-colors duration-300">Chính sách bảo mật</a>
          </label>
        </div>
        <button
          type="submit"
          disabled={isLoading || !termsAccepted}
          className={`w-full py-2.5 px-4 bg-[#16A34A] text-white font-medium rounded-lg transition duration-300 flex items-center justify-center mt-2 transform hover:translate-y-[-2px] hover:shadow-md ${
            !termsAccepted ? 'opacity-60 cursor-not-allowed' : 'hover:bg-green-700 cursor-pointer'
          }`}
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
            'Đăng ký'
          )}
        </button>
      </form>
      <p className="text-center text-gray-600 mt-4 animate-fadeIn">
        <span>Đã có tài khoản? <button onClick={onSwitchToLogin} className="text-[#16A34A] hover:text-green-700 font-medium cursor-pointer transition-colors duration-300">Đăng nhập</button></span>
      </p>
    </div>
  );
};

export default Register; 