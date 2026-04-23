import React, { useState } from 'react';
import { AlertTriangle, Clock, DollarSign, Mail, User, Phone } from 'lucide-react';

interface MaintenanceBookingConfirmDialogProps {
  isOpen: boolean;
  onConfirm: (reason: string) => Promise<void>;
  onCancel: () => void;
  timeSlot: string;
  fieldName: string;
  customerInfo?: {
    name: string;
    email: string;
    phone: string;
  };
  isLoading?: boolean;
  onComplete?: (success: boolean, message: string) => void;
}

const MaintenanceBookingConfirmDialog: React.FC<MaintenanceBookingConfirmDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  timeSlot,
  fieldName,
  customerInfo,
  isLoading = false,
  onComplete
}) => {
  const [reason, setReason] = useState('Bảo trì định kỳ');

  const handleConfirm = async () => {
    try {
      await onConfirm(reason);
      onComplete?.(true, 'Đã hủy booking và hoàn tiền cho khách hàng thành công!');
    } catch (error) {
      onComplete?.(false, 'Có lỗi xảy ra khi xử lý. Vui lòng thử lại.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Xác nhận bảo trì
            </h2>
            <p className="text-sm text-gray-600">
              Khung giờ này đã được đặt bởi khách hàng
            </p>
          </div>
        </div>

        {/* Booking Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                {timeSlot} - {fieldName}
              </span>
            </div>
            {customerInfo && (
              <>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">
                    {customerInfo.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">
                    {customerInfo.email !== "N/A" ? customerInfo.email : "Email sẽ được gửi qua hệ thống"}
                  </span>
                </div>
                {customerInfo.phone !== "N/A" && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      {customerInfo.phone}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Warning Message */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-yellow-800">
            Nếu bạn tiếp tục đặt bảo trì, booking sẽ bị hủy tự động và:
          </p>
          <ul className="text-sm text-yellow-800 mt-2 space-y-1">
            <li className="flex items-center gap-2">
              <DollarSign className="w-3 h-3" />
              Khách hàng sẽ được hoàn tiền 100% qua Stripe
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-3 h-3" />
              Email thông báo sẽ được gửi đến khách hàng
            </li>
          </ul>
        </div>

        {/* Maintenance Reason */}
        <div className="mb-6">
          <label htmlFor="maintenanceReason" className="block text-sm font-medium text-gray-700 mb-2">
            Lý do bảo trì
          </label>
          <input
            type="text"
            id="maintenanceReason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Nhập lý do bảo trì..."
            disabled={isLoading}
          />
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
            onClick={handleConfirm}
            disabled={isLoading || !reason.trim()}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Đang xử lý...' : 'Xác nhận bảo trì'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceBookingConfirmDialog;
