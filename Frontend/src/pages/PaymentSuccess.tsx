import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Calendar, Clock, Home, MapPin, User, Mail, ArrowRight, Loader2, CreditCard, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { paymentService, BookingSessionResponse } from '../services/payment.service';
import Navbar from '../components/home/navbar';
import Footer from '../components/home/footer';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const bookingId = searchParams.get('booking_id');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState<BookingSessionResponse | null>(null);
  const [continuePaymentLoading, setContinuePaymentLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Function to sync payment status with Stripe
  const syncPaymentStatus = async (bookingId: string) => {
    try {
      setSyncing(true);
      console.log('Syncing payment status for booking:', bookingId);
      const result = await paymentService.syncPaymentStatus(bookingId);
      
      if (result.success && result.booking) {
        console.log('Payment status synced successfully:', result.booking);
        setBookingData(result.booking);
        return result.booking;
      } else {
        console.log('Payment status sync completed, no changes needed');
        return null;
      }
    } catch (err: any) {
      console.error('Error syncing payment status:', err);
      // Don't show error to user for sync failures, just log it
      return null;
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const fetchBookingData = async () => {
      if (!sessionId && !bookingId) {
        setError('Không tìm thấy thông tin phiên thanh toán hoặc mã đặt sân');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        let data;
        
        if (sessionId) {
          console.log('Đang lấy thông tin booking từ session ID:', sessionId);
          data = await paymentService.getBookingBySessionId(sessionId);
        } else if (bookingId) {
          console.log('Đang lấy thông tin booking từ booking ID:', bookingId);
          data = await paymentService.getBookingById(bookingId);
        }
        
        console.log('Đã lấy thông tin booking thành công:', data);
        setBookingData(data);
        
        // If payment status is pending or we just came from Stripe checkout,
        // try to sync payment status with Stripe
        if (data && (data.paymentStatus === 'payment_pending' || sessionId)) {
          console.log('Payment status is pending or we have session ID, attempting to sync...');
          const syncedData = await syncPaymentStatus(data.id);
          // syncedData will be null if no update needed, bookingData is already set above
        }
        
      } catch (err: any) {
        console.error('Lỗi khi lấy thông tin booking:', err);
        setError(err.message || 'Đã xảy ra lỗi khi lấy thông tin đặt sân');
      } finally {
        setLoading(false);
      }
    };

    fetchBookingData();
  }, [sessionId, bookingId]);
  
  // Hàm để tiếp tục thanh toán cho bookings có trạng thái pending
  const handleContinuePayment = async () => {
    if (!bookingData?.id) return;
    
    try {
      setContinuePaymentLoading(true);
      console.log('Đang tạo lại phiên thanh toán cho booking ID:', bookingData.id);
      
      const result = await paymentService.continuePaymentForBooking(bookingData.id);
      
      // Hiển thị thông báo thành công trước khi chuyển hướng
      const successMessage = document.createElement('div');
      successMessage.innerHTML = `
        <div style="position: fixed; top: 20px; left: 50%; transform: translateX(-50%); 
                    background: #d1fae5; color: #065f46; padding: 16px; border-radius: 8px; 
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 9999; text-align: center;">
          <p style="margin: 0; font-weight: 500;">Đang chuyển đến trang thanh toán...</p>
        </div>
      `;
      document.body.appendChild(successMessage);
      
      // Chuyển hướng đến trang thanh toán Stripe
      setTimeout(() => {
        window.location.href = result.checkout_url;
      }, 1500);
      
    } catch (err: any) {
      console.error('Lỗi khi tạo lại phiên thanh toán:', err);
      setError(err.message || 'Đã xảy ra lỗi khi tạo lại phiên thanh toán');
      setContinuePaymentLoading(false);
    }
  };
  
  // Nếu trạng thái thanh toán đã hoàn thành, chuyển đến trang xác nhận đặt sân
  useEffect(() => {
    if (bookingData && bookingData.paymentStatus === 'paid') {
      // Chuyển hướng người dùng đến trang xác nhận đặt sân
      console.log('Payment completed, redirecting to booking confirmation page');
      window.location.href = `/booking/confirmation?booking_id=${bookingData.id}`;
    }
  }, [bookingData]);

  // Format currency
  const formatCurrency = (amount: number | string): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('vi-VN').format(numAmount);
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long', 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric'
    });
  };

  // Format time 
  const formatTime = (timeString: string): string => {
    return timeString.substring(0, 5);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-green-600 mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              {syncing ? 'Đang đồng bộ trạng thái thanh toán...' : 'Đang xác nhận thanh toán...'}
            </h2>
            <p className="text-gray-600">
              {syncing 
                ? 'Chúng tôi đang kiểm tra trạng thái thanh toán với Stripe để đảm bảo thông tin chính xác.'
                : 'Vui lòng chờ trong giây lát khi chúng tôi xác nhận thông tin đặt sân của bạn.'
              }
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !bookingData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Có lỗi xảy ra</h2>
              <p className="text-gray-600">{error || 'Không thể tải thông tin đặt sân. Vui lòng thử lại sau.'}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/">
                <Button className="w-full">
                  <Home className="mr-2 h-4 w-4" />
                  Về trang chủ
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Generate time slots display
  const timeSlotDisplay = bookingData.timeSlots.map((slot, index) => (
    <span 
      key={index}
      className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded text-sm font-medium mr-2 mb-2"
    >
      {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
    </span>
  )).join(', ');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Đặt sân thành công!</h1>
            <p className="text-gray-600">Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi.</p>
          </div>

          <div className="mb-6">
            <div className="bg-green-50 rounded-lg p-4 flex items-center gap-3">
              <Calendar className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="font-medium text-gray-900">Mã đặt sân</h3>
                <p className="text-gray-700 font-mono bg-gray-100 px-2 py-1 rounded">#{bookingData.id}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 border-l-4 border-green-500 pl-3">
                Chi tiết đặt sân
              </h2>
              
              <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Sân bóng:</p>
                    <p className="font-medium text-gray-800">
                      {bookingData.field.name || 'Không có thông tin'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Ngày đặt:</p>
                    <p className="font-medium text-gray-800">
                      {formatDate(bookingData.bookingDate)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <Clock className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Khung giờ:</p>
                    <div className="flex flex-wrap mt-1">
                      {bookingData.timeSlots.map((slot, index) => (
                        <span 
                          key={index}
                          className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium mr-2 mb-2"
                        >
                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 border-l-4 border-blue-500 pl-3">
                Thông tin khách hàng
              </h2>
              
              <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-blue-50">
                <div className="flex items-start gap-2">
                  <User className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Họ tên:</p>
                    <p className="font-medium text-gray-800">
                      {bookingData.customerInfo.name || 'Không có thông tin'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <Mail className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Email:</p>
                    <p className="font-medium text-gray-800">
                      {bookingData.customerInfo.email || 'Không có thông tin'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 border-l-4 border-yellow-500 pl-3">
                Thông tin thanh toán
              </h2>
              
              <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-yellow-50">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Tổng tiền:</span>
                  <span className="font-bold text-green-600">{formatCurrency(bookingData.totalPrice)}đ</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Trạng thái:</span>
                  {bookingData.paymentStatus === 'paid' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Đã thanh toán
                    </span>
                  ) : bookingData.paymentStatus === 'pending' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Chờ thanh toán
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Chưa thanh toán
                    </span>
                  )}
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Phương thức:</span>
                  <span className="text-gray-800">Stripe</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {bookingData.paymentStatus === 'pending' && (
              <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-yellow-800">Thanh toán chưa hoàn tất</h4>
                    <p className="text-sm text-yellow-700 mb-4">
                      Đặt sân của bạn đã được ghi nhận, nhưng thanh toán chưa hoàn tất. Vui lòng tiếp tục thanh toán để xác nhận đặt sân.
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleContinuePayment} 
                        disabled={continuePaymentLoading}
                        className="bg-yellow-600 hover:bg-yellow-700"
                      >
                        {continuePaymentLoading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Đang xử lý...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            Tiếp tục thanh toán
                          </div>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {bookingData.paymentStatus === 'payment_pending' && (
              <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-800">Thanh toán đang được xử lý</h4>
                    <p className="text-sm text-blue-700 mb-4">
                      Chúng tôi đã nhận được thông tin thanh toán và đang xử lý. Nếu trạng thái này kéo dài, bạn có thể thử làm mới trạng thái thanh toán.
                    </p>
                    <Button 
                      onClick={() => syncPaymentStatus(bookingData.id)} 
                      disabled={syncing}
                      variant="outline"
                      className="border-blue-300 text-blue-700 hover:bg-blue-100"
                    >
                      {syncing ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Đang kiểm tra...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Kiểm tra trạng thái thanh toán
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="p-4 border border-gray-200 rounded-lg bg-blue-50 text-sm text-blue-800">
              <p><strong>Lưu ý:</strong> Vui lòng đến sân đúng giờ. Nếu bạn cần hủy hoặc thay đổi lịch đặt sân, vui lòng liên hệ với chúng tôi ít nhất 24 giờ trước giờ đặt sân.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link to="/" className="flex-1">
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  <Home className="mr-2 h-4 w-4" />
                  Về trang chủ
                </Button>
              </Link>
              
              <Link to="/fields" className="flex-1">
                <Button variant="outline" className="w-full">
                  Đặt sân khác
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}