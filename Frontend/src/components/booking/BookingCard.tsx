import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, MapPin, Calendar, Clock, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { BookingCardProps, formatRemainingTime } from '../../types/booking';
import { formatCurrencyValue } from '../../utils/shared/currencyUtils';
import { getStatusColor, getStatusText, getStatusWithCountdown } from '../../utils/shared/bookingStatusUtils';
import { CancelBookingModal } from './CancelBookingModal';
import { Notification } from '../ui/Notification';
import { bookingHistoryService } from '../../services/bookingHistoryService';
import { paymentService } from '../../services/payment.service';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config/api';


function ReviewModalPopup({ open, onClose, bookingId, onSuccess }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState([]); // new images (File[])
  const [oldImages, setOldImages] = useState([]); // old image URLs from DB
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Fetch old review images if exists
  useEffect(() => {
    if (!open || !bookingId) return;
    // Fetch review by bookingId to get old images
    const fetchReview = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/reviews/by-booking?booking_id=${bookingId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data && data.data && data.data.images) {
          setOldImages(data.data.images);
        } else {
          setOldImages([]);
        }
      } catch {
        setOldImages([]);
      }
    };
    fetchReview();
  }, [open, bookingId]);

  const handleImageChange = (e) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).slice(0, 3 - oldImages.length);
    setImages(files);
  };

  const handleRemoveOldImage = (idx) => {
    setOldImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleRemoveNewImage = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('booking_id', bookingId);
      formData.append('rating', rating.toString());
      formData.append('comment', comment);
      images.forEach((img) => formData.append('images', img));
      // Gửi danh sách ảnh cũ cần giữ lại (nếu có)
      formData.append('oldImages', JSON.stringify(oldImages));
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/reviews/by-booking`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Đánh giá thành công!');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error(data.message || 'Lỗi khi tạo/cập nhật đánh giá!');
      }
    } catch (err) {
      toast.error('Lỗi khi tạo/cập nhật đánh giá!');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Đánh giá sân</h2>
        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-2 mb-4">
            {[1,2,3,4,5].map((star) => (
              <button
                type="button"
                key={star}
                onClick={() => setRating(star)}
                className="focus:outline-none group"
                tabIndex={0}
                aria-label={`Đánh giá ${star} sao`}
              >
                <Star
                  size={32}
                  className={`transition-transform duration-150 ${star <= rating ? 'text-yellow-400 fill-yellow-400 scale-110 drop-shadow-lg' : 'text-gray-300'} group-hover:scale-125 group-active:scale-95`}
                  fill={star <= rating ? '#facc15' : 'none'}
                  strokeWidth={star <= rating ? 0 : 1.5}
                />
              </button>
            ))}
          </div>
          <textarea
            className="w-full border rounded p-2 mb-4"
            rows={3}
            placeholder="Nhập nhận xét của bạn (tối đa 500 ký tự)"
            value={comment}
            onChange={e => setComment(e.target.value)}
            maxLength={500}
            required
          />
          {/* Hiển thị ảnh cũ */}
          {(oldImages.length > 0) && (
            <div className="flex gap-2 mb-2">
              {oldImages.map((url, idx) => (
                <div key={idx} className="relative w-20 h-20">
                  <img src={url} alt="old-review-img" className="w-full h-full object-cover rounded" />
                  <button type="button" className="absolute top-0 right-0 bg-white rounded-full p-1 text-xs" onClick={() => handleRemoveOldImage(idx)}>&times;</button>
                </div>
              ))}
            </div>
          )}
          {/* Hiển thị ảnh mới */}
          {(images.length > 0) && (
            <div className="flex gap-2 mb-2">
              {images.map((file, idx) => (
                <div key={idx} className="relative w-20 h-20">
                  <img src={URL.createObjectURL(file)} alt="new-review-img" className="w-full h-full object-cover rounded" />
                  <button type="button" className="absolute top-0 right-0 bg-white rounded-full p-1 text-xs" onClick={() => handleRemoveNewImage(idx)}>&times;</button>
                </div>
              ))}
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            disabled={oldImages.length + images.length >= 3}
          />
          <div className="text-xs text-gray-500 mt-1 mb-2">Tối đa 3 ảnh, mỗi ảnh tối đa 5MB.</div>
          {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" className="px-4 py-2 border rounded" onClick={onClose} disabled={isSubmitting}>Hủy</button>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded" disabled={isSubmitting}>
              {isSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function BookingCard({ booking, isExpanded, onToggleExpand }: BookingCardProps) {
  const navigate = useNavigate();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  } | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  
  // State for countdown timer
  const [currentRemainingSeconds, setCurrentRemainingSeconds] = useState(booking.remainingSeconds || 0);
  const [isExpired, setIsExpired] = useState(false);
  
  // Update countdown every second for pending bookings
  useEffect(() => {
    if (booking.status === 'pending' && currentRemainingSeconds > 0 && !isExpired) {
      const timer = setInterval(() => {
        setCurrentRemainingSeconds(prev => {
          if (prev <= 1) {
            // Time's up - booking should be auto-cancelled
            setIsExpired(true);
            toast.error('Thời gian thanh toán đã hết hạn. Booking sẽ được hủy tự động trong vòng 2 phút.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [booking.status, currentRemainingSeconds, isExpired]);
  
  // Reset countdown when booking changes
  useEffect(() => {
    setCurrentRemainingSeconds(booking.remainingSeconds || 0);
    setIsExpired(false);
  }, [booking.remainingSeconds]);

  // Helper functions to safely display data
  const getLocationDisplay = (location: any): string => {
    if (!location) return 'Không xác định';
    if (typeof location === 'string') return location;
    if (typeof location === 'object') {
      // Handle [object Object] case by returning a fallback
      return 'Không xác định';
    }
    return String(location);
  };

  const getFieldNameDisplay = (fieldName: any): string => {
    if (!fieldName) return 'Sân không xác định';
    if (typeof fieldName === 'string') return fieldName;
    return 'Sân không xác định';
  };

  const getTimeSlotDisplay = (timeSlot: any): string => {
    if (!timeSlot) return 'Không xác định';
    if (typeof timeSlot === 'string') return timeSlot;
    if (Array.isArray(timeSlot)) return timeSlot.join(', ');
    return 'Không xác định';
  };

  // Direct payment handler that goes straight to Stripe
  const handleDirectPayment = async () => {
    console.log('🚀 handleDirectPayment called for booking:', booking.id);
    
    const token = localStorage.getItem('token');
    console.log('🔑 Token exists:', !!token);
    console.log('🔑 Token preview:', token?.substring(0, 50) + '...');
    
    setIsLoading(true);
    try {
      console.log('📞 Calling paymentService.continuePaymentForBooking...');
      // Create Stripe checkout session for existing booking payment
      const result = await paymentService.continuePaymentForBooking(booking.id);

      if (result.checkout_url) {
        console.log('✅ Got checkout URL, redirecting to:', result.checkout_url);
        // Redirect directly to Stripe Checkout
        window.location.href = result.checkout_url;
      } else {
        throw new Error('Không thể tạo phiên thanh toán');
      }
    } catch (error: any) {
      console.error('❌ Error creating Stripe session:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error data:', error.response?.data);
      
      // Display specific error message
      let errorMessage = 'Có lỗi xảy ra khi tạo phiên thanh toán. Vui lòng thử lại.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
        console.error('❌ Backend error message:', error.response.data.message);
      } else if (error.message) {
        errorMessage = error.message;
        console.error('❌ Error message:', error.message);
      }
      
      // Handle specific booking status errors
      if (errorMessage.includes('cancelled')) {
        errorMessage = 'Booking này đã bị hủy và không thể thanh toán.';
      } else if (errorMessage.includes('already been paid')) {
        errorMessage = 'Booking này đã được thanh toán rồi.';
      } else if (errorMessage.includes('not found')) {
        errorMessage = 'Không tìm thấy booking này.';
      }
      
      setNotification({
        type: 'error',
        title: 'Lỗi thanh toán',
        message: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelBooking = async (cancellationData: {
    reason: string;
    refundMethod?: string;
  }) => {
    setIsLoading(true);
    
    // Show loading toast
    const loadingToast = toast.loading('Đang xử lý yêu cầu hủy đặt sân...');
    
    try {
      
      const result = await bookingHistoryService.cancelBooking(booking.id, cancellationData);
      
      // Dismiss the loading toast using specific ID
      toast.dismiss(loadingToast);
      
      if (result.success) {
        // Hiển thị thông báo thành công với thông tin chi tiết hơn dựa vào refundPercentage
        let message = 'Đặt sân đã được hủy thành công.';
        let type = 'success';
        
        if (result.data?.wasStripeRefund) {
          if (result.data.refundPercentage === 100) {
            message = `Đặt sân đã được hủy và hoàn 100% số tiền (${result.data.refundAmount?.toLocaleString('vi-VN')}đ). Tiền sẽ được hoàn về thẻ trong 5-10 ngày làm việc.`;
          } else if (result.data.refundPercentage > 0) {
            message = `Đặt sân đã được hủy và hoàn ${result.data.refundPercentage}% số tiền (${result.data.refundAmount?.toLocaleString('vi-VN')}đ). Tiền sẽ được hoàn về thẻ trong 5-10 ngày làm việc.`;
          } else {
            message = 'Đặt sân đã được hủy thành công. Không được hoàn tiền do hủy muộn (dưới 12 giờ trước giờ đá).';
            type = 'warning';
          }
        }
          
        setNotification({
          type: 'success',
          title: 'Hủy đặt sân thành công!',
          message: message
        });
        
        // Không reload page nữa, để real-time updates xử lý
        // Real-time updates sẽ tự động refresh booking history
        console.log('✅ Booking cancellation completed, waiting for real-time updates...');
      } else {
        // Show toast for immediate feedback
        toast.error(result.message || 'Có lỗi xảy ra khi hủy đặt sân');
        
        setNotification({
          type: 'error',
          title: 'Hủy đặt sân thất bại',
          message: result.message || 'Có lỗi xảy ra khi hủy đặt sân. Vui lòng thử lại.'
        });
      }
    } catch (error) {
      // Dismiss loading toast in case of error
      toast.dismiss(loadingToast);
      
      console.error('Cancellation error:', error);
      
      // Get most descriptive error message
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Có lỗi xảy ra khi hủy đặt sân. Vui lòng thử lại.';
      
      // Show toast for immediate feedback
      toast.error(errorMessage);
      
      setNotification({
        type: 'error',
        title: 'Lỗi hủy đặt sân',
        message: errorMessage
      });
    } finally {
      setIsLoading(false);
      setShowCancelModal(false); // Make sure modal closes on error
    }
  };

  // Function to handle viewing the invoice/booking details
  const handleViewInvoice = () => {
    // Navigate to booking confirmation page with booking ID
    // This will show the detailed booking information including invoice details
    navigate(`/booking/confirmation?booking_id=${booking.id}`);
  };

  // Helper function to render primary action buttons based on status
  const renderPrimaryActions = () => {
    switch (booking.status) {
      case "pending":
        return (
          <div className="flex gap-2">
            <Button 
              className={`${isExpired ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
              onClick={() => {
                if (!isExpired) {
                  console.log('🎯 Payment button clicked!');
                  handleDirectPayment();
                }
              }}
              disabled={isLoading || isExpired}
              title={isExpired ? 'Thời gian thanh toán đã hết hạn' : ''}
            >
              {isLoading ? 'Đang xử lý...' : isExpired ? 'Hết hạn thanh toán' : 'Tiếp tục thanh toán'}
            </Button>
            <Button 
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => setShowCancelModal(true)}
              disabled={isLoading}
            >
              Hủy Đặt Sân
            </Button>
          </div>
        );
      case "paid":
      case "confirmed":
        return (
          <div className="flex gap-2">
          
            <Button 
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => setShowCancelModal(true)}
              disabled={isLoading}
            >
              Hủy Đặt Sân
            </Button>
          </div>
        );
      case "completed":
        return (
          <div className="flex gap-2">
            <Button variant="outline" className="border-green-500 text-green-500 hover:bg-green-50" onClick={() => setShowReviewModal(true)}>
              Đánh giá
            </Button>
            <ReviewModalPopup 
              open={showReviewModal} 
              onClose={() => setShowReviewModal(false)} 
              bookingId={booking.id} 
              onSuccess={() => { /* Optionally refresh data or show a notification here */ }} 
            />
          </div>
        );
      case "cancelled":
        return null;
      case "refunded":
        return null;
      default:
        return null;
    }
  };

  // Helper function to render detailed actions based on status
  const renderDetailedActions = () => {
    switch (booking.status) {
      case "pending":
      case "payment_pending":
        return (
          <div className="flex gap-2 w-full">
            <Button 
              className={`${isExpired ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'} text-white flex-1`}
              onClick={() => {
                if (!isExpired) {
                  console.log('🎯 Detailed Payment button clicked!');
                  handleDirectPayment();
                }
              }}
              disabled={isLoading || isExpired}
              title={isExpired ? 'Thời gian thanh toán đã hết hạn' : ''}
            >
              {isLoading ? 'Đang xử lý...' : isExpired ? 'Hết hạn thanh toán' : 'Tiếp tục thanh toán'}
            </Button>
            <Button 
              className="bg-red-500 hover:bg-red-600 text-white flex-1"
              onClick={() => setShowCancelModal(true)}
              disabled={isLoading}
            >
              Hủy Đặt Sân
            </Button>
          </div>
        );
      case "paid":
      case "confirmed":
        return (
          <div className="flex gap-2 w-full">
            <Button 
              className="bg-green-500 hover:bg-green-600 text-white flex-1"
              onClick={handleViewInvoice}
            >
              Xem hóa đơn
            </Button>
            <Button 
              className="bg-red-500 hover:bg-red-600 text-white flex-1"
              onClick={() => setShowCancelModal(true)}
              disabled={isLoading}
            >
              Hủy Đặt Sân
            </Button>
          </div>
        );
      case "completed":
        return (
          <Button 
            className="bg-green-500 hover:bg-green-600 text-white w-full"
            onClick={handleViewInvoice}
          >
            Xem hóa đơn
          </Button>
        );
      case "cancelled":
        return null;
      case "refunded":
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Summary View */}
      <div className="p-4 flex flex-col md:flex-row gap-4">
        {/* Field Thumbnail */}
        <div className="w-full md:w-40 h-32 relative rounded-md overflow-hidden flex-shrink-0 bg-gradient-to-br from-green-400 to-blue-500">
          {booking.image1 && booking.image1 !== '/default-field-image.jpg' ? (
            <img 
              src={booking.image1} 
              alt={`Ảnh sân ${getFieldNameDisplay(booking.fieldName)}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to default placeholder if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.innerHTML = `
                  <div class="w-full h-full flex flex-col items-center justify-center text-white">
                    <div class="text-3xl mb-1">⚽</div>
                    <div class="text-xs opacity-80">Sân bóng đá</div>
                  </div>
                `;
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white">
              <div className="text-3xl mb-1">⚽</div>
              <div className="text-xs opacity-80">Sân bóng đá</div>
            </div>
          )}
        </div>

        {/* Booking Summary */}
        <div className="flex-grow">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">{getFieldNameDisplay(booking.fieldName)}</h3>
              <p className="text-sm text-gray-500">Mã sân: #{booking.id}</p>
            </div>
            <div className="flex flex-col items-start md:items-end gap-1">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)} self-start md:self-center`}>
                {getStatusText(booking.status)}
              </span>
              {(booking.status === 'pending' || booking.status === 'payment_pending') && (currentRemainingSeconds > 0) && !isExpired && (
                <div className="text-xs text-red-500 font-medium">
                  Còn lại: {formatRemainingTime(currentRemainingSeconds)}
                </div>
              )}
              {booking.status === 'pending' && isExpired && (
                <span className="text-xs text-red-600 font-medium">
                  🕐 Hết hạn thanh toán
                </span>
              )}
              {booking.status === 'pending' && (currentRemainingSeconds > 0) && (currentRemainingSeconds <= 120) && !isExpired && (
                <span className="text-xs text-orange-600 font-medium">
                  ⚠ Sắp hết hạn!
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>{getTimeSlotDisplay(booking.timeSlot)} ngày {booking.date.replace(/^0/, '').replace(/\/0/g, '/')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span>{getLocationDisplay(booking.fieldLocation)}</span>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-sm text-gray-700 mb-2">
              <span className="font-medium text-green-600">{formatCurrencyValue(booking.totalPrice)}đ</span>
            </div>
            <div className="text-sm text-gray-700 mb-2">{booking.fieldType}</div>
            {(booking.depositAmount > 0) && (
              <div className="text-sm text-gray-700 col-span-2">
                Đã cọc: <span className="font-medium">{formatCurrencyValue(booking.depositAmount)}đ</span>
                {(booking.remainingAmount > 0) && (
                  <span className="text-gray-500"> | Còn lại: {formatCurrencyValue(booking.remainingAmount)}đ</span>
                )}
              </div>
            )}
            {/* Thông tin hoàn tiền cho booking refunded */}
            {booking.status === 'refunded' && booking.refundAmount && (
              <div className="text-sm text-purple-700 col-span-2 bg-purple-50 p-2 rounded">
                💰 Đã hoàn tiền: <span className="font-medium">{formatCurrencyValue(booking.refundAmount)}đ</span>
                <div className="text-xs text-purple-600 mt-1">
                  Tiền sẽ được hoàn về thẻ trong 5-10 ngày làm việc
                </div>
              </div>
            )}
          </div>

          {/* Primary Action Buttons */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2 flex-wrap">{renderPrimaryActions()}</div>

            <button 
              onClick={onToggleExpand} 
              className="flex items-center text-blue-500 text-sm hover:text-blue-600 transition-colors"
            >
              Thông tin chi tiết
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 ml-1" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-1" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Detailed View */}
      {isExpanded && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-gray-500">Loại sân:</div>
                <div className="text-sm text-gray-700">{booking.fieldType}</div>

                <div className="text-sm text-gray-500">Ngày đặt:</div>
                <div className="text-sm text-gray-700">
                  {booking.fullDayName}
                </div>

                <div className="text-sm text-gray-500">Giờ đặt:</div>
                <div className="text-sm text-gray-700">{booking.timeSlot}</div>

                <div className="text-sm text-gray-500">Mã sân:</div>
                <div className="text-sm text-gray-700">{booking.fieldNumber}</div>

                <div className="text-sm text-gray-500">Phương thức thanh toán:</div>
                <div className="text-sm text-gray-700">{booking.paymentMethod}</div>

                <div className="text-sm text-gray-500">Ngày đặt sân:</div>
                <div className="text-sm text-gray-700">{booking.bookingDate}</div>
              </div>
            </div>

            <div>
              {booking.status === "cancelled" && booking.cancellationReason ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm text-gray-500">Lý do hủy sân:</div>
                    <div className="text-sm text-gray-700">{booking.cancellationReason}</div>

                    {booking.refundMethod && (
                      <>
                        <div className="text-sm text-gray-500">Hoàn tiền lại vào:</div>
                        <div className="text-sm text-green-600 font-medium">{booking.refundMethod}</div>
                      </>
                    )}

                    {booking.refundAmount && (
                      <>
                        <div className="text-sm text-gray-500">Số tiền đã hoàn:</div>
                        <div className="text-sm text-gray-700">{formatCurrencyValue(booking.refundAmount)}đ</div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm text-gray-500">Địa chỉ sân:</div>
                    <div className="text-sm text-gray-700">{booking.fieldLocation}</div>
                  </div>

                  {renderDetailedActions()}
                </div>
              )}
            </div>
          </div>
        </div>
            )}

      {/* Notification */}
      {notification && (
        <Notification
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={() => setNotification(null)}
          autoClose={true}
          duration={5000}
        />
      )}

      {/* Cancel Booking Modal */}
      {showCancelModal && (
        <CancelBookingModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          booking={{
            id: booking.id,
            fieldName: getFieldNameDisplay(booking.fieldName),
            date: booking.date,
            timeSlot: booking.timeSlot,
            totalPrice: booking.totalPrice,
            depositAmount: booking.depositAmount,
            status: booking.status, // Thêm status để phân biệt trường hợp
          }}
          onCancel={handleCancelBooking}
        />
      )}
    </div>
  );
}
