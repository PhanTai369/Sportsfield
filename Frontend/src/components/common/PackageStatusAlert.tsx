import React from 'react';
import { usePackageStatus } from '../../hooks/usePackageStatus';
import { SERVICE_PLANS } from '../../types/servicePlans';

interface PackageStatusAlertProps {
  className?: string;
  showOnlyWarnings?: boolean; // Chỉ hiển thị cảnh báo, không hiển thị thông tin bình thường
}

const PackageStatusAlert: React.FC<PackageStatusAlertProps> = ({ 
  className = '', 
  showOnlyWarnings = false 
}) => {
  const packageStatus = usePackageStatus();

  // Không hiển thị gì nếu không có gói dịch vụ
  if (!packageStatus.hasPackage) {
    return null;
  }

  const plan = SERVICE_PLANS[packageStatus.packageType];

  // Gói đã hết hạn
  if (packageStatus.isExpired) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 mb-6 ${className}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <i className="fas fa-exclamation-triangle text-red-500 text-xl"></i>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Gói dịch vụ đã hết hạn
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>
                Gói <strong>{plan.name}</strong> của bạn đã hết hạn vào{' '}
                <strong>{packageStatus.expireDate?.toLocaleDateString('vi-VN')}</strong>.
                Các sân của bạn đã bị vô hiệu hóa và không thể nhận đặt chỗ.
              </p>
            </div>
            <div className="mt-4">
              <div className="flex space-x-3">
                <a
                  href="/owner/service-plans"
                  className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-md transition-colors"
                >
                  Gia hạn ngay
                </a>
                <a
                  href="/owner/service-plan-management"
                  className="bg-white hover:bg-red-50 text-red-600 border border-red-300 text-sm px-4 py-2 rounded-md transition-colors"
                >
                  Xem chi tiết
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Gói sắp hết hạn (còn 7 ngày hoặc ít hơn)
  if (packageStatus.isExpiringSoon) {
    const urgencyLevel = packageStatus.daysUntilExpiry <= 3 ? 'high' : 'medium';
    const bgColor = urgencyLevel === 'high' ? 'bg-orange-50' : 'bg-yellow-50';
    const borderColor = urgencyLevel === 'high' ? 'border-orange-200' : 'border-yellow-200';
    const iconColor = urgencyLevel === 'high' ? 'text-orange-500' : 'text-yellow-500';
    const textColor = urgencyLevel === 'high' ? 'text-orange-800' : 'text-yellow-800';
    const textDetailColor = urgencyLevel === 'high' ? 'text-orange-700' : 'text-yellow-700';
    const btnColor = urgencyLevel === 'high' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-yellow-600 hover:bg-yellow-700';

    return (
      <div className={`${bgColor} border ${borderColor} rounded-lg p-4 mb-6 ${className}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <i className={`fas fa-clock ${iconColor} text-xl`}></i>
          </div>
          <div className="ml-3 flex-1">
            <h3 className={`text-sm font-medium ${textColor}`}>
              Gói dịch vụ sắp hết hạn
            </h3>
            <div className={`mt-2 text-sm ${textDetailColor}`}>
              <p>
                Gói <strong>{plan.name}</strong> của bạn sẽ hết hạn vào{' '}
                <strong>{packageStatus.expireDate?.toLocaleDateString('vi-VN')}</strong>{' '}
                (còn <strong>{packageStatus.daysUntilExpiry} ngày</strong>).
                Hãy gia hạn để đảm bảo dịch vụ không bị gián đoạn.
              </p>
            </div>
            <div className="mt-4">
              <div className="flex space-x-3">
                <a
                  href="/owner/service-plan-management"
                  className={`${btnColor} text-white text-sm px-4 py-2 rounded-md transition-colors`}
                >
                  Gia hạn ngay
                </a>
                <button
                  onClick={() => {/* Có thể thêm chức năng dismiss */}}
                  className="bg-white hover:bg-gray-50 text-gray-600 border border-gray-300 text-sm px-4 py-2 rounded-md transition-colors"
                >
                  Để sau
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Hiển thị thông tin bình thường nếu không phải chế độ warning-only
  if (!showOnlyWarnings) {
    const daysRemaining = packageStatus.daysUntilExpiry;
    const statusColor = daysRemaining > 30 ? 'text-green-600' : 
                       daysRemaining > 14 ? 'text-blue-600' : 'text-yellow-600';

    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <i className="fas fa-info-circle text-blue-600 mr-3"></i>
            <div>
              <span className="text-sm font-medium text-blue-800">
                Gói hiện tại: {plan.name}
              </span>
              <div className={`text-xs ${statusColor} mt-1`}>
                Còn lại: {daysRemaining} ngày (hết hạn: {packageStatus.expireDate?.toLocaleDateString('vi-VN')})
              </div>
            </div>
          </div>
          <a 
            href="/owner/service-plan-management" 
            className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
          >
            Quản lý gói
          </a>
        </div>
      </div>
    );
  }

  return null;
};

export default PackageStatusAlert;
