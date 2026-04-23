import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';

interface CancelBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    fieldName: string;
    date: string;
    timeSlot: string;
    totalPrice: number;
    depositAmount: number;
    status: string; // Thêm status để phân biệt trường hợp
  };
  onCancel: (cancellationData: {
    reason: string;
    refundMethod?: string;
  }) => Promise<void>;
}

export function CancelBookingModal({ isOpen, onClose, booking, onCancel }: CancelBookingModalProps) {
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // Phân biệt 2 trường hợp hủy
  const isConfirmedBooking = booking.status === 'paid';
  const isPendingPayment = booking.status === 'pending';

  const cancellationReasons = [
    'Thay đổi lịch trình',
    'Thời tiết xấu',
    'Có việc đột xuất',
    'Không đủ người chơi',
    'Lý do sức khỏe',
    'Khác'
  ];

  const refundMethods = [
    'Hoàn về thẻ tín dụng/ghi nợ (qua Stripe)',
    'Chuyển thành credit để đặt sân sau'
  ];

  const handleCancel = async () => {
    if (!reason.trim()) {
      toast.error('Vui lòng chọn lý do hủy đặt sân');
      return;
    }

    // Với booking đã thanh toán (confirmed), không cần chọn refund method vì sẽ tự động qua Stripe
    if (isPendingPayment && booking.depositAmount > 0 && !refundMethod) {
      toast.error('Vui lòng chọn phương thức hoàn tiền');
      return;
    }

    setIsProcessing(true);
    try {
      await onCancel({
        reason: reason,
        refundMethod: isPendingPayment && booking.depositAmount > 0 ? refundMethod : undefined,
      });
      onClose();
    } catch (error) {
      console.error('Cancellation error:', error);
      // Error will be handled by parent component
      toast.error('Có lỗi xảy ra khi hủy đặt sân');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Hủy đặt sân</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Warning - khác nhau theo trường hợp */}
          <div className={`border rounded-lg p-4 flex items-start gap-3 ${
            isConfirmedBooking 
              ? 'bg-blue-50 border-blue-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
              isConfirmedBooking ? 'text-blue-600' : 'text-yellow-600'
            }`} />
            <div>
              <p className={`text-sm font-medium ${
                isConfirmedBooking ? 'text-blue-800' : 'text-yellow-800'
              }`}>
                {isConfirmedBooking 
                  ? 'Hủy đặt sân đã thanh toán' 
                  : 'Lưu ý khi hủy đặt sân'
                }
              </p>
              <p className={`text-sm mt-1 ${
                isConfirmedBooking ? 'text-blue-700' : 'text-yellow-700'
              }`}>
                {isConfirmedBooking 
                  ? 'Vì bạn đã thanh toán thành công, chúng tôi sẽ hoàn tiền qua Stripe về thẻ bạn đã sử dụng. Thời gian hoàn tiền: 5-10 ngày làm việc.'
                  : 'Việc hủy đặt sân có thể ảnh hưởng đến các đặt sân khác. Vui lòng cân nhắc kỹ trước khi hủy.'
                }
              </p>
              
              {isConfirmedBooking && (
                <div className="mt-3 text-sm text-blue-700">
                  <p className="font-medium mb-1">Chính sách hoàn tiền:</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Hoàn 100% nếu hủy trong vòng 10 phút kể từ khi đặt thành công.</li>
                    <li>Hoàn 100% nếu hủy từ 48 giờ trở lên trước giờ đá.</li>
                    <li>Hoàn 75% nếu hủy trong khoảng từ 48 giờ đến 24 giờ trước giờ đá.</li>
                    <li>Hoàn 50% nếu hủy trong khoảng từ 24 giờ đến 12 giờ trước giờ đá.</li>
                    <li>Không hoàn tiền nếu hủy trong vòng dưới 12 giờ trước giờ đá.</li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Booking Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">{booking.fieldName}</h4>
            <p className="text-sm text-gray-600">Mã đặt sân: #{booking.id}</p>
            <p className="text-sm text-gray-600">Ngày: {booking.date}</p>
            <p className="text-sm text-gray-600">Giờ: {booking.timeSlot}</p>
            {booking.depositAmount > 0 && (
              <p className="text-sm text-gray-600 mt-2">
                Tiền đã thanh toán: <span className="font-medium">{booking.depositAmount.toLocaleString()}đ</span>
              </p>
            )}
          </div>

          {/* Cancellation Reason */}
          <div>
            <label className="block text-sm font-medium mb-2">Lý do hủy đặt sân: *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Chọn lý do</option>
              {cancellationReasons.map((reasonOption) => (
                <option key={reasonOption} value={reasonOption}>
                  {reasonOption}
                </option>
              ))}
            </select>
            {reason === 'Khác' && (
              <textarea
                placeholder="Nhập lý do cụ thể..."
                value={reason === 'Khác' ? '' : reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full mt-2 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                rows={3}
              />
            )}
          </div>

          {/* Refund Method - chỉ hiển thị cho booking chưa thanh toán có deposit */}
          {isPendingPayment && booking.depositAmount > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">Phương thức hoàn tiền: *</label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Chọn phương thức hoàn tiền</option>
                {refundMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Stripe refund info - hiển thị cho booking đã thanh toán */}
          {isConfirmedBooking && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800 font-medium">💳 Hoàn tiền tự động qua Stripe</p>
              <p className="text-sm text-green-700 mt-1">
                Số tiền <span className="font-medium">{booking.totalPrice.toLocaleString('vi-VN')}đ</span> sẽ được hoàn về thẻ thanh toán của bạn trong vòng 5-10 ngày làm việc.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isProcessing}
            >
              Đóng
            </Button>
            <Button
              onClick={handleCancel}
              className="flex-1 bg-red-600 hover:bg-red-700"
              disabled={isProcessing}
            >
              {isProcessing 
                ? 'Đang xử lý...' 
                : isConfirmedBooking 
                  ? 'Xác nhận hủy & Hoàn tiền' 
                  : 'Xác nhận hủy'
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
