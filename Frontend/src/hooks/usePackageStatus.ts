import { useMemo } from 'react';
import { useAuth } from '../contexts/authContext';

export interface PackageStatus {
  hasPackage: boolean;
  packageType: 'basic' | 'premium' | 'none';
  isExpired: boolean;
  isExpiringSoon: boolean; // Còn 7 ngày hoặc ít hơn
  daysUntilExpiry: number;
  expireDate: Date | null;
  purchaseDate: Date | null;
}

// Helper function để tính ngày chênh lệch chính xác
const calculateDaysDifference = (fromDate: Date, toDate: Date): number => {
  // Reset time to 00:00:00 để chỉ so sánh ngày
  const from = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const to = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
  
  const timeDiff = to.getTime() - from.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  
  return daysDiff;
};

export const usePackageStatus = (): PackageStatus => {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) {
      return {
        hasPackage: false,
        packageType: 'none',
        isExpired: false,
        isExpiringSoon: false,
        daysUntilExpiry: 0,
        expireDate: null,
        purchaseDate: null
      };
    }

    const userData = user as any;
    const packageType = userData.package_type || 'none';
    const hasPackage = packageType !== 'none';
    const expireDate = userData.package_expire_date ? new Date(userData.package_expire_date) : null;
    const purchaseDate = userData.package_purchase_date ? new Date(userData.package_purchase_date) : null;

    // Debug logging - Raw data
    console.debug('usePackageStatus - Raw user data:', {
      userId: userData.id,
      packageType,
      hasPackage,
      package_expire_date_raw: userData.package_expire_date,
      package_purchase_date_raw: userData.package_purchase_date,
      expireDate: expireDate?.toISOString(),
      purchaseDate: purchaseDate?.toISOString()
    });

    if (!hasPackage || !expireDate) {
      return {
        hasPackage,
        packageType,
        isExpired: false,
        isExpiringSoon: false,
        daysUntilExpiry: 0,
        expireDate,
        purchaseDate
      };
    }

    const now = new Date();
    const isExpired = expireDate < now;
    
    // Sử dụng helper function để tính chính xác
    const daysUntilExpiry = calculateDaysDifference(now, expireDate);
    
    const isExpiringSoon = !isExpired && daysUntilExpiry <= 7;

    const result = {
      hasPackage,
      packageType,
      isExpired,
      isExpiringSoon,
      daysUntilExpiry: Math.max(0, daysUntilExpiry), // Đảm bảo không âm
      expireDate,
      purchaseDate
    };

    // Debug logging với thông tin chi tiết
    console.debug('usePackageStatus - Calculation details:', {
      now: now.toISOString(),
      expireDate: expireDate.toISOString(),
      nowLocal: now.toLocaleDateString('vi-VN'),
      expireDateLocal: expireDate.toLocaleDateString('vi-VN'),
      daysUntilExpiry,
      isExpired,
      isExpiringSoon,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });

    // Manual test với data của bạn
    if (process.env.NODE_ENV === 'development') {
      // Test case: Mua 6/7, hết hạn 9/7, hôm nay 8/7 → kết quả mong đợi: 1 ngày
      const testNow = new Date('2025-07-08T10:00:00');  // 8/7/2025 10:00 AM
      const testExpire = new Date('2025-07-09T23:59:59'); // 9/7/2025 11:59 PM
      const testDays = calculateDaysDifference(testNow, testExpire);
      console.log('🧪 TEST CASE:', {
        now: testNow.toLocaleDateString('vi-VN'),
        expire: testExpire.toLocaleDateString('vi-VN'),
        expectedDays: 1,
        calculatedDays: testDays,
        isCorrect: testDays === 1
      });
    }

    return result;
  }, [user]);
};

export default usePackageStatus;
