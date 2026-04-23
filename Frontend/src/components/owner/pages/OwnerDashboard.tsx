import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import revenueService, { 
  FieldRevenueData, 
  MonthlyRevenueData,
  RecentBookingData,
  RecentReviewData,
  PopularTimeSlotData 
} from '../../../services/revenueService';
import { useRevenueData } from '../../../hooks/useRevenueData';

interface RecentBooking {
  id: string;
  customerName: string;
  fieldName: string;
  date: string;
  status: 'refund' | 'confirmed' | 'cancelled' | 'completed' | 'payment_pending';
  avatar: string;
}

interface PopularTimeSlot {
  id: string;
  timeRange: string;
  bookings: number;
  percentage: number;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
}

interface FieldRevenue {
  id: string;
  name: string;
  revenue: number;
  bookings: number;
  averageRating: number;
  totalReviews: number;
  growth: number;
  percentage: number;
}

const OwnerDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // Use the revenue data hook
  const { loading, error, stats, fieldRevenue, monthlyRevenue, recentBookings, popularTimeSlots, recentReviews, refreshData, usingMockData } = useRevenueData();

  // State for smart features
  const [showInsights, setShowInsights] = useState(true);
  const [dateRange, setDateRange] = useState('thisMonth');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Mock data states for features not yet implemented

  // Auto refresh functionality
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh && !usingMockData) {
      interval = setInterval(() => {
        refreshData();
      }, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, usingMockData, refreshData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatCurrencyShort = (amount: number) => {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + 'M ₫';
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(1) + 'K ₫';
    }
    return amount.toLocaleString('vi-VN') + ' ₫';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'refund':
      case 'payment_pending':
        return 'bg-yellow-100 text-yellow-600';
      case 'confirmed':
      case 'completed':
        return 'bg-green-100 text-green-600';
      case 'cancelled':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'refund':
        return 'Hoàn tiền';
      case 'confirmed':
        return 'Đã xác nhận';
      case 'cancelled':
        return 'Đã hủy';
      case 'completed':
        return 'Hoàn thành';
      case 'payment_pending':
        return 'Chờ thanh toán';
      default:
        return 'Đã xác nhận';
    }
  };

  // Smart insights generation
  const generateInsights = () => {
    const insights = [];
    
    // Revenue trend insight
    if (stats.revenueGrowth > 10) {
      insights.push({
        type: 'success',
        title: 'Doanh thu tăng mạnh',
        description: `Doanh thu tăng ${stats.revenueGrowth}% so với tháng trước. Xu hướng tích cực!`,
        action: 'Xem chi tiết doanh thu'
      });
    } else if (stats.revenueGrowth < -5) {
      insights.push({
        type: 'warning',
        title: 'Doanh thu giảm',
        description: `Doanh thu giảm ${Math.abs(stats.revenueGrowth)}%. Cần xem xét chiến lược marketing.`,
        action: 'Xem phân tích chi tiết'
      });
    }
    
    // Rating insight
    if (stats.averageRating < 3.5) {
      insights.push({
        type: 'warning',
        title: 'Điểm đánh giá cần cải thiện',
        description: `Điểm đánh giá trung bình chỉ ${stats.averageRating.toFixed(1)}/5. Cần cải thiện chất lượng dịch vụ.`,
        action: 'Xem đánh giá chi tiết'
      });
    } else if (stats.averageRating >= 4.5) {
      insights.push({
        type: 'success',
        title: 'Chất lượng dịch vụ xuất sắc',
        description: `Điểm đánh giá trung bình ${stats.averageRating.toFixed(1)}/5. Khách hàng rất hài lòng!`,
        action: 'Duy trì chất lượng'
      });
    }

    // Review growth insight
    if (stats.ratingGrowth > 10) {
      insights.push({
        type: 'success',
        title: 'Đánh giá ngày càng tích cực',
        description: `Điểm đánh giá tăng ${stats.ratingGrowth.toFixed(1)}% so với tháng trước. Khách hàng đánh giá cao!`,
        action: 'Xem xu hướng đánh giá'
      });
    } else if (stats.ratingGrowth < -5) {
      insights.push({
        type: 'warning',
        title: 'Đánh giá giảm',
        description: `Điểm đánh giá giảm ${Math.abs(stats.ratingGrowth).toFixed(1)}%. Cần xem xét chất lượng dịch vụ.`,
        action: 'Xem phản hồi khách hàng'
      });
    }
    
    // Popular time slots insight
    if (popularTimeSlots.length > 0) {
      const peakSlot = popularTimeSlots[0];
      if (peakSlot.percentage > 80) {
        insights.push({
          type: 'success',
          title: 'Khung giờ vàng',
          description: `Khung giờ ${peakSlot.timeRange} có tỷ lệ đặt cao ${peakSlot.percentage}%. Có thể áp dụng giá cao điểm.`,
          action: 'Cập nhật bảng giá'
        });
      }
    }
    
    // Recent bookings insight
    const refundBookings = recentBookings.filter(b => b.status === 'refund').length;
    if (refundBookings > 3) {
      insights.push({
        type: 'warning',
        title: 'Nhiều đơn cần hoàn tiền',
        description: `Có ${refundBookings} đơn đặt sân cần hoàn tiền. Hãy xử lý sớm để tránh mất khách.`,
        action: 'Xem đơn đặt sân'
      });
    }
    
    return insights;
  };

  const insights = generateInsights();

  const getAvatarColor = (avatar: string) => {
    const colors = [
      'bg-blue-100 text-blue-600',
      'bg-green-100 text-green-600',
      'bg-red-100 text-red-600',
      'bg-purple-100 text-purple-600',
      'bg-teal-100 text-teal-600'
    ];
    return colors[avatar.charCodeAt(0) % colors.length];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Đang tải dữ liệu dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <i className="fas fa-exclamation-triangle text-3xl"></i>
          </div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={refreshData}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <i className="fas fa-refresh mr-2"></i>
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Header with Gradient */}
      <div className="bg-gradient-to-r from-green-600 via-green-700 to-green-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">📊 Dashboard Thông Minh</h1>
              <p className="text-green-100">Quản lý sân bóng và phân tích dữ liệu thời gian thực</p>
              <div className="flex items-center space-x-4 mt-3">
                {usingMockData ? (
                  <div className="flex items-center space-x-2 text-sm bg-amber-500 bg-opacity-20 px-3 py-1 rounded-full border border-amber-300">
                    <i className="fas fa-exclamation-triangle text-amber-200"></i>
                    <span className="text-amber-100">Dữ liệu mẫu</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-sm bg-green-500 bg-opacity-20 px-3 py-1 rounded-full border border-green-300">
                    <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                    <span className="text-green-100">Dữ liệu thời gian thực</span>
                  </div>
                )}
                <div className="text-xs text-green-200">
                  <i className="fas fa-clock mr-1"></i>
                  Cập nhật: {new Date().toLocaleTimeString('vi-VN')}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Auto Refresh Toggle */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-green-100">Tự động cập nhật</span>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoRefresh ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                  disabled={usingMockData}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoRefresh ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              {/* Date Range Filter */}
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 bg-white bg-opacity-20 border border-green-300 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-300"
              >
                <option value="thisMonth" className="text-gray-900">Tháng này</option>
                <option value="lastMonth" className="text-gray-900">Tháng trước</option>
                <option value="thisQuarter" className="text-gray-900">Quý này</option>
                <option value="thisYear" className="text-gray-900">Năm này</option>
              </select>
              
              <button
                onClick={() => navigate('/owner/booking-statistics')}
                className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 border border-green-300 text-white px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                <i className="fas fa-chart-line"></i>
                <span>Thống kê chi tiết</span>
              </button>
              
              <button
                onClick={refreshData}
                className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 border border-green-300 text-white px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105"
                disabled={loading}
              >
                <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`}></i>
                <span>Làm mới</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Smart Insights Panel */}
        {showInsights && insights.length > 0 && (
          <div className="mb-8 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-6 border border-blue-200 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <i className="fas fa-brain text-white"></i>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">🧠 Thông Tin Thông Minh</h3>
                  <p className="text-sm text-gray-600">AI phân tích dữ liệu và đưa ra gợi ý tối ưu</p>
                </div>
              </div>
              <button
                onClick={() => setShowInsights(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-white hover:bg-opacity-50 transition-all"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insights.map((insight, index) => (
                <div key={index} className="bg-white rounded-xl p-5 shadow-md border border-gray-200 hover:shadow-lg transition-all duration-200 transform hover:scale-105">
                  <div className="flex items-start space-x-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      insight.type === 'success' ? 'bg-green-100 text-green-600' :
                      insight.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      <i className={`fas ${
                        insight.type === 'success' ? 'fa-check-circle' :
                        insight.type === 'warning' ? 'fa-exclamation-triangle' :
                        'fa-info-circle'
                      }`}></i>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 mb-2">{insight.title}</h4>
                      <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
                      <button className="text-sm text-blue-600 hover:text-blue-800 font-semibold hover:underline">
                        {insight.action} →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <i className="fas fa-dollar-sign text-white text-xl"></i>
              </div>
              <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-semibold ${
                stats.revenueGrowth > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                <i className={`fas ${stats.revenueGrowth > 0 ? 'fa-arrow-up' : 'fa-arrow-down'}`}></i>
                <span>{stats.revenueGrowth > 0 ? '+' : ''}{stats.revenueGrowth}%</span>
              </div>
            </div>
            <div className="text-sm text-gray-500 mb-2">Tổng doanh thu</div>
            <div className="text-3xl font-bold text-gray-900 mb-2">{formatCurrency(stats.totalRevenue)}</div>
            <div className="text-xs text-gray-400">so với tháng trước</div>
            {stats.revenueGrowth > 15 && (
              <div className="mt-3 flex items-center space-x-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                <i className="fas fa-fire"></i>
                <span>Tăng trưởng mạnh!</span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <i className="fas fa-calendar-check text-white text-xl"></i>
              </div>
              <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-semibold ${
                stats.bookingGrowth > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                <i className={`fas ${stats.bookingGrowth > 0 ? 'fa-arrow-up' : 'fa-arrow-down'}`}></i>
                <span>{stats.bookingGrowth > 0 ? '+' : ''}{stats.bookingGrowth}%</span>
              </div>
            </div>
            <div className="text-sm text-gray-500 mb-2">Lượt đặt sân</div>
            <div className="text-3xl font-bold text-gray-900 mb-2">{stats.totalBookings}</div>
            <div className="text-xs text-gray-400">so với tháng trước</div>
            {stats.totalBookings > 200 && (
              <div className="mt-3 flex items-center space-x-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                <i className="fas fa-star"></i>
                <span>Hoạt động tích cực!</span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <i className="fas fa-user-plus text-white text-xl"></i>
              </div>
              <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-semibold ${
                stats.customerGrowth > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                <i className={`fas ${stats.customerGrowth > 0 ? 'fa-arrow-up' : 'fa-arrow-down'}`}></i>
                <span>{stats.customerGrowth > 0 ? '+' : ''}{stats.customerGrowth}%</span>
              </div>
            </div>
            <div className="text-sm text-gray-500 mb-2">Khách hàng mới</div>
            <div className="text-3xl font-bold text-gray-900 mb-2">{stats.newCustomers}</div>
            <div className="text-xs text-gray-400">so với tháng trước</div>
            {stats.customerGrowth > 10 && (
              <div className="mt-3 flex items-center space-x-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                <i className="fas fa-rocket"></i>
                <span>Mở rộng tốt!</span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <i className="fas fa-star text-white text-xl"></i>
              </div>
              <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-semibold ${
                stats.ratingGrowth > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                <i className={`fas ${stats.ratingGrowth > 0 ? 'fa-arrow-up' : 'fa-arrow-down'}`}></i>
                <span>{stats.ratingGrowth > 0 ? '+' : ''}{stats.ratingGrowth.toFixed(1)}%</span>
              </div>
            </div>
            <div className="text-sm text-gray-500 mb-2">Điểm đánh giá trung bình</div>
            <div className="flex items-center space-x-2 mb-2">
              <div className="text-3xl font-bold text-gray-900">{stats.averageRating.toFixed(1)}</div>
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <i
                    key={i}
                    className={`fas fa-star text-sm ${
                      i < Math.floor(stats.averageRating) ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                  ></i>
                ))}
              </div>
            </div>
            <div className="text-xs text-gray-400">từ {stats.totalReviews} đánh giá</div>
            {stats.averageRating < 3.5 && (
              <div className="mt-3 flex items-center space-x-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                <i className="fas fa-exclamation-triangle"></i>
                <span>Cần cải thiện chất lượng</span>
              </div>
            )}
            {stats.averageRating >= 4.5 && (
              <div className="mt-3 flex items-center space-x-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                <i className="fas fa-medal"></i>
                <span>Chất lượng xuất sắc!</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">            {/* Enhanced Revenue Chart */}
          <div className="col-span-1 lg:col-span-2 bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <i className="fas fa-chart-line text-white"></i>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">📈 Biểu đồ Doanh Thu</h3>
                  <p className="text-sm text-gray-500">Xu hướng doanh thu theo tháng</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm text-gray-500">Tổng doanh thu:</div>
                  <div className="text-xl font-bold text-green-600">
                    {formatCurrencyShort(monthlyRevenue.reduce((sum, item) => sum + item.revenue, 0))}
                  </div>
                </div>
                <button 
                  onClick={() => navigate('/owner/reports')}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105"
                >
                  <i className="fas fa-chart-bar"></i>
                  <span>Xem chi tiết</span>
                </button>
              </div>
            </div>

            {/* Revenue Statistics Summary - Improved */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700">Doanh thu dự kiến</p>
                    <p className="text-lg font-bold text-green-900">
                      {(() => {
                        // Tính doanh thu dự kiến cho tháng hiện tại
                        const currentMonth = new Date().getMonth();
                        const currentDate = new Date().getDate();
                        const daysInMonth = new Date(new Date().getFullYear(), currentMonth + 1, 0).getDate();
                        
                        if (monthlyRevenue.length > 0) {
                          const currentRevenue = monthlyRevenue[monthlyRevenue.length - 1]?.revenue || 0;
                          const projectedRevenue = (currentRevenue / currentDate) * daysInMonth;
                          return formatCurrencyShort(projectedRevenue);
                        }
                        return '0 ₫';
                      })()}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <i className="fas fa-chart-line text-white text-sm"></i>
                  </div>
                </div>
                <div className="text-xs text-green-600 mt-1">
                  Theo xu hướng hiện tại
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Doanh thu/đặt sân</p>
                    <p className="text-lg font-bold text-blue-900">
                      {stats.totalBookings > 0 ? 
                        formatCurrencyShort(stats.totalRevenue / stats.totalBookings) : 
                        '0 ₫'
                      }
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <i className="fas fa-calculator text-white text-sm"></i>
                  </div>
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  Giá trị trung bình/lượt
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700">Xu hướng 3 tháng</p>
                    <p className="text-lg font-bold text-purple-900">
                      {(() => {
                        // Tính xu hướng 3 tháng gần nhất
                        if (monthlyRevenue.length >= 3) {
                          const last3Months = monthlyRevenue.slice(-3);
                          const firstMonth = last3Months[0].revenue;
                          const lastMonth = last3Months[2].revenue;
                          const trend = firstMonth > 0 ? ((lastMonth - firstMonth) / firstMonth) * 100 : 0;
                          return `${trend > 0 ? '+' : ''}${trend.toFixed(1)}%`;
                        }
                        return 'Chưa đủ dữ liệu';
                      })()}
                    </p>
                  </div>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    (() => {
                      if (monthlyRevenue.length >= 3) {
                        const last3Months = monthlyRevenue.slice(-3);
                        const firstMonth = last3Months[0].revenue;
                        const lastMonth = last3Months[2].revenue;
                        const trend = firstMonth > 0 ? ((lastMonth - firstMonth) / firstMonth) * 100 : 0;
                        return trend > 0 ? 'bg-green-500' : 'bg-red-500';
                      }
                      return 'bg-gray-500';
                    })()
                  }`}>
                    <i className={`fas ${
                      (() => {
                        if (monthlyRevenue.length >= 3) {
                          const last3Months = monthlyRevenue.slice(-3);
                          const firstMonth = last3Months[0].revenue;
                          const lastMonth = last3Months[2].revenue;
                          const trend = firstMonth > 0 ? ((lastMonth - firstMonth) / firstMonth) * 100 : 0;
                          return trend > 0 ? 'fa-trending-up' : 'fa-trending-down';
                        }
                        return 'fa-minus';
                      })()
                    } text-white text-sm`}></i>
                  </div>
                </div>
                <div className="text-xs text-purple-600 mt-1">
                  Tăng/giảm dài hạn
                </div>
              </div>
            </div>

            {/* Quick Insights - Revenue Focused */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl mb-6 border border-indigo-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <i className="fas fa-lightbulb text-white text-sm"></i>
                  </div>
                  <h4 className="font-bold text-gray-900"> Hiệu suất doanh thu</h4>
                </div>
                <button 
                  onClick={() => navigate('/owner/reports')}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium hover:underline"
                >
                  Xem đầy đủ →
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Tỷ lệ lấp đầy</span>
                    <span className="text-sm font-bold text-blue-600">
                      {(() => {
                        // Tính tỷ lệ lấp đầy thực tế hơn
                        const fieldsCount = fieldRevenue.length || 5; // Giả sử có 5 sân
                        const slotsPerField = 12; // 12 khung giờ/sân/ngày
                        const daysInMonth = 30;
                        const totalSlots = fieldsCount * slotsPerField * daysInMonth;
                        const bookedSlots = stats.totalBookings;
                        const occupancyRate = Math.min(Math.round((bookedSlots / totalSlots) * 100), 100);
                        return `${occupancyRate}%`;
                      })()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {(() => {
                      const fieldsCount = fieldRevenue.length || 5;
                      const slotsPerField = 12;
                      const daysInMonth = 30;
                      const totalSlots = fieldsCount * slotsPerField * daysInMonth;
                      const bookedSlots = stats.totalBookings;
                      const occupancyRate = Math.round((bookedSlots / totalSlots) * 100);
                      
                      if (occupancyRate < 30) return 'Còn nhiều khung trống';
                      if (occupancyRate < 70) return 'Mức độ trung bình';
                      return 'Hiệu suất cao';
                    })()}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Khung giờ vàng</span>
                    <span className="text-sm font-bold text-green-600">
                      {popularTimeSlots.length > 0 ? popularTimeSlots[0].timeRange : '18:00-21:00'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {popularTimeSlots.length > 0 
                      ? `${popularTimeSlots[0].percentage}% tổng lượt đặt` 
                      : 'Khung giờ có doanh thu cao nhất'}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Enhanced Chart */}
            <div className="flex items-end justify-between h-64 space-x-2 p-4 bg-gray-50 rounded-xl">
              {monthlyRevenue.length > 0 ? (
                monthlyRevenue.map((data, index) => {
                  const maxRevenue = Math.max(...monthlyRevenue.map(r => r.revenue));
                  const height = maxRevenue > 0 ? (data.revenue / maxRevenue) * 200 : 0;
                  const isCurrentMonth = index === monthlyRevenue.length - 1;
                  const isHighest = data.revenue === maxRevenue;
                  
                  return (
                    <div key={index} className="flex flex-col items-center group flex-1">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-500 relative shadow-lg ${
                          isCurrentMonth 
                            ? 'bg-gradient-to-t from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500' 
                            : isHighest
                              ? 'bg-gradient-to-t from-green-600 to-green-400 hover:from-green-700 hover:to-green-500 ring-2 ring-yellow-400'
                              : 'bg-gradient-to-t from-gray-500 to-gray-400 hover:from-gray-600 hover:to-gray-500'
                        }`}
                        style={{ height: `${height}px` }}
                      >
                        {isHighest && (
                          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                            <i className="fas fa-crown text-yellow-500 text-sm"></i>
                          </div>
                        )}
                        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-10">
                          <div className="font-semibold">{formatCurrencyShort(data.revenue)}</div>
                          <div className="text-xs text-gray-300">
                            {index > 0 && monthlyRevenue[index - 1] ? (
                              <>
                                {data.revenue > monthlyRevenue[index - 1].revenue ? '↗' : '↘'} 
                                {Math.abs(((data.revenue - monthlyRevenue[index - 1].revenue) / monthlyRevenue[index - 1].revenue) * 100).toFixed(1)}%
                              </>
                            ) : (
                              'Tháng đầu tiên'
                            )}
                          </div>
                        </div>
                      </div>
                      <span className={`text-sm font-medium mt-3 ${
                        isCurrentMonth ? 'text-blue-600' : 'text-gray-600'
                      }`}>
                        {data.month}
                        {isCurrentMonth && (
                          <div className="text-xs text-blue-500 mt-1">Hiện tại</div>
                        )}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center justify-center w-full h-full text-gray-500">
                  <div className="text-center">
                    <i className="fas fa-chart-line text-4xl mb-3 text-gray-300"></i>
                    <p className="text-lg font-medium">Không có dữ liệu doanh thu</p>
                    <p className="text-sm">Dữ liệu sẽ hiển thị khi có đặt sân</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Recent Bookings */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <i className="fas fa-calendar-alt text-white"></i>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">📅 Đặt Sân Gần Đây</h3>
                  <p className="text-sm text-gray-500">Hoạt động mới nhất</p>
                </div>
              </div>
              {!usingMockData && (
                <div className="flex items-center space-x-2 text-xs text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Live</span>
                </div>
              )}
            </div>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  <i className="fas fa-clock mr-1"></i>
                  Có {recentBookings.filter(b => b.status === 'refund' || b.status === 'payment_pending').length} đặt sân cần xử lý
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => navigate('/owner/booking-statistics')}
                    className="text-green-600 hover:text-green-800 text-xs font-semibold hover:underline"
                  >
                    Xem chi tiết →
                  </button>
                  {recentBookings.filter(b => b.status === 'refund' || b.status === 'payment_pending').length > 0 && (
                    <button className="text-blue-600 hover:text-blue-800 text-xs font-semibold hover:underline">
                      Xử lý ngay →
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              {recentBookings.map((booking, index) => (
                <div key={booking.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-all duration-200">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${getAvatarColor(booking.avatar)}`}>
                      <span className="text-sm">{booking.avatar}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{booking.customerName}</div>
                      <div className="text-xs text-gray-500 flex items-center space-x-1">
                        <i className="fas fa-map-marker-alt"></i>
                        <span>{booking.fieldName}</span>
                        <span>•</span>
                        <span>{booking.date}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {booking.status === 'refund' && (
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    )}
                    <button className={`px-3 py-1 text-xs rounded-full font-medium whitespace-nowrap cursor-pointer transition-all ${getStatusColor(booking.status)}`}>
                      {getStatusText(booking.status)}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced Bottom Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Field Revenue */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <i className="fas fa-chart-bar text-white"></i>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">💰 Doanh Thu Theo Sân</h3>
                  <p className="text-sm text-gray-500">Hiệu suất từng sân bóng</p>
                </div>
              </div>
            </div>
            
            {fieldRevenue.length > 0 ? (
              <div className="space-y-4">
                {fieldRevenue.map((field, index) => (
                  <div key={field.id} className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-all duration-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white ${
                          index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                          index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-600' :
                          index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                          'bg-gradient-to-r from-green-400 to-green-600'
                        }`}>
                          <span className="text-xs">#{index + 1}</span>
                        </div>
                        <div>
                          <span className="text-sm font-bold text-gray-900">{field.name}</span>
                          <div className="text-xs text-gray-500">
                            {field.bookings} lượt đặt tháng này • {field.totalReviews} đánh giá tổng
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">{formatCurrencyShort(field.revenue)}</div>
                        <div className="text-xs text-gray-500">{field.percentage}% tổng doanh thu</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <i className="fas fa-star text-yellow-500 text-sm"></i>
                          <span className="text-sm font-medium text-gray-700">
                            {field.averageRating > 0 ? `${field.averageRating}/5` : 'Chưa có đánh giá'}
                          </span>
                          {field.totalReviews > 0 && (
                            <span className="text-xs text-gray-500">({field.totalReviews})</span>
                          )}
                        </div>
                        {field.averageRating >= 4.5 && (
                          <div className="flex items-center space-x-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                            <i className="fas fa-medal"></i>
                            <span>Xuất sắc</span>
                          </div>
                        )}
                        {field.averageRating > 0 && field.averageRating < 3.5 && (
                          <div className="flex items-center space-x-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                            <i className="fas fa-exclamation-triangle"></i>
                            <span>Cần cải thiện</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500 shadow-sm" 
                        style={{ width: `${field.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <i className="fas fa-chart-pie text-4xl mb-3 text-gray-300"></i>
                <p className="text-lg font-medium">Chưa có dữ liệu doanh thu</p>
                <p className="text-sm">Dữ liệu sẽ hiển thị khi có đặt sân</p>
              </div>
            )}
          </div>

          {/* Recent Reviews */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <i className="fas fa-comments text-white"></i>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Đánh Giá Gần Đây</h3>
                  <p className="text-sm text-gray-500">Phản hồi từ khách hàng</p>
                </div>
              </div>
              {!usingMockData && (
                <div className="flex items-center space-x-2 text-xs text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Live</span>
                </div>
              )}
            </div>
            
            {recentReviews.length > 0 ? (
              <div className="space-y-4">
                {recentReviews.map((review, index) => (
                  <div key={review.id} className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-all duration-200 group">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg">
                        <span className="text-sm">{review.avatar}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{review.userName}</div>
                            <div className="text-xs text-gray-500 flex items-center space-x-1">
                              <i className="fas fa-map-marker-alt"></i>
                              <span>{review.fieldName}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-1">
                              {[...Array(5)].map((_, i) => (
                                <i
                                  key={i}
                                  className={`fas fa-star text-xs ${
                                    i < review.rating ? 'text-yellow-400' : 'text-gray-300'
                                  }`}
                                ></i>
                              ))}
                              <span className="text-xs text-gray-600 ml-1">{review.rating}/5</span>
                            </div>
                            <span className="text-xs text-gray-500">{review.timeAgo}</span>
                          </div>
                        </div>
                        <div className="bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-sm">
                          <p className="text-sm text-gray-700 leading-relaxed">
                            "{review.comment}"
                          </p>
                        </div>
                        {/* Thêm actions cho từng review */}
                        <div className="flex items-center justify-between mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex items-center space-x-2">
                            {review.rating >= 4 && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                <i className="fas fa-thumbs-up mr-1"></i>
                                Tích cực
                              </span>
                            )}
                            {review.rating === 3 && (
                              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                                <i className="fas fa-minus mr-1"></i>
                                Trung bình
                              </span>
                            )}
                            {review.rating < 3 && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                                <i className="fas fa-thumbs-down mr-1"></i>
                                Cần cải thiện
                              </span>
                            )}
                          </div>
                          <button className="text-xs text-blue-600 hover:text-blue-800 hover:underline">
                            Phản hồi
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Thêm summary stats */}
                <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-blue-700">
                        <i className="fas fa-chart-line mr-1"></i>
                        Trung bình: <span className="font-semibold">{(recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentReviews.length).toFixed(1)}/5</span>
                      </div>
                      <div className="text-sm text-blue-700">
                        <i className="fas fa-comments mr-1"></i>
                        <span className="font-semibold">{recentReviews.length}</span> đánh giá gần đây
                      </div>
                    </div>
                    <button 
                      onClick={() => navigate('/owner/reviews-management')}
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Xem tất cả →
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <i className="fas fa-comments text-4xl mb-3 text-gray-300"></i>
                <p className="text-lg font-medium">Chưa có đánh giá nào</p>
                <p className="text-sm">Đánh giá sẽ hiển thị khi khách hàng bình luận</p>
              </div>
            )}
          </div>

          {/* Popular Time Slots */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <i className="fas fa-clock text-white"></i>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">🕐 Khung Giờ Phổ Biến</h3>
                  <p className="text-sm text-gray-500">Thời gian được ưa chuộng</p>
                </div>
              </div>
            </div>
            
            {popularTimeSlots.length > 0 ? (
              <div className="space-y-4">
                {popularTimeSlots.map((slot, index) => (
                  <div key={slot.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-all">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white ${
                        index === 0 ? 'bg-gradient-to-r from-red-400 to-red-600' :
                        index === 1 ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                        index === 2 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                        'bg-gradient-to-r from-purple-400 to-purple-600'
                      }`}>
                        <i className="fas fa-clock text-xs"></i>
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{slot.timeRange}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {slot.bookings} lượt đặt
                      </span>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${slot.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold text-gray-900 w-10">{slot.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <i className="fas fa-clock text-4xl mb-3 text-gray-300"></i>
                <p className="text-lg font-medium">Chưa có dữ liệu khung giờ</p>
                <p className="text-sm">Dữ liệu sẽ hiển thị khi có đặt sân</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
