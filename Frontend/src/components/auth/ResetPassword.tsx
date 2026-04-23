import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';

export default function ResetPassword() {
  const { token } = useParams();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return 'Mật khẩu phải có ít nhất 8 ký tự';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Mật khẩu phải có ít nhất 1 chữ hoa';
    }
    if (!/[a-z]/.test(password)) {
      return 'Mật khẩu phải có ít nhất 1 chữ thường';
    }
    if (!/[0-9]/.test(password)) {
      return 'Mật khẩu phải có ít nhất 1 số';
    }
    if (!/[!@#$%^&*]/.test(password)) {
      return 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt (!@#$%^&*)';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate password
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setError(passwordError);
      toast.error(passwordError);
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);

    try {
      console.log('Resetting password with token:', token);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword: formData.password,
        }),
      });

      const data = await response.json();
      console.log('Reset password response:', data);

      if (response.ok) {
        toast.success('Đặt lại mật khẩu thành công');
        navigate('/auth');
      } else {
        if (data.message?.toLowerCase().includes('token')) {
          // Token invalid/expired
          setError('Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
          toast.error('Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
        } else {
          setError(data.message || 'Có lỗi xảy ra, vui lòng thử lại');
          toast.error(data.message || 'Có lỗi xảy ra, vui lòng thử lại');
        }
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      setError('Không thể kết nối đến server');
      toast.error('Không thể kết nối đến server');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Clear error when user types
  };

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          Đặt lại mật khẩu
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 text-red-600 text-sm">
            <i className="fas fa-exclamation-circle mr-2"></i>
            {error}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900">
              Mật khẩu mới
            </label>
            <div className="mt-2 relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                value={formData.password}
                onChange={handleChange}
                className="block w-full rounded-md border-0 py-1.5 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#16A34A] sm:text-sm sm:leading-6"
                placeholder="Nhập mật khẩu mới"
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

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium leading-6 text-gray-900">
              Xác nhận mật khẩu
            </label>
            <div className="mt-2 relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="block w-full rounded-md border-0 py-1.5 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#16A34A] sm:text-sm sm:leading-6"
                placeholder="Nhập lại mật khẩu mới"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} text-gray-400`}></i>
              </button>
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-md bg-[#16A34A] px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-[#15803D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16A34A]"
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Đang xử lý...
                </>
              ) : (
                'Đặt lại mật khẩu'
              )}
            </Button>
          </div>
        </form>

        <div className="mt-6">
          <p className="text-sm text-gray-600">
            Mật khẩu phải có:
          </p>
          <ul className="mt-2 text-sm text-gray-600 space-y-1">
            <li className="flex items-center">
              <i className="fas fa-check-circle text-green-500 mr-2"></i>
              Ít nhất 8 ký tự
            </li>
            <li className="flex items-center">
              <i className="fas fa-check-circle text-green-500 mr-2"></i>
              Ít nhất 1 chữ hoa
            </li>
            <li className="flex items-center">
              <i className="fas fa-check-circle text-green-500 mr-2"></i>
              Ít nhất 1 chữ thường
            </li>
            <li className="flex items-center">
              <i className="fas fa-check-circle text-green-500 mr-2"></i>
              Ít nhất 1 số
            </li>
            <li className="flex items-center">
              <i className="fas fa-check-circle text-green-500 mr-2"></i>
              Ít nhất 1 ký tự đặc biệt (!@#$%^&*)
            </li>
          </ul>
        </div>

        <div className="mt-6 text-center">
          <Button
            type="button"
            variant="link"
            onClick={() => navigate('/forgot-password')}
            className="text-[#16A34A] hover:text-[#15803D]"
          >
            Yêu cầu link mới
          </Button>
        </div>
      </div>
    </div>
  );
} 