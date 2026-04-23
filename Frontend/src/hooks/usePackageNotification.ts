import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { usePackageStatus } from './usePackageStatus';

interface UsePackageNotificationOptions {
  enableToasts?: boolean;
  toastInterval?: number; // milliseconds
  onlyShowCritical?: boolean; // Chỉ hiển thị khi hết hạn hoặc sắp hết hạn <= 3 ngày
}

export const usePackageNotification = (options: UsePackageNotificationOptions = {}) => {
  const {
    enableToasts = true,
    toastInterval = 30 * 60 * 1000, // 30 phút
    onlyShowCritical = true
  } = options;

  const packageStatus = usePackageStatus();
  const lastNotificationTime = useRef<number>(0);
  const hasShownCriticalWarning = useRef<boolean>(false);

  useEffect(() => {
    if (!enableToasts || !packageStatus.hasPackage) return;

    const now = Date.now();
    const shouldShowNotification = now - lastNotificationTime.current > toastInterval;

    // Gói đã hết hạn - hiển thị ngay lập tức và chỉ một lần
    if (packageStatus.isExpired && !hasShownCriticalWarning.current) {
      toast.error(
        'Gói dịch vụ đã hết hạn! Sân bóng đã bị vô hiệu hóa.',
        {
          duration: 10000,
          action: {
            label: 'Gia hạn ngay',
            onClick: () => window.location.href = '/owner/service-plan-management'
          }
        }
      );
      hasShownCriticalWarning.current = true;
      lastNotificationTime.current = now;
      return;
    }

    // Gói sắp hết hạn trong 3 ngày - hiển thị định kỳ
    if (packageStatus.isExpiringSoon && packageStatus.daysUntilExpiry <= 3) {
      if (shouldShowNotification) {
        toast.warning(
          `Gói dịch vụ sẽ hết hạn trong ${packageStatus.daysUntilExpiry} ngày!`,
        );
        lastNotificationTime.current = now;
      }
      return;
    }

    // Reset critical warning flag nếu không còn ở trạng thái hết hạn
    if (!packageStatus.isExpired) {
      hasShownCriticalWarning.current = false;
    }

    // Hiển thị thông báo cho trường hợp sắp hết hạn (7 ngày) - chỉ khi không ở chế độ onlyShowCritical
    if (!onlyShowCritical && packageStatus.isExpiringSoon && shouldShowNotification) {
      toast.info(
        `Gói dịch vụ sẽ hết hạn trong ${packageStatus.daysUntilExpiry} ngày`,
      );
      lastNotificationTime.current = now;
    }
  }, [
    packageStatus.isExpired,
    packageStatus.isExpiringSoon,
    packageStatus.daysUntilExpiry,
    packageStatus.hasPackage,
    enableToasts,
    toastInterval,
    onlyShowCritical
  ]);

  return {
    packageStatus,
    showManualNotification: () => {
      if (packageStatus.isExpired) {
        toast.error('Gói dịch vụ đã hết hạn!', {
          action: {
            label: 'Gia hạn ngay',
            onClick: () => window.location.href = '/owner/service-plan-management'
          }
        });
      } else if (packageStatus.isExpiringSoon) {
        toast.warning(`Gói dịch vụ sẽ hết hạn trong ${packageStatus.daysUntilExpiry} ngày!`, {
          action: {
            label: 'Gia hạn',
            onClick: () => window.location.href = '/owner/service-plan-management'
          }
        });
      } else {
        toast.info('Gói dịch vụ đang hoạt động bình thường');
      }
    }
  };
};

export default usePackageNotification;
