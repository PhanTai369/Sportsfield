import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        toast.success('Link đặt lại mật khẩu đã được gửi đến email của bạn');
      } else {
        setError(data.message || 'Có lỗi xảy ra, vui lòng thử lại');
        toast.error(data.message || 'Có lỗi xảy ra, vui lòng thử lại');
      }
    } catch (error) {
      setError('Không thể kết nối đến server, vui lòng thử lại sau');
      toast.error('Không thể kết nối đến server, vui lòng thử lại sau');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm text-center">
          <div className="mb-4 text-green-500">
            <i className="fas fa-check-circle text-5xl"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Email đã được gửi!
          </h2>
          <p className="text-gray-600 mb-8">
            Chúng tôi đã gửi link đặt lại mật khẩu đến email {email}.<br />
            Vui lòng kiểm tra hộp thư của bạn và làm theo hướng dẫn.
          </p>
          <div className="space-y-4">
            <Button
              onClick={() => setSuccess(false)}
              variant="outline"
              className="w-full"
            >
              Gửi lại email
            </Button>
            <Button
              onClick={() => navigate('/auth')}
              className="w-full"
            >
              Quay lại đăng nhập
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          Quên mật khẩu
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Nhập email của bạn và chúng tôi sẽ gửi link đặt lại mật khẩu
        </p>
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
            <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
              Email
            </label>
            <div className="mt-2">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#16A34A] sm:text-sm sm:leading-6"
                placeholder="Nhập email của bạn"
              />
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
                  Đang gửi...
                </>
              ) : (
                'Gửi link đặt lại mật khẩu'
              )}
            </Button>
          </div>
        </form>

        <p className="mt-10 text-center text-sm text-gray-500">
          Đã nhớ mật khẩu?{' '}
          <Link to="/auth" className="font-semibold leading-6 text-[#16A34A] hover:text-[#15803D]">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
} 