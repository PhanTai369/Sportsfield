import React from 'react';
import { X, Calendar, Clock, MapPin, User, Mail, MessageSquare, CreditCard } from 'lucide-react';
import { Button } from '../ui/button';
import { formatCurrencyValue } from '../../utils/shared/currencyUtils';

interface BookingDetailsModalProps {
  booking: {
    id: string;
    date: string;
    fieldName: string;
    slots: string[];
    customerInfo: {
      fullName: string;
      email: string;
      note?: string;
    };
    totalAmount: number;
    paymentStatus?: string;
    createdAt?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onDownloadReceipt?: (bookingId: string) => void;
}

export function BookingDetailsModal({ booking, isOpen, onClose, onDownloadReceipt }: BookingDetailsModalProps) {
  if (!isOpen || !booking) return null;

  const getPaymentStatusDisplay = (status?: string) => {
    switch (status) {
      case 'pending':
        return {
          text: 'Chờ thanh toán',
          className: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: <Clock className="w-4 h-4" />
        };
      case 'confirmed':
      case 'paid':
        return {
          text: 'Đã thanh toán',
          className: 'bg-green-100 text-green-800 border-green-200',
          icon: <CreditCard className="w-4 h-4" />
        };
      default:
        return {
          text: 'Đã xác nhận',
          className: 'bg-green-100 text-green-800 border-green-200',
          icon: <CreditCard className="w-4 h-4" />
        };
    }
  };

  const formatTimeSlots = (slots: string[]) => {
    return slots.map(slot => {
      const parts = slot.split('_');
      return parts[1] || slot;
    });
  };

  const paymentStatus = getPaymentStatusDisplay(booking.paymentStatus);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Chi tiết đặt sân</h2>
            <p className="text-sm text-gray-600">Mã đặt sân: {booking.id}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="p-2"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Payment Status */}
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-800">Trạng thái thanh toán</h3>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-full border ${paymentStatus.className}`}>
              {paymentStatus.icon}
              <span className="text-sm font-medium">{paymentStatus.text}</span>
            </div>
          </div>

          {/* Booking Information */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-800 border-b border-gray-200 pb-2">
              Thông tin đặt sân
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Ngày đặt</p>
                    <p className="font-medium">{booking.date}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Sân bóng</p>
                    <p className="font-medium">{booking.fieldName}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Khung giờ</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {formatTimeSlots(booking.slots).map((time, index) => (
                        <span 
                          key={index}
                          className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-medium"
                        >
                          {time}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CreditCard className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Tổng giá trị</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrencyValue(booking.totalAmount)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-800 border-b border-gray-200 pb-2">
              Thông tin khách hàng
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Họ và tên</p>
                  <p className="font-medium">{booking.customerInfo.fullName}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{booking.customerInfo.email}</p>
                </div>
              </div>
            </div>

            {booking.customerInfo.note && (
              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Ghi chú</p>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm">{booking.customerInfo.note}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Booking Time */}
          {booking.createdAt && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Thời gian đặt sân:</span>
                <span className="font-medium">
                  {new Date(booking.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row gap-3 p-6 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={() => onDownloadReceipt?.(booking.id)}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Tải hóa đơn
          </Button>
          
          <Button
            onClick={onClose}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}
