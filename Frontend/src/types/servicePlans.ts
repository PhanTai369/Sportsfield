export interface ServicePlan {
  id: 'basic' | 'premium';
  name: string;
  price: number;
  currency: string;
  billingPeriod: string;
  features: string[];
  isPopular?: boolean;
  maxFields?: number;
}

export interface ServicePlanFeature {
  icon: string;
  title: string;
  description: string;
}

export const SERVICE_PLANS: Record<'basic' | 'premium', ServicePlan> = {
  basic: {
    id: 'basic',
    name: 'Gói Chủ Sân Cơ Bản',
    price: 599000,
    currency: 'VNĐ',
    billingPeriod: '1 tháng',
    isPopular: true,
    maxFields: 2,
    features: [
      'Quản lý tối đa 2 sân bóng',
      'Dashboard cơ bản',
      'Quản lý lịch đặt sân',
      'Báo cáo doanh thu cơ bản',
      'Hỗ trợ khách hàng 24/7'
    ]
  },
  premium: {
    id: 'premium',
    name: 'Gói Chủ Sân Cao Cấp',
    price: 3099000,
    currency: 'VNĐ',
    billingPeriod: '6 tháng',
    features: [
      'quản lý 5 sân bóng',
      'Chức năng thống kê sân nâng cao',
      'Quản lý lịch đặt sân thông minh',
      'Báo cáo doanh thu chi tiết với biểu đồ',
      'Thiết lập giá sân linh hoạt theo khung giờ',
      'Hỗ trợ chủ sân chuyên biệt ưu tiên',
      'Dashboard quản lý chuyên nghiệp',
      'Tính năng marketing và khuyến mãi',
      'API tích hợp cho ứng dụng riêng'
    ]
  }
};

export const SERVICE_FEATURES: ServicePlanFeature[] = [
  {
    icon: 'fas fa-tasks',
    title: 'Quản lý chuyên nghiệp',
    description: 'Hệ thống quản lý sân bóng toàn diện, dễ sử dụng'
  },
  {
    icon: 'fas fa-chart-line',
    title: 'Báo cáo chi tiết',
    description: 'Theo dõi doanh thu và hiệu suất kinh doanh'
  },
  {
    icon: 'fas fa-headset',
    title: 'Hỗ trợ tận tâm',
    description: 'Đội ngũ hỗ trợ chuyên biệt dành cho chủ sân'
  }
];
