import React from 'react';
import { CheckCircle, DollarSign, Mail, Clock } from 'lucide-react';

interface MaintenanceSuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  result?: {
    bookingId?: string;
    refundAmount?: number;
    emailSent?: boolean;
    customerName?: string;
    fieldName?: string;
    maintenanceReason?: string;
  };
}

const MaintenanceSuccessDialog: React.FC<MaintenanceSuccessDialogProps> = ({
  isOpen,
  onClose,
  result
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">
              Bảo trì đã được thiết lập thành công
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="mb-6">
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
            <p className="text-sm text-green-800">
              Booking đã được hủy và khung giờ đã chuyển sang trạng thái bảo trì.
            </p>
          </div>

          {/* Result Details */}
          {result && (
            <div className="space-y-3">
              {result.fieldName && (
                <div className="bg-gray-50 rounded-md p-3">
                  <div className="flex items-center text-sm">
                    <Clock className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-gray-600">Sân:</span>
                    <span className="ml-2 font-medium">{result.fieldName}</span>
                  </div>
                </div>
              )}

              {result.customerName && (
                <div className="bg-gray-50 rounded-md p-3">
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600">Khách hàng:</span>
                    <span className="ml-2 font-medium">{result.customerName}</span>
                  </div>
                </div>
              )}

              {result.maintenanceReason && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="text-sm">
                    <span className="font-medium text-blue-900">Lý do bảo trì:</span>
                    <p className="text-blue-800 mt-1">{result.maintenanceReason}</p>
                  </div>
                </div>
              )}

              {/* Status indicators */}
              <div className="space-y-2">
                {result.refundAmount !== undefined && result.refundAmount > 0 && (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-md p-3">
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm text-green-800">Hoàn tiền</span>
                    </div>
                    <span className="text-sm font-medium text-green-900">
                      {result.refundAmount.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 text-blue-500 mr-2" />
                    <span className="text-sm text-blue-800">Email thông báo</span>
                  </div>
                  <span className={`text-sm font-medium ${
                    result.emailSent ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {result.emailSent ? 'Đã gửi' : 'Lỗi gửi'}
                  </span>
                </div>
              </div>

              {result.bookingId && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <p className="text-xs text-gray-500">
                    Booking ID: <span className="font-mono">{result.bookingId}</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceSuccessDialog;
