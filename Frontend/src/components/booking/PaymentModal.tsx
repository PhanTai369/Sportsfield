import React, { useState } from 'react';
import { X, CreditCard, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { formatCurrencyValue } from '../../utils/shared/currencyUtils';
import { paymentService } from '../../services/payment.service';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    fieldName: string;
    remainingAmount: number;
    totalPrice: number;
    depositAmount: number;
  };
  onPayment: (paymentData: {
    paymentMethod: string;
    amount: number;
    isFullPayment: boolean;
  }) => Promise<void>;
}

export function PaymentModal({ isOpen, onClose, booking, onPayment }: PaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const amountToPay = booking.totalPrice;

  const handleDirectPayment = async () => {
    setIsProcessing(true);
    try {
      // Call the onPayment callback to inform parent component
      await onPayment({
        paymentMethod: 'Stripe Payment',
        amount: amountToPay,
        isFullPayment: true,
      });

      // Create Stripe checkout session for existing booking payment
      const result = await paymentService.continuePaymentForBooking(booking.id);

      if (result.checkout_url) {
        // Redirect directly to Stripe Checkout
        window.location.href = result.checkout_url;
      } else {
        throw new Error('Không thể tạo phiên thanh toán');
      }
    } catch (error: any) {
      console.error('Error creating Stripe session:', error);
      
      // Display specific error message
      let errorMessage = 'Có lỗi xảy ra khi tạo phiên thanh toán. Vui lòng thử lại.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Handle specific booking status errors
      if (errorMessage.includes('cancelled')) {
        errorMessage = 'Booking này đã bị hủy và không thể thanh toán.';
      } else if (errorMessage.includes('already been paid')) {
        errorMessage = 'Booking này đã được thanh toán rồi.';
      } else if (errorMessage.includes('not found')) {
        errorMessage = 'Không tìm thấy booking này.';
      }
      
      alert(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Thanh toán đặt sân</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Booking Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">{booking.fieldName}</h4>
            <p className="text-sm text-gray-600">Mã đặt sân: #{booking.id}</p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-sm font-medium">
                <span>Tổng tiền cần thanh toán:</span>
                <span className="text-green-600">{formatCurrencyValue(booking.totalPrice)}đ</span>
              </div>
            </div>
          </div>

          {/* Payment Method - Stripe Only */}
          <div>
            <label className="block text-sm font-medium mb-2">Phương thức thanh toán:</label>
            <div className="p-3 border border-green-500 bg-green-50 rounded-lg flex items-center">
              <CreditCard className="w-5 h-5 text-green-600 mr-3" />
              <div className="flex-1">
                <span className="text-sm font-medium text-green-800">Thanh toán qua Stripe</span>
                <p className="text-xs text-green-600 mt-1">Hỗ trợ thẻ tín dụng/ghi nợ, ví điện tử</p>
              </div>
            </div>
          </div>

          {/* Amount to Pay */}
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Số tiền thanh toán:</span>
              <span className="text-xl font-bold text-green-600">
                {formatCurrencyValue(amountToPay)}đ
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isProcessing}
            >
              Hủy
            </Button>
            <Button
              onClick={handleDirectPayment}
              className="flex-1 bg-green-600 hover:bg-green-700 flex items-center gap-2"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>Đang xử lý...</>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4" />
                  Thanh toán ngay
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
