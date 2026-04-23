import React from 'react';
import { AlertTriangle, Calendar, Clock, DollarSign, User } from 'lucide-react';

interface BookingInfo {
  bookingId: string;
  timeSlot: string;
  fieldName: string;
  customerName: string;
  customerPhone?: string;
  totalPrice: number;
  fieldId: string;
  time: string;
  maintenanceRange?: string;
}

interface AdvancedMaintenanceConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  maintenanceType: 'full-day' | 'time-slot';
  selectedDate: string;
  affectedBookings: BookingInfo[];
  selectedFields: string[];
  reason: string;
  isLoading?: boolean;
}

const AdvancedMaintenanceConfirmDialog: React.FC<AdvancedMaintenanceConfirmDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  maintenanceType,
  selectedDate,
  affectedBookings,
  selectedFields,
  reason,
  isLoading = false
}) => {
  if (!isOpen) return null;

  const totalRefund = affectedBookings.reduce((sum, booking) => sum + booking.totalPrice, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 bg-orange-50 border-b border-orange-100 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Xác nhận bảo trì nâng cao
              </h2>
              <p className="text-sm text-gray-600">
                Bảo trì này sẽ ảnh hưởng đến {affectedBookings.length} booking đã đặt
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Maintenance Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-blue-900 mb-2">Thông tin bảo trì</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-blue-800">
                  {maintenanceType === 'full-day' ? 'Bảo trì cả ngày' : 'Bảo trì theo khung giờ'} - {new Date(selectedDate).toLocaleDateString('vi-VN')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-blue-800">Số sân: {selectedFields.length}</span>
              </div>
              <div className="mt-2">
                <span className="text-blue-800 font-medium">Lý do: </span>
                <span className="text-blue-700">{reason}</span>
              </div>
            </div>
          </div>

          {/* Affected Bookings */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-yellow-900 mb-3">
              Booking sẽ bị ảnh hưởng ({affectedBookings.length})
            </h3>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {affectedBookings.map((booking, index) => (
                <div key={index} className="bg-white rounded-md p-3 border border-yellow-200">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">
                          {booking.timeSlot} - {booking.fieldName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {booking.customerName}
                        </span>
                      </div>
                      {booking.customerPhone && (
                        <div className="text-xs text-gray-500 ml-6">
                          SĐT: {booking.customerPhone}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700">
                          {booking.totalPrice.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions Summary */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-green-900 mb-2">
              Hệ thống sẽ tự động thực hiện:
            </h3>
            <ul className="text-sm text-green-800 space-y-1">
              <li className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Hủy tất cả {affectedBookings.length} booking
              </li>
              <li className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Hoàn tiền 100% cho khách hàng ({totalRefund.toLocaleString('vi-VN')}đ)
              </li>
              <li className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Gửi email thông báo cho khách hàng
              </li>
              <li className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Đặt sân vào trạng thái bảo trì
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Hủy bỏ
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Đang xử lý...' : 'Xác nhận bảo trì'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedMaintenanceConfirmDialog;
