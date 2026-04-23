import React, { useState, useEffect } from 'react';
import { SERVICE_PLANS, SERVICE_FEATURES, type ServicePlan } from '../../../types/servicePlans';
import { paymentService } from '../../../services/payment.service';
import { useAuth } from '../../../contexts/authContext';
import { usePackageStatus } from '../../../hooks/usePackageStatus';

interface ServicePlansProps {
  className?: string;
  onPlanSelect?: (planId: 'basic' | 'premium') => void;
  onCheckout?: (planId: 'basic' | 'premium') => void;
}

const ServicePlans: React.FC<ServicePlansProps> = ({ 
  className = '', 
  onPlanSelect,
  onCheckout 
}) => {
  const { user } = useAuth();
  const packageStatus = usePackageStatus();
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'premium'>('basic');
  const [currentPlan, setCurrentPlan] = useState<'basic' | 'premium' | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Nếu user đã mua gói thì setCurrentPlan
    if (user && (user as any).package_type && (user as any).package_type !== 'none') {
      setCurrentPlan((user as any).package_type);
      setSelectedPlan((user as any).package_type);
    }
  }, [user]);

  const handlePlanSelection = (plan: 'basic' | 'premium') => {
    setSelectedPlan(plan);
    onPlanSelect?.(plan);
  };

  const handleCheckout = async () => {
    onCheckout?.(selectedPlan);
    setLoading(true);
    try {
      const return_url = window.location.origin + '/payment/success';
      const cancel_url = window.location.origin + '/payment/cancel';
      const res = await paymentService.createPackagePayment({
        packageType: selectedPlan,
        return_url,
        cancel_url
      });
      if (res.checkout_url) {
        window.location.href = res.checkout_url;
      }
    } catch (err: any) {
      alert(err?.message || 'Không thể tạo phiên thanh toán.');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price);
  };

  const renderPlanCard = (plan: ServicePlan) => {
    const isCurrent = currentPlan === plan.id;
    const isExpired = packageStatus.isExpired && isCurrent;
    const isExpiringSoon = packageStatus.isExpiringSoon && isCurrent;
    
    return (
      <div 
        key={plan.id}
        className={`flex-1 border rounded-lg p-6 relative cursor-pointer transition-all duration-200 ${
          selectedPlan === plan.id 
            ? 'border-green-500 bg-green-50 shadow-lg' 
            : isCurrent
              ? isExpired 
                ? 'border-red-500 bg-red-50 shadow-md'
                : isExpiringSoon
                  ? 'border-orange-500 bg-orange-50 shadow-md'
                  : 'border-blue-500 bg-blue-50 shadow-md'
              : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => handlePlanSelection(plan.id)}
      >
        {isCurrent && (
          <div className={`absolute top-4 right-4 text-white rounded-full px-3 py-1 text-xs font-semibold shadow ${
            isExpired 
              ? 'bg-red-500' 
              : isExpiringSoon 
                ? 'bg-orange-500' 
                : 'bg-blue-500'
          }`}>
            {isExpired ? 'Đã hết hạn' : isExpiringSoon ? 'Sắp hết hạn' : 'Đã mua'}
          </div>
        )}
        {selectedPlan === plan.id && !isCurrent && (
          <div className="absolute top-4 right-4 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
            <i className="fas fa-check text-xs"></i>
          </div>
        )}
        
        <div className="mb-4">
          {plan.isPopular && (
            <div className="bg-green-500 text-white text-xs font-medium py-1 px-3 rounded inline-block mb-2">
              Phổ biến nhất
            </div>
          )}
          <h3 className="text-lg font-bold">{plan.name}</h3>
          <div className="mt-2">
            <span className="text-2xl font-bold text-green-500">{formatPrice(plan.price)}</span>
            <span className="text-sm text-gray-500 ml-1">{plan.currency}</span>
          </div>
          <div className="text-sm text-gray-500 mt-1">{plan.billingPeriod}</div>
        </div>
        
        <div className="space-y-3 mb-6">
          {plan.features.map((feature, index) => (
            <div key={index} className="flex items-start">
              <i className="fas fa-check text-green-500 mt-1 mr-2"></i>
              <span className="text-sm">{feature}</span>
            </div>
          ))}
        </div>
        
      </div>
    );
  };

  // Lấy ngày hết hạn gói dịch vụ từ dữ liệu người dùng
  const getExpireDate = () => {
    if (!user || !currentPlan) return null;
    
    // Lấy ngày hết hạn trực tiếp từ backend
    if ((user as any).package_expire_date) {
      const expireDate = new Date((user as any).package_expire_date);
      console.debug('ServicePlans - Expire date:', {
        raw: (user as any).package_expire_date,
        parsed: expireDate.toISOString(),
        local: expireDate.toLocaleDateString('vi-VN'),
        time: expireDate.toLocaleTimeString('vi-VN')
      });
      return expireDate;
    }
    
    // Nếu không có ngày hết hạn từ backend, tính tạm dựa trên ngày mua
    if ((user as any).package_purchase_date) {
      const purchaseDate = new Date((user as any).package_purchase_date);
      const expireDate = new Date(purchaseDate);
      let months = 1;
      if (currentPlan === 'premium') months = 6;
      expireDate.setMonth(expireDate.getMonth() + months);
      console.warn('ServicePlans: Không tìm thấy package_expire_date, tính toán dựa trên ngày mua');
      return expireDate;
    }
    
    return null;
  };

  const renderCurrentPlanStatus = () => {
    if (!currentPlan) return null;
    
    const plan = SERVICE_PLANS[currentPlan];
    const expireDate = getExpireDate();
    
    // Kiểm tra trạng thái gói
    const isExpired = packageStatus.isExpired;
    const isExpiringSoon = packageStatus.isExpiringSoon;
    
    if (isExpired) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
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
                  <strong>{expireDate?.toLocaleDateString('vi-VN')}</strong>.
                  Các sân của bạn đã bị vô hiệu hóa và không thể nhận đặt chỗ.
                </p>
              </div>
              <div className="mt-4">
                <a
                  href="/owner/service-plan-management"
                  className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-md transition-colors"
                >
                  Quản lý gói dịch vụ
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    if (isExpiringSoon) {
      const urgencyLevel = packageStatus.daysUntilExpiry <= 3 ? 'high' : 'medium';
      const bgColor = urgencyLevel === 'high' ? 'bg-orange-50' : 'bg-yellow-50';
      const borderColor = urgencyLevel === 'high' ? 'border-orange-200' : 'border-yellow-200';
      const iconColor = urgencyLevel === 'high' ? 'text-orange-500' : 'text-yellow-500';
      const textColor = urgencyLevel === 'high' ? 'text-orange-800' : 'text-yellow-800';
      const textDetailColor = urgencyLevel === 'high' ? 'text-orange-700' : 'text-yellow-700';
      
      return (
        <div className={`${bgColor} border ${borderColor} rounded-lg p-4 mb-8`}>
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
                  <strong>{expireDate?.toLocaleDateString('vi-VN')}</strong>{' '}
                  (còn <strong>{packageStatus.daysUntilExpiry} ngày</strong>).
                  Hãy gia hạn để đảm bảo dịch vụ không bị gián đoạn.
                </p>
              </div>
              <div className="mt-4">
                <a
                  href="/owner/service-plan-management"
                  className="bg-orange-600 hover:bg-orange-700 text-white text-sm px-4 py-2 rounded-md transition-colors"
                >
                  Gia hạn ngay
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // Hiển thị thông tin bình thường
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <i className="fas fa-info-circle text-blue-600 mr-2"></i>
            <div>
              <span className="text-sm font-medium text-blue-800">
                Gói hiện tại: {plan.name}
              </span>
              <div className="text-xs text-blue-600 mt-1">
                Hết hạn vào: {expireDate ? expireDate.toLocaleDateString('vi-VN') : '---'}
              </div>
            </div>
          </div>
          <a href="/owner/service-plan-management" className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors">
            Quản lý gói
          </a>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white min-h-screen ${className}`}>
      <div className="max-w-5xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <i className="fas fa-credit-card text-green-600 text-2xl mr-3"></i>
            <h1 className="text-2xl font-bold text-gray-800">Gói dịch vụ</h1>
          </div>
          <p className="text-gray-600">
            Quản lý sân bóng đá một cách chuyên nghiệp với các gói dịch vụ được thiết kế riêng cho chủ sân.
          </p>
        </div>
          {/* Current Plan Status */}
        {renderCurrentPlanStatus()}
        
        {/* Pricing Plans */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          {Object.values(SERVICE_PLANS).map(plan => renderPlanCard(plan))}
        </div>
        
        {/* Checkout Button */}
        <div className="text-center mb-8">
          <button 
            className={`py-3 px-6 rounded-md transition-colors duration-200 disabled:opacity-60 ${
              packageStatus.isExpired 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
            onClick={handleCheckout}
            disabled={loading || (currentPlan === selectedPlan && !packageStatus.isExpired)}
          >
            {packageStatus.isExpired 
              ? (loading ? 'Đang chuyển hướng...' : 'Gia hạn ngay để kích hoạt lại')
              : currentPlan === selectedPlan 
                ? 'Bạn đã mua gói này' 
                : (loading ? 'Đang chuyển hướng...' : 'Tiếp tục thanh toán')
            }
          </button>
          <p className="text-xs text-gray-500 mt-2">
            {packageStatus.isExpired 
              ? 'Gia hạn để kích hoạt lại các sân đã bị vô hiệu hóa'
              : 'Bạn có thể thay đổi hoặc hủy gói bất cứ lúc nào'
            }
          </p>
        </div>
        
        {/* Features */}
        <div className="border rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-6 text-center">Tại sao chọn SoccerField cho chủ sân?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SERVICE_FEATURES.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <i className={`${feature.icon} text-green-500`}></i>
                  </div>
                </div>
                <h3 className="font-medium mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServicePlans;
