import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart } from 'recharts';
import { useReportsData } from '../../../hooks/useReportsData';
import { TimeRange, ChartType, ViewMode, TabType } from '../../../types/reportsTypes';

const OwnerReports: React.FC = () => {
  const navigate = useNavigate();
  const {
    loading,
    error,
    data,
    filters,
    exporting,
    updateFilters,
    exportExcel,
    refreshData,
    formatCurrency,
    formatCurrencyShort
  } = useReportsData();

  const [activeTab, setActiveTab] = useState<TabType>('daily');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  const timeRangeOptions = [
    { value: '7d', label: '7 ngày' },
    { value: '30d', label: '30 ngày' },
    { value: '3m', label: '3 tháng' },
    { value: '6m', label: '6 tháng' },
    { value: '1y', label: '1 năm' },
    { value: 'custom', label: 'Tùy chỉnh' }
  ];

  const chartTypeOptions = [
    { value: 'bar', label: 'Cột', icon: 'fa-chart-bar' },
    { value: 'line', label: 'Đường', icon: 'fa-chart-line' },
    { value: 'mixed', label: 'Kết hợp', icon: 'fa-chart-area' }
  ];

  const viewModeOptions = [
    { value: 'daily', label: 'Theo ngày' },
    { value: 'weekly', label: 'Theo tuần' },
    { value: 'monthly', label: 'Theo tháng' }
  ];

  const colors = {
    primary: '#10b981',
    secondary: '#3b82f6',
    accent: '#8b5cf6',
    warning: '#f59e0b',
    danger: '#ef4444',
    success: '#10b981'
  };

  const pieColors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

  const renderCustomTooltip = (active: boolean, payload: any, label: string | number) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-2">{String(label)}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              <span className="font-medium">{entry.name}:</span> {
                entry.name.includes('Doanh thu') ? formatCurrencyShort(entry.value) : entry.value.toLocaleString()
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-500 text-lg">Đang tải báo cáo chi tiết...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <i className="fas fa-exclamation-triangle text-4xl"></i>
          </div>
          <p className="text-gray-700 text-lg mb-4">{error}</p>
          <button
            onClick={refreshData}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            <i className="fas fa-refresh mr-2"></i>
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-green-600 via-green-700 to-green-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/owner/dashboard')}
                className="flex items-center space-x-2 text-green-100 hover:text-white transition-colors"
              >
                <i className="fas fa-arrow-left"></i>
                <span>Quay lại Dashboard</span>
              </button>
              <div className="h-6 w-px bg-green-400"></div>
              <div>
                <h1 className="text-3xl font-bold mb-2">📊 Báo Cáo Doanh Thu Chi Tiết</h1>
                <p className="text-green-100">Phân tích sâu về doanh thu và hiệu suất kinh doanh</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">                        
              <button
                onClick={exportExcel}
                disabled={exporting === 'excel' || !data}
                className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 border border-green-300 text-white px-6 py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
                title="Xuất báo cáo chi tiết ra file Excel với đầy đủ thông tin"
              >
                {exporting === 'excel' ? (
                  <>
                    <i className="fas fa-spinner animate-spin"></i>
                    <span>Đang xuất...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-file-excel text-lg"></i>
                    <span className="font-medium">Xuất Excel Chi Tiết</span>
                  </>
                )}
              </button>
              
              <button
                onClick={refreshData}
                disabled={loading}
                className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 border border-green-300 text-white px-4 py-3 rounded-lg transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105"
                title="Tải lại dữ liệu báo cáo mới nhất"
              >
                <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`}></i>
                <span>Làm mới</span>
              </button>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="pb-6">
            <div className="flex flex-wrap items-center gap-4">
              {/* Time Range Filter */}
              <div className="flex items-center space-x-2">
                <label className="text-sm text-green-100">Khoảng thời gian:</label>
                <select
                  value={filters.timeRange}
                  onChange={(e) => {
                    const value = e.target.value as TimeRange;
                    if (value === 'custom') {
                      setShowCustomDatePicker(true);
                    } else {
                      updateFilters({ timeRange: value });
                    }
                  }}
                  className="px-3 py-2 bg-white bg-opacity-20 border border-green-300 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-300"
                >
                  {timeRangeOptions.map(option => (
                    <option key={option.value} value={option.value} className="text-gray-900">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chart Type Filter */}
              <div className="flex items-center space-x-2">
                <label className="text-sm text-green-100">Loại biểu đồ:</label>
                <div className="flex items-center space-x-1 bg-white bg-opacity-20 rounded-lg p-1">
                  {chartTypeOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => updateFilters({ chartType: option.value as ChartType })}
                      className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm transition-all ${
                        filters.chartType === option.value
                          ? 'bg-white text-green-700'
                          : 'text-green-100 hover:text-white'
                      }`}
                    >
                      <i className={`fas ${option.icon}`}></i>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* View Mode Filter */}
              <div className="flex items-center space-x-2">
                <label className="text-sm text-green-100">Chế độ xem:</label>
                <select
                  value={filters.viewMode}
                  onChange={(e) => updateFilters({ viewMode: e.target.value as ViewMode })}
                  className="px-3 py-2 bg-white bg-opacity-20 border border-green-300 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-300"
                >
                  {viewModeOptions.map(option => (
                    <option key={option.value} value={option.value} className="text-gray-900">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Toggle Options */}
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 text-sm text-green-100">
                  <input
                    type="checkbox"
                    checked={filters.showTrendLine}
                    onChange={(e) => updateFilters({ showTrendLine: e.target.checked })}
                    className="rounded border-green-300 text-green-600 focus:ring-green-500"
                  />
                  <span>Đường xu hướng</span>
                </label>
                
                <label className="flex items-center space-x-2 text-sm text-green-100">
                  <input
                    type="checkbox"
                    checked={filters.showPredictions}
                    onChange={(e) => updateFilters({ showPredictions: e.target.checked })}
                    className="rounded border-green-300 text-green-600 focus:ring-green-500"
                  />
                  <span>Dự báo</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <i className="fas fa-dollar-sign text-white text-xl"></i>
              </div>
              <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-semibold ${
                data.summary.growthRate > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                <i className={`fas ${data.summary.growthRate > 0 ? 'fa-arrow-up' : 'fa-arrow-down'}`}></i>
                <span>{data.summary.growthRate > 0 ? '+' : ''}{data.summary.growthRate}%</span>
              </div>
            </div>
            <div className="text-sm text-gray-500 mb-2">Tổng doanh thu</div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(data.summary.totalRevenue)}</div>
            <div className="text-xs text-gray-400">so với kỳ trước</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <i className="fas fa-chart-line text-white text-xl"></i>
              </div>
            </div>
            <div className="text-sm text-gray-500 mb-2">Doanh thu trung bình/ngày</div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(data.summary.averageDailyRevenue)}</div>
            <div className="text-xs text-gray-400">trong kỳ báo cáo</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <i className="fas fa-crown text-white text-xl"></i>
              </div>
            </div>
            <div className="text-sm text-gray-500 mb-2">Ngày có doanh thu cao nhất</div>
            <div className="text-lg font-bold text-gray-900 mb-1">{data.summary.bestDay.date}</div>
            <div className="text-sm font-semibold text-purple-600 mb-1">{formatCurrencyShort(data.summary.bestDay.revenue)}</div>
            {data.summary.bestDay.reason && (
              <div className="text-xs text-gray-400">{data.summary.bestDay.reason}</div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <i className="fas fa-trending-up text-white text-xl"></i>
              </div>
            </div>
            <div className="text-sm text-gray-500 mb-2">Tỷ lệ tăng trưởng</div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{data.summary.growthRate}%</div>
            <div className="text-xs text-gray-400">qua các tháng</div>
          </div>
        </div>

        {/* Main Chart and Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-8">
          {/* Main Chart - 60% width */}
          <div className="lg:col-span-3 bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <i className="fas fa-chart-area text-white"></i>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Biểu đồ Doanh thu Chi tiết</h3>
                  <p className="text-sm text-gray-500">Phân tích xu hướng và dự báo</p>
                </div>
              </div>
              
              {/* Chart Time Controls */}
              <div className="flex items-center space-x-2">
                {['7D', '1M', '3M', '6M', '1Y', 'ALL'].map((period) => (
                  <button
                    key={period}
                    onClick={() => {
                      const timeRangeMap: Record<string, TimeRange> = {
                        '7D': '7d',
                        '1M': '30d',
                        '3M': '3m',
                        '6M': '6m',
                        '1Y': '1y',
                        'ALL': '1y'
                      };
                      updateFilters({ timeRange: timeRangeMap[period] });
                    }}
                    className={`px-3 py-1 text-sm rounded-lg transition-all ${
                      (period === '7D' && filters.timeRange === '7d') ||
                      (period === '1M' && filters.timeRange === '30d') ||
                      (period === '3M' && filters.timeRange === '3m') ||
                      (period === '6M' && filters.timeRange === '6m') ||
                      (period === '1Y' && filters.timeRange === '1y')
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                {filters.chartType === 'bar' ? (
                  <BarChart data={data.dailyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => formatCurrencyShort(value)} />
                    <Tooltip content={(props) => renderCustomTooltip(props.active || false, props.payload, props.label || '')} />
                    <Bar dataKey="revenue" fill={colors.primary} name="Doanh thu" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : filters.chartType === 'line' ? (
                  <LineChart data={data.dailyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => formatCurrencyShort(value)} />
                    <Tooltip content={(props) => renderCustomTooltip(props.active || false, props.payload, props.label || '')} />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke={colors.primary} 
                      strokeWidth={3}
                      name="Doanh thu"
                      dot={{ fill: colors.primary, strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: colors.primary, strokeWidth: 2 }}
                    />
                  </LineChart>
                ) : (
                  <ComposedChart data={data.dailyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(value) => formatCurrencyShort(value)} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                    <Tooltip content={(props) => renderCustomTooltip(props.active || false, props.payload, props.label || '')} />
                    <Bar yAxisId="left" dataKey="revenue" fill={colors.primary} name="Doanh thu" radius={[4, 4, 0, 0]} opacity={0.8} />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="bookings" 
                      stroke={colors.secondary} 
                      strokeWidth={2}
                      name="Số lượt đặt"
                      dot={{ fill: colors.secondary, strokeWidth: 2, r: 3 }}
                    />
                  </ComposedChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sidebar - 40% width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Top Performing Fields */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center">
                  <i className="fas fa-trophy text-white"></i>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">Top 5 Sân Bóng</h4>
                  <p className="text-sm text-gray-500">Doanh thu cao nhất</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {data.fieldComparison.slice(0, 5).map((field, index) => {
                  // Sử dụng rank từ API thay vì index + 1
                  const rank = field.rank || (index + 1);
                  return (
                    <div key={field.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white ${
                          rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                          rank === 2 ? 'bg-gradient-to-r from-gray-400 to-gray-600' :
                          rank === 3 ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                          'bg-gradient-to-r from-green-400 to-green-600'
                        }`}>
                          <span className="text-xs">#{rank}</span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{field.name}</div>
                          <div className="text-xs text-gray-500">{field.bookings} lượt</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600 text-sm">{formatCurrencyShort(field.revenue)}</div>
                        <div className="text-xs text-gray-500">{field.percentage}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Peak Hours Analysis */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                  <i className="fas fa-fire text-white"></i>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">Khung Giờ Vàng</h4>
                  <p className="text-sm text-gray-500">5 khung giờ hot nhất</p>
                </div>
              </div>
              
              <div className="space-y-3">
                {['18:00-20:00', '20:00-22:00', '16:00-18:00', '14:00-16:00', '22:00-24:00'].map((time, index) => {
                  const bookings = Math.round(Math.random() * 15 + 10);
                  const percentage = Math.round(Math.random() * 30 + 70);
                  return (
                    <div key={time} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          index < 3 ? 'bg-red-500' : 'bg-orange-500'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="font-medium text-gray-700 text-sm">{time}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold text-gray-900 w-8">{percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Revenue Breakdown */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <i className="fas fa-chart-pie text-white"></i>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">Phân Bổ Doanh Thu</h4>
                  <p className="text-sm text-gray-500">Theo loại sân</p>
                </div>
              </div>
              
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.fieldComparison}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="revenue"
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      labelLine={false}
                    >
                      {data.fieldComparison.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrencyShort(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Analytics Tabs */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 mt-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">📈 Phân Tích Chi Tiết</h3>
            
            {/* Tab Navigation */}
            <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg">
              {[
                { key: 'daily', label: 'Theo ngày', icon: 'fa-calendar-day' },
                { key: 'fields', label: 'Theo sân', icon: 'fa-map-marker-alt' },
                
                { key: 'comparison', label: 'So sánh', icon: 'fa-chart-bar' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as TabType)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.key
                      ? 'bg-white text-green-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <i className={`fas ${tab.icon}`}></i>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {activeTab === 'daily' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Ngày</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">Doanh thu</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">Số lượt đặt</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">Doanh thu/lượt</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">% so với TB</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-900">Xu hướng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.dailyRevenue.slice(0, 10).map((day, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{day.date}</span>
                            {day.isWeekend && (
                              <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">T7/CN</span>
                            )}
                            {day.isHoliday && (
                              <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">Lễ</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-green-600">
                          {formatCurrency(day.revenue)}
                        </td>
                        <td className="py-3 px-4 text-right">{day.bookings}</td>
                        <td className="py-3 px-4 text-right">
                          {formatCurrency(day.bookings > 0 ? day.revenue / day.bookings : 0)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`${
                            day.percentageVsAverage > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {day.percentageVsAverage > 0 ? '+' : ''}{day.percentageVsAverage}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="w-12 h-6 bg-gray-100 rounded mx-auto overflow-hidden">
                            <div 
                              className={`h-full ${
                                day.percentageVsAverage > 0 ? 'bg-green-400' : 'bg-red-400'
                              }`}
                              style={{ width: `${Math.min(Math.abs(day.percentageVsAverage), 100)}%` }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'fields' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.fieldComparison.map((field) => (
                  <div key={field.id} className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-gray-900">{field.name}</h4>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        field.type === 'grass' ? 'bg-green-100 text-green-700' :
                        field.type === 'artificial' ? 'bg-blue-100 text-blue-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {field.type === 'grass' ? 'Cỏ tự nhiên' :
                         field.type === 'artificial' ? 'Cỏ nhân tạo' : 'Trong nhà'}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Doanh thu:</span>
                        <span className="font-semibold text-green-600">{formatCurrencyShort(field.revenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Lượt đặt:</span>
                        <span className="font-semibold">{field.bookings}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Đánh giá:</span>
                        <div className="flex items-center space-x-1">
                          <span className="font-semibold">{field.averageRating}</span>
                          <i className="fas fa-star text-yellow-400 text-xs"></i>
                          <span className="text-gray-500 text-sm">({field.totalReviews})</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tăng trưởng:</span>
                        <span className={`font-semibold ${field.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {field.growth > 0 ? '+' : ''}{field.growth}%
                        </span>
                      </div>
                    </div>

                    {/* Peak Hours for this field */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-600 mb-2">Khung giờ vàng:</div>
                      <div className="flex flex-wrap gap-2">
                        {field.peakHours.map((hour, index) => (
                          <span key={index} className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full">
                            {hour}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'hours' && (
              <div>
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Phân tích khung giờ chi tiết</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Array.from({ length: 24 }, (_, hour) => {
                      const totalBookings = data.hourlyHeatmap.reduce((sum, day) => sum + day[hour].bookings, 0);
                      const avgBookings = totalBookings / 7;
                      return (
                        <div key={hour} className="bg-gray-50 rounded-lg p-4 text-center">
                          <div className="text-lg font-bold text-gray-900">
                            {hour.toString().padStart(2, '0')}:00
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {Math.round(avgBookings)} lượt/ngày
                          </div>
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${Math.min((avgBookings / 10) * 100, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'comparison' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Kỳ hiện tại</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tổng doanh thu:</span>
                        <span className="font-bold text-green-600">{formatCurrency(data.summary.totalRevenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tổng lượt đặt:</span>
                        <span className="font-semibold">{data.dailyRevenue.reduce((sum, day) => sum + day.bookings, 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Doanh thu TB/ngày:</span>
                        <span className="font-semibold">{formatCurrency(data.summary.averageDailyRevenue)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Kỳ trước</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tổng doanh thu:</span>
                        <span className="font-bold text-gray-600">{formatCurrency(data.summary.previousPeriodComparison.revenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tổng lượt đặt:</span>
                        <span className="font-semibold">{data.summary.previousPeriodComparison.bookings}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Doanh thu TB/ngày:</span>
                        <span className="font-semibold">{formatCurrency(Math.round(data.summary.previousPeriodComparison.revenue / data.dailyRevenue.length))}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">📊 Tóm tắt so sánh</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className={`text-3xl font-bold mb-2 ${
                        data.summary.growthRate > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {data.summary.growthRate > 0 ? '+' : ''}{data.summary.growthRate}%
                      </div>
                      <div className="text-sm text-gray-600">Tăng trưởng doanh thu</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-2">
                        {Math.abs(data.dailyRevenue.reduce((sum, day) => sum + day.bookings, 0) - data.summary.previousPeriodComparison.bookings)}
                      </div>
                      <div className="text-sm text-gray-600">Chênh lệch lượt đặt</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600 mb-2">
                        {formatCurrencyShort(Math.abs(data.summary.totalRevenue - data.summary.previousPeriodComparison.revenue))}
                      </div>
                      <div className="text-sm text-gray-600">Chênh lệch doanh thu</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerReports;
