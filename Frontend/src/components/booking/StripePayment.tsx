import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { ArrowLeft, CreditCard, Shield, Loader2, CalendarClock, ExternalLink } from 'lucide-react';
import { paymentService } from '../../services/payment.service';
import { parseSlotId } from '../../utils/slotFormatter';
import { showToast } from '../../utils/toast';
// Import centralized utilities
import { formatCurrencyValue } from '../../utils/shared/currencyUtils';

interface CustomerInfo {
  fullName: string;
  email: string;
  note?: string;
}

interface StripePaymentProps {
  selectedDate: number;
  selectedSlots: string[];
  totalAmount: number;
  customerInfo: CustomerInfo;
  fieldData: any;
  onSuccess: (bookingId: string) => void;
  onBack: () => void;
}

export const StripePayment: React.FC<StripePaymentProps> = (props) => {
  const [checkoutUrl, setCheckoutUrl] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [bookingId, setBookingId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isCreatingBooking, setIsCreatingBooking] = useState<boolean>(false);
  const [redirecting, setRedirecting] = useState<boolean>(false);

  const handleRedirectToCheckout = () => {
    if (checkoutUrl) {
      setRedirecting(true);
      // Redirect to Stripe Checkout
      window.location.href = checkoutUrl;
    }
  };

  useEffect(() => {
    const createBookingAndPayment = async () => {
      if (isCreatingBooking) {
        console.log('Booking creation already in progress, skipping...');
        return;
      }

      try {
        setIsCreatingBooking(true);
        setLoading(true);
        
        console.log('🎯 Starting booking creation with data:', {
          selectedDate: props.selectedDate,
          selectedSlots: props.selectedSlots,
          customerInfo: props.customerInfo,
          fieldData: props.fieldData
        });
        
        // Transform the selected slots to the format expected by the API
        const timeSlots = props.selectedSlots.map(slotId => {
          const { subfieldId, timeString } = parseSlotId(slotId);
          
          if (!subfieldId || !timeString) {
            throw new Error(`Invalid slot ID format: ${slotId}`);
          }
          
          // Calculate end time (add 1 hour to start time)
          const [hours, minutes] = timeString.split(':').map(Number);
          const endHours = (hours + 1) % 24;
          const end_time = `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          
          return {
            sub_field_id: subfieldId,
            start_time: timeString,
            end_time
          };
        });

        // Get current month and year for booking date
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const bookingDate = `${year}-${(month + 1).toString().padStart(2, '0')}-${props.selectedDate.toString().padStart(2, '0')}`;

        const bookingPaymentData = {
          fieldId: props.fieldData.id,
          subFieldIds: Array.from(new Set(timeSlots.map(slot => slot.sub_field_id))),
          bookingDate,
          timeSlots,
          totalAmount: props.totalAmount,
          customerInfo: {
            name: props.customerInfo.fullName,
            email: props.customerInfo.email,
            notes: props.customerInfo.note || ''
          },
          currency: 'vnd',
          return_url: `${window.location.origin}/payment/success`,
          cancel_url: `${window.location.origin}/payment/cancel`
        };

        console.log('📤 Sending booking request:', bookingPaymentData);

        const result = await paymentService.createBookingWithPayment(bookingPaymentData);
        
        console.log('✅ Booking API response:', result);
        
        setCheckoutUrl(result.checkout_url);
        setSessionId(result.session_id);
        setBookingId(result.booking_id);
        setLoading(false); // Tắt loading để hiển thị thông báo thành công
        
        // Hiển thị thông báo thành công qua toast
        showToast.booking.createSuccess();
        
        // Auto redirect to Stripe Checkout after successful booking creation
        console.log('🔄 Auto redirecting to Stripe Checkout:', result.checkout_url);
        setTimeout(() => {
          setRedirecting(true);
          window.location.href = result.checkout_url;
        }, 2000); // Tăng delay lên 2 giây để người dùng nhìn thấy thông báo thành công
        
      } catch (err: any) {
        console.error('❌ Error creating booking and payment:', err);
        console.error('Error details:', {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data,
          response: err.response
        });
        
        // Handle different error types
        if (err.response?.status === 409) {
          const errorMessage = err.response?.data?.error?.message || 
                              err.response?.data?.message ||
                              err.message;
          
          if (errorMessage && errorMessage.includes('already booked')) {
            showToast.booking.conflictError();
          } else if (errorMessage && errorMessage.includes('already in progress')) {
            showToast.booking.inProgressError();
          } else {
            showToast.booking.createError(errorMessage || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
          }
        } else {
          const errorMessage = err.response?.data?.message || err.message || 'Đã có lỗi xảy ra khi tạo booking.';
          showToast.booking.createError(errorMessage);
        }
      } finally {
        setLoading(false);
        setIsCreatingBooking(false);
      }
    };

    createBookingAndPayment();
  }, []); // Only run once when component mounts

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-12 h-12 animate-spin text-green-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Đang tạo đơn đặt sân...</h3>
          <p className="text-gray-600 text-center">
            Vui lòng chờ trong giây lát. Chúng tôi đang chuẩn bị trang thanh toán cho bạn.
          </p>
          {checkoutUrl && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
              <p className="text-green-700 text-sm">
                ✅ Đặt sân thành công! Đang chuyển hướng đến trang thanh toán...
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Thanh toán</h2>
        <p className="text-gray-600">
          Đặt sân đã được tạo thành công. Nhấn vào nút bên dưới để tiến hành thanh toán qua Stripe.
        </p>
      </div>

      {/* Booking Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Thông tin đặt sân</h3>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Mã đặt sân:</span>
            <span className="font-mono text-green-600">#{bookingId}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Sân:</span>
            <span>{props.fieldData.name}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Ngày:</span>
            <span>
              <CalendarClock className="w-4 h-4 inline mr-1" />
              {props.selectedDate.toString().padStart(2, '0')}/{(new Date().getMonth() + 1).toString().padStart(2, '0')}/{new Date().getFullYear()}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Khung giờ:</span>
            <span>{props.selectedSlots.length} khung giờ</span>
          </div>
          
          <hr className="my-3" />
          
          <div className="flex justify-between text-lg font-bold text-green-600">
            <span>Tổng cộng:</span>
            <span>{formatCurrencyValue(props.totalAmount)}đ</span>
          </div>
        </div>
      </div>

      {/* Security notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-800">Thanh toán an toàn</h4>
            <p className="text-sm text-blue-700">
              Bạn sẽ được chuyển đến trang thanh toán an toàn của Stripe để nhập thông tin thẻ. 
              Thông tin thẻ của bạn được mã hóa và bảo mật hoàn toàn.
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={props.onBack}
          disabled={redirecting}
          className="flex-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>

        <Button
          onClick={handleRedirectToCheckout}
          disabled={!checkoutUrl || redirecting}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
        >
          {redirecting ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang chuyển hướng...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Thanh toán {formatCurrencyValue(props.totalAmount)}đ
              <ExternalLink className="w-4 h-4" />
            </div>
          )}
        </Button>
      </div>

      {sessionId && (
        <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
          Session ID: {sessionId}
        </div>
      )}
    </div>
  );
};
