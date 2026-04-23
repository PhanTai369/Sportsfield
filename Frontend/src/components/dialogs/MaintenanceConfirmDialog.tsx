import React from 'react';
import { AlertTriangle, Clock, DollarSign, Mail } from 'lucide-react';

interface MaintenanceConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  bookingInfo?: {
    fieldName?: string;
    customerName?: string;
    date?: string;
    time?: string;
    totalPrice?: number;
  };
  maintenanceReason?: string;
}

const MaintenanceConfirmDialog: React.FC<MaintenanceConfirmDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  bookingInfo,
  maintenanceReason = "Bảo trì định kỳ"
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">
              Xác nhận hủy booking để bảo trì
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="mb-6">
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
            <p className="text-sm text-amber-800">
              <strong>Lưu ý:</strong> Khung giờ này đã được đặt bởi khách hàng.
            </p>
          </div>

          {/* Booking Info */}
          {bookingInfo && (
            <div className="space-y-3 mb-4">
              <div className="bg-gray-50 rounded-md p-3">
                <h4 className="font-medium text-gray-900 mb-2">Thông tin booking:</h4>
                <div className="space-y-2 text-sm">
                  {bookingInfo.fieldName && (
                    <div className="flex items-center">
                      <span className="w-20 text-gray-600">Sân:</span>
                      <span className="font-medium">{bookingInfo.fieldName}</span>
                    </div>
                  )}
                  {bookingInfo.customerName && (
                    <div className="flex items-center">
                      <span className="w-20 text-gray-600">Khách:</span>
                      <span className="font-medium">{bookingInfo.customerName}</span>
                    </div>
                  )}
                  {bookingInfo.date && (
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="w-16 text-gray-600">Ngày:</span>
                      <span className="font-medium">{bookingInfo.date}</span>
                    </div>
                  )}
                  {bookingInfo.time && (
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="w-16 text-gray-600">Giờ:</span>
                      <span className="font-medium">{bookingInfo.time}</span>
                    </div>
                  )}
                  {bookingInfo.totalPrice && (
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="w-16 text-gray-600">Giá:</span>
                      <span className="font-medium text-green-600">
                        {bookingInfo.totalPrice.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Maintenance Reason */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lý do bảo trì:
            </label>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">{maintenanceReason}</p>
            </div>
          </div>

          {/* Actions that will be taken */}
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <h4 className="font-medium text-green-900 mb-2">
              Nếu bạn tiếp tục, booking sẽ bị hủy tự động và:
            </h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li className="flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                Khách hàng sẽ được hoàn tiền 100% qua Stripe
              </li>
              <li className="flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                Email thông báo sẽ được gửi đến khách hàng
              </li>
              <li className="flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Khung giờ sẽ chuyển sang trạng thái bảo trì
              </li>
            </ul>
          </div>

          <div className="mt-4">
            <p className="text-sm text-gray-600">
              Bạn có chắc chắn muốn tiếp tục?
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
          >
            Xác nhận bảo trì
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceConfirmDialog;
