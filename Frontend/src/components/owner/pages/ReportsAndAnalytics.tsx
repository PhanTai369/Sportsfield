import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useRevenueData } from '../../../hooks/useRevenueData';
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  Radar, ComposedChart, ScatterChart, Scatter, ReferenceLine
} from 'recharts';

interface ChartData {
  name: string;
  value: number;
  percentage?: number;
  growth?: number;
  fill?: string;
}

interface HourlyData {
  hour: string;
  revenue: number;
  bookings: number;
  averagePrice: number;
  occupancy: number;
}

interface DailyData {
  date: string;
  revenue: number;
  bookings: number;
  dayOfWeek: string;
  occupancy: number;
}

interface PeakTimeAnalysis {
  timeSlot: string;
  revenue: number;
  bookings: number;
  occupancy: number;
  avgPrice: number;
  demand: 'high' | 'medium' | 'low';
}

const ReportsAndAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const { loading, error, stats, fieldRevenue, monthlyRevenue, recentBookings, popularTimeSlots, refreshData, usingMockData } = useRevenueData();
  
  // State for filters
  const [dateRange, setDateRange] = useState<'7days' | '30days' | '90days' | '6months' | '1year' | 'custom'>('30days');
  const [selectedField, setSelectedField] = useState<string>('all');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area' | 'composed'>('line');
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  
  // Mock data for advanced analytics
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [weeklyComparison, setWeeklyComparison] = useState<any[]>([]);
  const [peakTimeAnalysis, setPeakTimeAnalysis] = useState<PeakTimeAnalysis[]>([]);
  const [revenueDistribution, setRevenueDistribution] = useState<ChartData[]>([]);
  const [performanceRadar, setPerformanceRadar] = useState<any[]>([]);

  useEffect(() => {
    generateMockData();
  }, [dateRange, selectedField]);

  const generateMockData = () => {
    // Generate hourly data
    const hours = Array.from({ length: 24 }, (_, i) => {
      const hour = i.toString().padStart(2, '0') + ':00';
      const isGoldenHour = i >= 17 && i <= 21;
      const baseRevenue = isGoldenHour ? 800000 : 300000;
      const randomFactor = 0.5 + Math.random();
      const revenue = Math.floor(baseRevenue * randomFactor);
      const bookings = Math.floor(revenue / 150000);
      
      return {
        hour,
        revenue,
        bookings,
        averagePrice: 150000,
        occupancy: Math.min(100, Math.floor((bookings / 4) * 100))
      };
    });
    setHourlyData(hours);

    // Generate daily data for last 30 days
    const days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const dayOfWeek = date.toLocaleDateString('vi-VN', { weekday: 'long' });
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      
      const baseRevenue = isWeekend ? 800000 : 500000;
      const randomFactor = 0.7 + Math.random() * 0.6;
      const revenue = Math.floor(baseRevenue * randomFactor);
      const bookings = Math.floor(revenue / 150000);
      
      return {
        date: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        revenue,
        bookings,
        dayOfWeek,
        occupancy: Math.min(100, Math.floor((bookings / 8) * 100))
      };
    });
    setDailyData(days);

    // Generate weekly comparison
    const weeks = ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'].map(week => ({
      week,
      thisYear: Math.floor(15000000 + Math.random() * 5000000),
      lastYear: Math.floor(12000000 + Math.random() * 4000000)
    }));
    setWeeklyComparison(weeks);

    // Generate peak time analysis
    const peakTimes = [
      { timeSlot: '06:00-08:00', demand: 'medium' as const },
      { timeSlot: '08:00-10:00', demand: 'low' as const },
      { timeSlot: '10:00-12:00', demand: 'medium' as const },
      { timeSlot: '12:00-14:00', demand: 'medium' as const },
      { timeSlot: '14:00-16:00', demand: 'low' as const },
      { timeSlot: '16:00-18:00', demand: 'medium' as const },
      { timeSlot: '18:00-20:00', demand: 'high' as const },
      { timeSlot: '20:00-22:00', demand: 'high' as const },
      { timeSlot: '22:00-24:00', demand: 'medium' as const }
    ].map(slot => ({
      ...slot,
      revenue: slot.demand === 'high' ? 1200000 + Math.random() * 400000 : 
               slot.demand === 'medium' ? 600000 + Math.random() * 300000 : 
               300000 + Math.random() * 200000,
      bookings: slot.demand === 'high' ? 6 + Math.floor(Math.random() * 3) : 
                slot.demand === 'medium' ? 3 + Math.floor(Math.random() * 3) : 
                1 + Math.floor(Math.random() * 2),
      occupancy: slot.demand === 'high' ? 80 + Math.random() * 20 : 
                 slot.demand === 'medium' ? 50 + Math.random() * 30 : 
                 20 + Math.random() * 30,
      avgPrice: 150000
    }));
    setPeakTimeAnalysis(peakTimes);

    // Generate revenue distribution
    const distribution = [
      { name: 'Sân cỏ nhân tạo', value: 45, fill: '#10B981' },
      { name: 'Sân cỏ tự nhiên', value: 30, fill: '#3B82F6' },
      { name: 'Sân futsal', value: 20, fill: '#8B5CF6' },
      { name: 'Dịch vụ khác', value: 5, fill: '#F59E0B' }
    ];
    setRevenueDistribution(distribution);

    // Generate performance radar
    const radar = [
      { subject: 'Doanh thu', A: 120, B: 110, fullMark: 150 },
      { subject: 'Lượt đặt', A: 98, B: 130, fullMark: 150 },
      { subject: 'Tỷ lệ lấp đầy', A: 86, B: 100, fullMark: 150 },
      { subject: 'Đánh giá', A: 99, B: 85, fullMark: 150 },
      { subject: 'Dịch vụ', A: 65, B: 90, fullMark: 150 },
      { subject: 'Marketing', A: 88, B: 70, fullMark: 150 }
    ];
    setPerformanceRadar(radar);
  };

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

  // Chart colors
  const COLORS = {
    primary: '#10B981',
    secondary: '#3B82F6',
    accent: '#8B5CF6',
    warning: '#F59E0B',
    danger: '#EF4444',
    success: '#10B981'
  };

  const PIE_COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {payload.map((pld: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: pld.color }}>
              {pld.name}: {pld.name.includes('revenue') || pld.name.includes('Doanh thu') ? formatCurrencyShort(pld.value) : pld.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom label for pie chart
  const renderPieLabel = (entry: any) => {
    return `${entry.name} (${entry.value}%)`;
  };

  // Calculate KPIs
  const totalDailyRevenue = dailyData.reduce((sum, day) => sum + day.revenue, 0);
  const totalDailyBookings = dailyData.reduce((sum, day) => sum + day.bookings, 0);
  const avgRevenuePerDay = totalDailyRevenue / dailyData.length || 0;
  const avgBookingsPerDay = totalDailyBookings / dailyData.length || 0;
  const avgRevenuePerBooking = totalDailyRevenue / totalDailyBookings || 0;

  // Get peak hours
  const peakHours = [...hourlyData].sort((a, b) => b.revenue - a.revenue).slice(0, 3);
  const peakDays = [...dailyData].sort((a, b) => b.revenue - a.revenue).slice(0, 3);

  // Weekly performance
  const weekdayRevenue = dailyData.filter(d => !['Chủ nhật', 'Thứ bảy'].includes(d.dayOfWeek)).reduce((sum, d) => sum + d.revenue, 0);
  const weekendRevenue = dailyData.filter(d => ['Chủ nhật', 'Thứ bảy'].includes(d.dayOfWeek)).reduce((sum, d) => sum + d.revenue, 0);
  const weekendPerformance = weekendRevenue / (weekdayRevenue / 5) * 100 || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Đang tải dữ liệu báo cáo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 via-green-700 to-green-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/owner/dashboard')}
                className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 border border-green-300 text-white px-4 py-2 rounded-lg transition-all duration-200"
              >
                <i className="fas fa-arrow-left"></i>
                <span>Quay lại</span>
              </button>
              <div>
                <h1 className="text-3xl font-bold mb-2">📊 Báo cáo & Thống kê Chi tiết</h1>
                <p className="text-green-100">Phân tích doanh thu và hiệu suất kinh doanh</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={refreshData}
                className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 border border-green-300 text-white px-4 py-2 rounded-lg transition-all duration-200"
              >
                <i className="fas fa-sync-alt"></i>
                <span>Làm mới</span>
              </button>
              {usingMockData && (
                <div className="bg-yellow-500 bg-opacity-20 border border-yellow-300 text-yellow-100 px-3 py-1 rounded-lg text-sm">
                  <i className="fas fa-exclamation-triangle mr-1"></i>
                  Dữ liệu mẫu
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Thời gian</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="7days">7 ngày qua</option>
                  <option value="30days">30 ngày qua</option>
                  <option value="90days">3 tháng qua</option>
                  <option value="6months">6 tháng qua</option>
                  <option value="1year">1 năm qua</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sân bóng</label>
                <select
                  value={selectedField}
                  onChange={(e) => setSelectedField(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">Tất cả sân</option>
                  {fieldRevenue.map(field => (
                    <option key={field.id} value={field.id}>{field.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('daily')}
                  className={`px-3 py-1 rounded text-sm ${viewMode === 'daily' ? 'bg-green-600 text-white' : 'text-gray-600'}`}
                >
                  Ngày
                </button>
                <button
                  onClick={() => setViewMode('weekly')}
                  className={`px-3 py-1 rounded text-sm ${viewMode === 'weekly' ? 'bg-green-600 text-white' : 'text-gray-600'}`}
                >
                  Tuần
                </button>
                <button
                  onClick={() => setViewMode('monthly')}
                  className={`px-3 py-1 rounded text-sm ${viewMode === 'monthly' ? 'bg-green-600 text-white' : 'text-gray-600'}`}
                >
                  Tháng
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Tổng doanh thu (30 ngày)</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrencyShort(totalDailyRevenue)}</p>
                <p className="text-xs text-gray-400 mt-1">TB: {formatCurrencyShort(avgRevenuePerDay)}/ngày</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-dollar-sign text-green-600 text-xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Tổng lượt đặt sân</p>
                <p className="text-2xl font-bold text-blue-600">{totalDailyBookings}</p>
                <p className="text-xs text-gray-400 mt-1">TB: {Math.round(avgBookingsPerDay)}/ngày</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-calendar-check text-blue-600 text-xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Doanh thu/lượt đặt</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrencyShort(avgRevenuePerBooking)}</p>
                <p className="text-xs text-gray-400 mt-1">Giá trị trung bình</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-calculator text-purple-600 text-xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Hiệu suất cuối tuần</p>
                <p className="text-2xl font-bold text-orange-600">{weekendPerformance.toFixed(1)}%</p>
                <p className="text-xs text-gray-400 mt-1">So với ngày thường</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-chart-line text-orange-600 text-xl"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Main Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Daily Revenue Trend */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">📈 Xu hướng doanh thu</h3>
              <div className="flex items-center space-x-2">
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as any)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="line">Đường</option>
                  <option value="bar">Cột</option>
                  <option value="area">Vùng</option>
                  <option value="composed">Kết hợp</option>
                </select>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={300}>
              {chartType === 'line' ? (
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={formatCurrencyShort} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke={COLORS.primary} name="Doanh thu" strokeWidth={2} />
                </LineChart>
              ) : chartType === 'bar' ? (
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={formatCurrencyShort} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="revenue" fill={COLORS.primary} name="Doanh thu" />
                </BarChart>
              ) : chartType === 'area' ? (
                <AreaChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={formatCurrencyShort} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.6} name="Doanh thu" />
                </AreaChart>
              ) : (
                <ComposedChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" tickFormatter={formatCurrencyShort} />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="revenue" fill={COLORS.primary} name="Doanh thu" />
                  <Line yAxisId="right" type="monotone" dataKey="bookings" stroke={COLORS.secondary} name="Lượt đặt" strokeWidth={2} />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Hourly Analysis */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">⏰ Phân tích theo giờ</h3>
            
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis yAxisId="left" tickFormatter={formatCurrencyShort} />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="revenue" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.3} name="Doanh thu" />
                <Line yAxisId="right" type="monotone" dataKey="occupancy" stroke={COLORS.warning} name="Tỷ lệ lấp đầy (%)" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Distribution & Performance Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Revenue Distribution */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">🥧 Phân bổ doanh thu</h3>
            
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={revenueDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderPieLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {revenueDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Performance Radar */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">🎯 Hiệu suất tổng thể</h3>
            
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={performanceRadar}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis />
                <Radar name="Tháng này" dataKey="A" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.6} />
                <Radar name="Tháng trước" dataKey="B" stroke={COLORS.secondary} fill={COLORS.secondary} fillOpacity={0.6} />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Peak Time Analysis */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">🕐 Phân tích khung giờ vàng</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={peakTimeAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timeSlot" angle={-45} textAnchor="end" height={80} />
                  <YAxis tickFormatter={formatCurrencyShort} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" name="Doanh thu">
                    {peakTimeAnalysis.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={
                        entry.demand === 'high' ? COLORS.success : 
                        entry.demand === 'medium' ? COLORS.warning : 
                        COLORS.danger
                      } />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 mb-3">Thông tin chi tiết:</h4>
              {peakTimeAnalysis.map((slot, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      slot.demand === 'high' ? 'bg-green-500' : 
                      slot.demand === 'medium' ? 'bg-yellow-500' : 
                      'bg-red-500'
                    }`}></div>
                    <span className="font-medium">{slot.timeSlot}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{formatCurrencyShort(slot.revenue)}</div>
                    <div className="text-xs text-gray-500">{slot.bookings} lượt • {slot.occupancy.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Field Performance & Weekly Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Field Performance */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">🏟️ Hiệu suất theo sân</h3>
            
            <div className="space-y-4">
              {fieldRevenue.map((field, index) => (
                <div key={field.id} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white ${
                        index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                        index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-600' :
                        index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                        'bg-gradient-to-r from-green-400 to-green-600'
                      }`}>
                        #{index + 1}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900">{field.name}</span>
                        <div className="text-xs text-gray-500">
                          {field.bookings} lượt đặt • {field.totalReviews} đánh giá
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">{formatCurrencyShort(field.revenue)}</div>
                      <div className="text-xs text-gray-500">{field.percentage}%</div>
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${field.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Comparison */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">📊 So sánh theo tuần</h3>
            
            <div className="space-y-4">
              {weeklyComparison.map((week, index) => (
                <div key={index} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-gray-900">{week.week}</span>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-700">Năm nay</div>
                        <div className="text-green-600 font-bold">{formatCurrencyShort(week.thisYear)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-700">Năm trước</div>
                        <div className="text-gray-600 font-bold">{formatCurrencyShort(week.lastYear)}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-green-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(week.thisYear / Math.max(...weeklyComparison.map(w => Math.max(w.thisYear, w.lastYear)))) * 100}%` }}
                      />
                    </div>
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-gray-400 to-gray-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(week.lastYear / Math.max(...weeklyComparison.map(w => Math.max(w.thisYear, w.lastYear)))) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="text-center mt-2">
                    <span className={`text-sm font-medium ${
                      week.thisYear > week.lastYear ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {week.thisYear > week.lastYear ? '↗' : '↘'} 
                      {Math.abs(((week.thisYear - week.lastYear) / week.lastYear) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Performers & Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Top Peak Hours */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">🏆 Khung giờ vàng</h3>
            <div className="space-y-3">
              {peakHours.map((hour, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-500'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="font-medium">{hour.hour}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">{formatCurrencyShort(hour.revenue)}</div>
                    <div className="text-xs text-gray-500">{hour.bookings} lượt</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Peak Days */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">📅 Ngày cao điểm</h3>
            <div className="space-y-3">
              {peakDays.map((day, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <span className="font-medium">{day.date}</span>
                      <div className="text-xs text-gray-500">{day.dayOfWeek}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">{formatCurrencyShort(day.revenue)}</div>
                    <div className="text-xs text-gray-500">{day.bookings} lượt</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Business Insights */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">💡 Thông tin kinh doanh</h3>
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <i className="fas fa-clock text-blue-600"></i>
                  <span className="font-medium text-blue-900">Khung giờ vàng</span>
                </div>
                <p className="text-sm text-blue-800">
                  {peakHours[0]?.hour} - {peakHours[2]?.hour} tạo ra {((peakHours.reduce((sum, h) => sum + h.revenue, 0) / totalDailyRevenue) * 100).toFixed(1)}% doanh thu
                </p>
              </div>
              
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <i className="fas fa-calendar-week text-green-600"></i>
                  <span className="font-medium text-green-900">Cuối tuần</span>
                </div>
                <p className="text-sm text-green-800">
                  Hiệu suất cuối tuần {weekendPerformance > 120 ? 'vượt trội' : 'bình thường'} {weekendPerformance.toFixed(1)}%
                </p>
              </div>
              
              <div className="bg-yellow-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <i className="fas fa-lightbulb text-yellow-600"></i>
                  <span className="font-medium text-yellow-900">Khuyến nghị</span>
                </div>
                <p className="text-sm text-yellow-800">
                  Tăng giá giờ cao điểm và khuyến mãi giờ thấp điểm
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Data Export */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">📄 Xuất báo cáo</h3>
              <p className="text-sm text-gray-500">Tải xuống báo cáo chi tiết</p>
            </div>
            <div className="flex items-center space-x-3">
              <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                <i className="fas fa-file-pdf"></i>
                <span>Xuất PDF</span>
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                <i className="fas fa-file-excel"></i>
                <span>Xuất Excel</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsAndAnalytics;
