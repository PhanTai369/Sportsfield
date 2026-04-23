import React, { useState, useEffect } from 'react';
import { SERVICE_PLANS, SERVICE_FEATURES, type ServicePlan } from '../../../types/servicePlans';
import { paymentService } from '../../../services/payment.service';
import { useAuth } from '../../../contexts/authContext';
import { authApi } from '../../../lib/api';
import { toast } from 'sonner';
import { usePackageStatus } from '../../../hooks/usePackageStatus';

const ServicePlanManagement: React.FC = () => {
  const { user } = useAuth();
  const packageStatus = usePackageStatus();
  const [currentPlan, setCurrentPlan] = useState<'basic' | 'premium' | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState<Date | null>(null);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);

  useEffect(() => {
    if (user && (user as any).package_type && (user as any).package_type !== 'none') {
      setCurrentPlan((user as any).package_type);
      
      // Lấy ngày mua gói
      if ((user as any).package_purchase_date) {
        const purchaseDate = new Date((user as any).package_purchase_date);
        setPurchaseDate(purchaseDate);
      }
      
      // Lấy ngày hết hạn trực tiếp từ backend
      if ((user as any).package_expire_date) {
        setExpiryDate(new Date((user as any).package_expire_date));
      } else {
        // Nếu không có ngày hết hạn từ backend, tính tạm dựa trên ngày mua
        if ((user as any).package_purchase_date) {
          const purchaseDate = new Date((user as any).package_purchase_date);
          const expiry = new Date(purchaseDate);
          let months = 1;
          if ((user as any).package_type === 'premium') months = 6;
          expiry.setMonth(expiry.getMonth() + months);
          setExpiryDate(expiry);
          console.warn('Không tìm thấy package_expire_date, sử dụng tính toán thủ công');
        }
      }
    }
  }, [user]);

  // Hàm xử lý gia hạn gói
  const handleRenewPlan = async () => {
    if (!currentPlan) {
      toast.error('Không tìm thấy thông tin gói dịch vụ hiện tại');
      return;
    }

    setLoading(true);
    try {
      const return_url = window.location.origin + '/owner/service-plan-management?renewal=success';
      const cancel_url = window.location.origin + '/owner/service-plan-management?renewal=cancel';
      
      const res = await paymentService.createPackagePayment({
        packageType: currentPlan,
        return_url,
        cancel_url
      });
      
      if (res.checkout_url) {
        window.location.href = res.checkout_url;
      }
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tạo phiên thanh toán.');
    } finally {
      setLoading(false);
    }
  };

  // Cập nhật dữ liệu người dùng sau khi thanh toán thành công
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const renewalStatus = urlParams.get('renewal');
    
    if (renewalStatus === 'success') {
      // Tạo thông báo thành công
      toast.success('Gia hạn gói dịch vụ thành công!');
      
      // Refresh dữ liệu người dùng
      const refreshUserData = async () => {
        try {
          const userData = await authApi.getCurrentUser();
          if (userData && userData.user) {
            // Lưu vào localStorage hoặc sessionStorage tùy theo nơi đã lưu token
            if (localStorage.getItem('token')) {
              localStorage.setItem('user', JSON.stringify(userData.user));
            } else {
              sessionStorage.setItem('user', JSON.stringify(userData.user));
            }
            
            // Cập nhật state của currentPlan và các ngày
            setCurrentPlan((userData.user as any).package_type);
            
            // Lấy ngày mua gói
            if ((userData.user as any).package_purchase_date) {
              const purchaseDate = new Date((userData.user as any).package_purchase_date);
              setPurchaseDate(purchaseDate);
            }
            
            // Lấy ngày hết hạn trực tiếp từ backend
            if ((userData.user as any).package_expire_date) {
              setExpiryDate(new Date((userData.user as any).package_expire_date));
            } else {
              // Nếu không có ngày hết hạn từ backend, tính tạm dựa trên ngày mua
              if ((userData.user as any).package_purchase_date) {
                const purchaseDate = new Date((userData.user as any).package_purchase_date);
                const expiry = new Date(purchaseDate);
                let months = 1;
                if ((userData.user as any).package_type === 'premium') months = 6;
                expiry.setMonth(expiry.getMonth() + months);
                setExpiryDate(expiry);
                console.warn('Không tìm thấy package_expire_date trong dữ liệu cập nhật');
              }
            }
          }
        } catch (error) {
          console.error('Không thể cập nhật dữ liệu người dùng:', error);
        }
      };
      
      refreshUserData();
      
      // Xóa query params
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (renewalStatus === 'cancel') {
      toast.error('Quá trình gia hạn đã bị hủy.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('vi-VN');
  };

  if (!currentPlan) {
    return (
      <div className="bg-white min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-6">
            <i className="fas fa-credit-card text-red-600 text-2xl mr-3"></i>
            <h1 className="text-2xl font-bold text-gray-800">Quản lý Gói Dịch vụ</h1>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-6">
            <div className="flex items-center mb-4">
              <i className="fas fa-exclamation-triangle text-orange-500 text-xl mr-3"></i>
              <h2 className="text-lg font-semibold text-orange-800">Bạn chưa đăng ký gói dịch vụ nào</h2>
            </div>
            <p className="text-gray-700 mb-4">
              Để sử dụng đầy đủ tính năng quản lý sân bóng, vui lòng đăng ký một gói dịch vụ.
            </p>
            <a 
              href="/owner/service-plans" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Xem các gói dịch vụ
            </a>
          </div>
        </div>
      </div>
    );
  }

  const plan = SERVICE_PLANS[currentPlan];

  return (
    <div className="bg-white min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <i className="fas fa-credit-card text-green-600 text-2xl mr-3"></i>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý Gói Dịch vụ</h1>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">{plan.name}</h2>
              <p className="text-gray-600 text-sm">
                Gói dịch vụ hiện tại của bạn
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                packageStatus.isExpired 
                  ? 'bg-red-100 text-red-800'
                  : packageStatus.isExpiringSoon
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-green-100 text-green-800'
              }`}>
                <span className={`h-2 w-2 rounded-full mr-1 ${
                  packageStatus.isExpired 
                    ? 'bg-red-500'
                    : packageStatus.isExpiringSoon
                      ? 'bg-orange-500'
                      : 'bg-green-500'
                }`}></span>
                {packageStatus.isExpired 
                  ? 'Đã hết hạn'
                  : packageStatus.isExpiringSoon
                    ? `Còn ${packageStatus.daysUntilExpiry} ngày`
                    : 'Đang hoạt động'
                }
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Chi phí</h3>
              <p className="text-lg font-semibold text-gray-900">
                {formatPrice(plan.price)} {plan.currency} <span className="text-sm font-normal text-gray-500">/ {plan.billingPeriod}</span>
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Trạng thái</h3>
              <div className="flex flex-col">
                <p className="text-gray-900 font-medium mb-1">
                  Ngày bắt đầu: <span className="font-normal">{formatDate(purchaseDate)}</span>
                </p>
                <p className="text-gray-900 font-medium">
                  Ngày hết hạn: <span className="font-normal">{formatDate(expiryDate)}</span>
                </p>
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Tính năng của gói</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {plan.features.map((feature, index) => (
                <div key={index} className="flex items-start">
                  <i className="fas fa-check text-green-500 mt-1 mr-2"></i>
                  <span className="text-sm text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center">
              <div className="mb-4 md:mb-0">
                <h3 className="text-sm font-medium text-gray-900 mb-1">Gia hạn gói dịch vụ</h3>
                <p className="text-sm text-gray-500">
                  Thời gian sẽ được cộng dồn vào ngày hết hạn hiện tại
                </p>
              </div>
              <button
                onClick={handleRenewPlan}
                disabled={loading}
                className={`py-2 px-4 rounded-md flex items-center justify-center transition-colors duration-200 disabled:opacity-60 text-white ${
                  packageStatus.isExpired 
                    ? 'bg-red-600 hover:bg-red-700'
                    : packageStatus.isExpiringSoon
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sync-alt mr-2"></i>
                    {packageStatus.isExpired ? 'Gia hạn ngay' : 'Gia hạn thêm'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
          <div className="flex items-start">
            <i className="fas fa-info-circle text-blue-600 text-lg mt-0.5 mr-3"></i>
            <div>
              <h3 className="font-medium text-blue-800 mb-1">Thông tin gia hạn</h3>
              <ul className="text-sm text-blue-700 space-y-2">
                <li>• Gói dịch vụ sẽ tự động hết hạn vào ngày kết thúc.</li>
                <li>• Khi gia hạn, thời gian sẽ được cộng dồn vào ngày hết hạn hiện tại.</li>
                <li>• Bạn có thể gia hạn trước khi gói hết hạn để đảm bảo dịch vụ liên tục.</li>
                <li>• Nếu muốn chuyển đổi gói dịch vụ, vui lòng đợi gói hiện tại hết hạn.</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="mt-6 text-right">
          <a 
            href="/owner/service-plans" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            <span>Xem tất cả các gói dịch vụ</span>
            <i className="fas fa-arrow-right ml-1 text-sm"></i>
          </a>
        </div>
      </div>
    </div>
  );
};

export default ServicePlanManagement;
