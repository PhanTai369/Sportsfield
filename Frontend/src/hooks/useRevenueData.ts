import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import revenueService, { 
  FieldRevenueData, 
  DashboardStats, 
  MonthlyRevenueData,
  RecentBookingData,
  PopularTimeSlotData,
  RecentReviewData
} from '../services/revenueService';

interface UseRevenueDataReturn {
  loading: boolean;
  error: string | null;
  stats: DashboardStats;
  fieldRevenue: FieldRevenueData[];
  monthlyRevenue: MonthlyRevenueData[];
  recentBookings: RecentBookingData[];
  popularTimeSlots: PopularTimeSlotData[];
  recentReviews: RecentReviewData[];
  refreshData: () => Promise<void>;
  usingMockData: boolean;
}

export const useRevenueData = (): UseRevenueDataReturn => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalBookings: 0,
    newCustomers: 0,
    averageRating: 0,
    totalReviews: 0,
    revenueGrowth: 0,
    bookingGrowth: 0,
    customerGrowth: 0,
    ratingGrowth: 0
  });
  const [fieldRevenue, setFieldRevenue] = useState<FieldRevenueData[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenueData[]>([]);
  const [recentBookings, setRecentBookings] = useState<RecentBookingData[]>([]);
  const [popularTimeSlots, setPopularTimeSlots] = useState<PopularTimeSlotData[]>([]);
  const [recentReviews, setRecentReviews] = useState<RecentReviewData[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Kiểm tra kết nối API backend...');
      
      // Kiểm tra kết nối backend trước
      const backendHealthy = await checkBackendConnection();
      
      if (!backendHealthy) {
        console.warn('⚠️ Backend không khả dụng, sử dụng dữ liệu mẫu');
        setUsingMockData(true);
        loadMockData();
        return;
      }
      
      console.log('🔄 Backend đã kết nối, thử tải dữ liệu revenue...');
      
      // Thử gọi API revenue, recent bookings, popular time slots và recent reviews
      const [revenueData, recentBookingsData, popularTimeSlotsData, recentReviewsData] = await Promise.all([
        revenueService.getAllRevenueData(),
        revenueService.getRecentBookings(5),
        revenueService.getPopularTimeSlots(5),
        revenueService.getRecentReviews(5)
      ]);
      
      setStats(revenueData.stats);
      setFieldRevenue(revenueData.fieldRevenue);
      setMonthlyRevenue(revenueData.monthlyRevenue);
      setRecentBookings(recentBookingsData);
      setPopularTimeSlots(popularTimeSlotsData);
      setRecentReviews(recentReviewsData);
      setUsingMockData(false);
      
      console.log('✅ Đã tải dữ liệu từ API thành công:', { revenueData, recentBookingsData, popularTimeSlotsData, recentReviewsData });
      
    } catch (error) {
      console.warn('⚠️ API revenue chưa được triển khai, sử dụng dữ liệu mẫu');
      console.error('Chi tiết lỗi:', error);
      
      // Không hiển thị lỗi cho user, chỉ sử dụng mock data
      setError(null);
      setUsingMockData(true);
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  // Kiểm tra kết nối backend cơ bản
  const checkBackendConnection = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://football-field-booking-backend.onrender.com'}/`);
      return response.ok;
    } catch (error) {
      console.error('Backend connection failed:', error);
      return false;
    }
  };

  const loadMockData = () => {
    // Don't set error state, just use mock data silently
    setError(null);
    
    // Use mock data as fallback
    setStats({
      totalRevenue: 120500000,
      totalBookings: 245,
      newCustomers: 87,
      averageRating: 4.3,
      totalReviews: 156,
      revenueGrowth: 16.5,
      bookingGrowth: 18.2,
      customerGrowth: 14.4,
      ratingGrowth: 8.7
    });
    
    setFieldRevenue([
      { id: '1', name: 'Sân Thường Nhật', revenue: 45200000, bookings: 78, growth: 18.5, percentage: 37.5, averageRating: 4.5, totalReviews: 42 },
      { id: '2', name: 'Sân Phủi Thọ', revenue: 32800000, bookings: 65, growth: 12.3, percentage: 27.2, averageRating: 4.2, totalReviews: 35 },
      { id: '3', name: 'Sân Hoa Lu', revenue: 24600000, bookings: 52, growth: 8.7, percentage: 20.4, averageRating: 4.3, totalReviews: 28 },
      { id: '4', name: 'Sân Kách Mễu', revenue: 18900000, bookings: 48, growth: 6.2, percentage: 15.7, averageRating: 4.1, totalReviews: 22 },
      { id: '5', name: 'Sân Tao Đàn', revenue: 15800000, bookings: 42, growth: 4.8, percentage: 13.1, averageRating: 4.4, totalReviews: 29 }
    ]);
    
    setMonthlyRevenue([
      { month: 'T1', revenue: 95000000 },
      { month: 'T2', revenue: 105000000 },
      { month: 'T3', revenue: 110000000 },
      { month: 'T4', revenue: 115000000 },
      { month: 'T5', revenue: 120500000 }
    ]);

    setRecentBookings([
      {
        id: '1',
        customerName: 'Nguyễn Văn A',
        fieldName: 'Sân Thường Nhật',
        date: '15/07/2025',
        status: 'payment_pending',
        avatar: 'NA'
      },
      {
        id: '2',
        customerName: 'Trần Văn B',
        fieldName: 'Sân Phủi Thọ',
        date: '16/07/2025',
        status: 'confirmed',
        avatar: 'TB'
      },
      {
        id: '3',
        customerName: 'Lê Thị C',
        fieldName: 'Sân Hoa Lu',
        date: '17/07/2025',
        status: 'cancelled',
        avatar: 'LC'
      },
      {
        id: '4',
        customerName: 'Phạm Văn D',
        fieldName: 'Sân Royal Việt',
        date: '18/07/2025',
        status: 'payment_pending',
        avatar: 'PD'
      },
      {
        id: '5',
        customerName: 'Hoàng Thị E',
        fieldName: 'Sân Tao Đàn',
        date: '19/07/2025',
        status: 'confirmed',
        avatar: 'HE'
      }
    ]);
    
    setPopularTimeSlots([
      { id: '1', timeRange: '18:00 - 20:00', bookings: 85, percentage: 90 },
      { id: '2', timeRange: '16:00 - 18:00', bookings: 72, percentage: 75 },
      { id: '3', timeRange: '20:00 - 22:00', bookings: 65, percentage: 65 },
      { id: '4', timeRange: '06:00 - 08:00', bookings: 48, percentage: 50 },
      { id: '5', timeRange: '08:00 - 10:00', bookings: 35, percentage: 35 }
    ]);
    
    setRecentReviews([
      {
        id: '1',
        userName: 'Nguyễn Văn Minh',
        fieldName: 'Sân Thường Nhật',
        rating: 5,
        comment: 'Sân cỏ chất lượng tuyệt vời! Không gian thoáng mát, dịch vụ chăm sóc khách hàng rất tốt. Sẽ quay lại lần sau.',
        avatar: 'NM',
        createdAt: '2025-07-15T08:00:00Z',
        timeAgo: '2 giờ trước'
      },
      {
        id: '2',
        userName: 'Trần Quang Huy',
        fieldName: 'Sân Phủi Thọ',
        rating: 4,
        comment: 'Sân đẹp, phục vụ tốt, giá cả hợp lý. Chỗ để xe rộng rãi. Nhân viên thân thiện và nhiệt tình.',
        avatar: 'TH',
        createdAt: '2025-07-16T10:30:00Z',
        timeAgo: '1 ngày trước'
      },
      {
        id: '3',
        userName: 'Lê Thị Bích Phương',
        fieldName: 'Sân Hoa Lu',
        rating: 3,
        comment: 'Sân ổn, tuy nhiên hệ thống ánh sáng buổi tối cần được cải thiện. Nhìn chung vẫn đáng để thử.',
        avatar: 'LP',
        createdAt: '2025-07-17T14:15:00Z',
        timeAgo: '3 ngày trước'
      },
      {
        id: '4',
        userName: 'Phạm Đức Thành',
        fieldName: 'Sân Kách Mễu',
        rating: 4,
        comment: 'Không gian thoải mái, nhân viên thân thiện. Cỏ nhân tạo mới nên chất lượng chơi rất tốt.',
        avatar: 'PT',
        createdAt: '2025-07-18T16:45:00Z',
        timeAgo: '5 ngày trước'
      },
      {
        id: '5',
        userName: 'Hoàng Thị Mai Anh',
        fieldName: 'Sân Tao Đàn',
        rating: 5,
        comment: 'Rất hài lòng với chất lượng sân và dịch vụ. Sẽ giới thiệu cho bạn bè. Giá cả công bằng!',
        avatar: 'HA',
        createdAt: '2025-07-19T18:20:00Z',
        timeAgo: '1 tuần trước'
      }
    ]);
    
    console.log('📊 Loaded mock revenue data successfully');
  };

  const refreshData = async () => {
    try {
      console.log('🔄 Làm mới dữ liệu...');
      await loadData();
      
      if (!usingMockData) {
        toast.success('Dữ liệu đã được cập nhật từ server');
      } else {
        toast.warning('Sử dụng dữ liệu mẫu do không kết nối được server');
      }
    } catch (error) {
      console.error('❌ Lỗi khi làm mới dữ liệu:', error);
      toast.error('Không thể cập nhật dữ liệu');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return {
    loading,
    error,
    stats,
    fieldRevenue,
    monthlyRevenue,
    recentBookings,
    popularTimeSlots,
    recentReviews,
    refreshData,
    usingMockData
  };
};
