import React from 'react';
import { usePackageStatus } from '../../hooks/usePackageStatus';
import { useLocation } from 'react-router-dom';

interface GlobalPackageNotificationProps {
  className?: string;
  hideOnRoutes?: string[]; // Routes where this notification should be hidden
}

const GlobalPackageNotification: React.FC<GlobalPackageNotificationProps> = ({ 
  className = '',
  hideOnRoutes = []
}) => {
  const packageStatus = usePackageStatus();
  const location = useLocation();

  // Ẩn notification trên các routes được chỉ định
  if (hideOnRoutes.some(route => location.pathname.includes(route))) {
    return null;
  }

  // Chỉ hiển thị khi có vấn đề nghiêm trọng
  if (!packageStatus.hasPackage || (!packageStatus.isExpired && !packageStatus.isExpiringSoon)) {
    return null;
  }

  // Nếu đã hết hạn
  if (packageStatus.isExpired) {
    return (
      <div className={`bg-red-600 text-white ${className}`}>
        <div className="max-w-7xl mx-auto py-3 px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between flex-wrap">
            <div className="w-0 flex-1 flex items-center">
              <span className="flex p-2 rounded-lg bg-red-800">
                <i className="fas fa-exclamation-triangle text-white"></i>
              </span>
              <p className="ml-3 font-medium text-white truncate">
                <span className="md:hidden">
                  Gói dịch vụ đã hết hạn! Sân bị vô hiệu hóa.
                </span>
                <span className="hidden md:inline">
                  Gói dịch vụ đã hết hạn vào {packageStatus.expireDate?.toLocaleDateString('vi-VN')}! 
                  Tất cả sân của bạn đã bị vô hiệu hóa.
                </span>
              </p>
            </div>
            <div className="order-3 mt-2 flex-shrink-0 w-full sm:order-2 sm:mt-0 sm:w-auto">
              <a
                href="/owner/service-plan-management"
                className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-red-600 bg-white hover:bg-red-50"
              >
                Gia hạn ngay
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Nếu sắp hết hạn (3 ngày hoặc ít hơn)
  if (packageStatus.isExpiringSoon && packageStatus.daysUntilExpiry <= 3) {
    return (
      <div className={`bg-orange-600 text-white ${className}`}>
        <div className="max-w-7xl mx-auto py-3 px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between flex-wrap">
            <div className="w-0 flex-1 flex items-center">
              <span className="flex p-2 rounded-lg bg-orange-800">
                <i className="fas fa-clock text-white"></i>
              </span>
              <p className="ml-3 font-medium text-white truncate">
                <span className="md:hidden">
                  Gói dịch vụ sắp hết hạn trong {packageStatus.daysUntilExpiry} ngày!
                </span>
                <span className="hidden md:inline">
                  Gói dịch vụ sẽ hết hạn vào {packageStatus.expireDate?.toLocaleDateString('vi-VN')} 
                  (còn {packageStatus.daysUntilExpiry} ngày). Gia hạn ngay để tránh gián đoạn dịch vụ.
                </span>
              </p>
            </div>
            <div className="order-3 mt-2 flex-shrink-0 w-full sm:order-2 sm:mt-0 sm:w-auto">
              <a
                href="/owner/service-plan-management"
                className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-orange-600 bg-white hover:bg-orange-50"
              >
                Gia hạn ngay
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default GlobalPackageNotification;
