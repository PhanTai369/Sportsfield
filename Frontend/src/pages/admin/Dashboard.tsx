import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  UserCheck, 
  DollarSign, 
  BarChart2, 
  Loader2,
  XCircle,
  Calendar,
  Package,
  MapPin
} from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import * as echarts from 'echarts';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [monthlyRevenueData, setMonthlyRevenueData] = useState<any[]>([]);
  const [lastYearRevenueData, setLastYearRevenueData] = useState<any[]>([]);
  const [topFieldOwners, setTopFieldOwners] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedPeriod, setSelectedPeriod] = useState<string>("year");
  const [customDateRange, setCustomDateRange] = useState<{start: string, end: string}>({
    start: `${new Date().getFullYear()}-01-01`,
    end: `${new Date().getFullYear()}-12-31`
  });
  const [compareWithLastYear, setCompareWithLastYear] = useState<boolean>(false);
  const revenueChartRef = useRef<HTMLDivElement>(null);

  // Fetch dashboard data from API
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Lấy token từ localStorage
        const token = localStorage.getItem('auth_token');
        const headers = { Authorization: `Bearer ${token}` };
        
        console.log('Fetching dashboard data with token:', token?.substring(0, 15) + '...');
        
        // Fetch statistics endpoint
        try {
          console.log('Calling statistics endpoint...');
          const statisticsRes = await axios.get(`${API_BASE_URL}/admin/dashboard/statistics`, { headers });
          console.log('Statistics response:', statisticsRes.data);
          setDashboardData(statisticsRes.data.data);
        } catch (statErr: any) {
          console.error('Statistics endpoint error:', statErr.message, statErr.response?.data);
        }
        
        // Fetch monthly revenue data for selected year
        try {
          console.log(`Calling monthly revenue endpoint for year ${selectedYear}...`);
          const revenueRes = await axios.get(`${API_BASE_URL}/admin/dashboard/monthly-revenue?year=${selectedYear}`, { headers });
          console.log('Monthly revenue response:', revenueRes.data);
          setMonthlyRevenueData(revenueRes.data.data);
          
          // If compare with last year is enabled, fetch last year's data
          if (compareWithLastYear) {
            const lastYearRes = await axios.get(`${API_BASE_URL}/admin/dashboard/monthly-revenue?year=${selectedYear - 1}`, { headers });
            console.log('Last year revenue response:', lastYearRes.data);
            setLastYearRevenueData(lastYearRes.data.data);
          }
        } catch (revenueErr: any) {
          console.error('Monthly revenue endpoint error:', revenueErr.message, revenueErr.response?.data);
        }
        
        // Fetch top field owners data
        try {
          console.log('Calling top field owners endpoint...');
          const topOwnersRes = await axios.get(`${API_BASE_URL}/admin/dashboard/top-field-owners`, { headers });
          console.log('Top field owners response:', topOwnersRes.data);
          setTopFieldOwners(topOwnersRes.data.data);
        } catch (ownersErr: any) {
          console.error('Top field owners endpoint error:', ownersErr.message, ownersErr.response?.data);
        }
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error.message);
        console.error('Response data if available:', error.response?.data);
        console.error('Full error object:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedYear, compareWithLastYear, selectedPeriod, customDateRange]);
  
  // Initialize revenue chart
  useEffect(() => {
    if (loading || monthlyRevenueData.length === 0 || !revenueChartRef.current) {
      return;
    }

    // Initialize revenue chart
    const revenueChart = echarts.init(revenueChartRef.current);
    
    // Format the data for the chart
    const months = monthlyRevenueData.map(item => `T${item.month}`);
    const revenueValues = monthlyRevenueData.map(item => item.revenue);
    
    // Prepare series array
    const series = [
      {
        name: `Doanh thu ${selectedYear}`,
        type: 'bar',
        data: revenueValues,
        itemStyle: {
          color: '#F59E0B'
        },
        barWidth: '60%',
        emphasis: {
          itemStyle: {
            color: '#D97706'
          }
        },
        label: {
          show: true,
          position: 'top',
          formatter: function(params: any) {
            const value = params.value;
            if (value >= 1000000) {
              return (value / 1000000).toFixed(1) + 'M';
            } else if (value >= 1000) {
              return (value / 1000).toFixed(0) + 'K';
            }
            return value;
          }
        }
      }
    ];
    
    // Add last year data if compare mode is on
    if (compareWithLastYear && lastYearRevenueData.length > 0) {
      const lastYearValues = lastYearRevenueData.map(item => item.revenue);
      series.push({
        name: `Doanh thu ${selectedYear - 1}`,
        type: 'line',
        data: lastYearValues,
        itemStyle: {
          color: '#3B82F6'
        },
        barWidth: '0%', // Set to 0% since this is a line, not a bar
        emphasis: {
          itemStyle: {
            color: '#2563EB' // Slightly darker blue when emphasized
          }
        },
        label: {
          show: true,
          position: 'top',
          formatter: function(params: any) {
            const value = params.value;
            if (value >= 1000000) {
              return (value / 1000000).toFixed(1) + 'M';
            } else if (value >= 1000) {
              return (value / 1000).toFixed(0) + 'K';
            }
            return value;
          }
        }
      });
    }
    
    // Create the chart option
    const option = {
      tooltip: {
        trigger: 'axis',
        formatter: function(params: any) {
          let result = params[0].name + '<br/>';
          params.forEach((param: any) => {
            const value = param.value;
            const formattedValue = value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            result += `${param.marker} ${param.seriesName}: ${formattedValue} đ<br/>`;
          });
          return result;
        }
      },
      legend: {
        data: compareWithLastYear ? [`Doanh thu ${selectedYear}`, `Doanh thu ${selectedYear - 1}`] : [`Doanh thu ${selectedYear}`],
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: months,
        axisLabel: {
          color: '#6B7280'
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#6B7280',
          formatter: function(value: number) {
            if (value >= 1000000) {
              return (value / 1000000) + 'M';
            } else if (value >= 1000) {
              return (value / 1000) + 'K';
            }
            return value;
          }
        },
        splitLine: {
          lineStyle: {
            color: '#E5E7EB'
          }
        }
      },
      series: series
    };
    
    // Set the option and render the chart
    revenueChart.setOption(option);
    
    // Handle resize
    const handleResize = () => {
      revenueChart.resize();
    };
    
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => {
      revenueChart.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, [loading, monthlyRevenueData]);

  // Format number to include commas as thousands separators
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  
  // Format currency
  const formatCurrency = (num: number) => {
    return `${formatNumber(Math.round(num))} đ`;
  };
  
  // Xử lý click vào card thống kê
  const handleCardClick = (cardTitle: string) => {
    if (cardTitle === 'Doanh thu gói dịch vụ') {
      navigate('/admin/package-service-details');
    } else if (cardTitle === 'Doanh thu đặt sân') {
      navigate('/admin/field-booking-revenue-details');
    }
    // Có thể thêm các điều hướng khác cho các card khác
  };

  // Khi click vào card "Doanh thu gói dịch vụ", điều hướng đến trang chi tiết
  const isClickableCard = (cardTitle: string) => {
    return cardTitle === 'Doanh thu gói dịch vụ' || cardTitle === 'Doanh thu đặt sân';
  };

  const statsCards = dashboardData ? [
    {
      title: 'Tổng người dùng',
      value: formatNumber(dashboardData.users.total),
      description: 'Tổng số người dùng trên hệ thống',
      icon: Users,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      title: 'Chủ sân',
      value: formatNumber(dashboardData.users.owners),
      description: 'Số lượng chủ sân đã đăng ký',
      icon: UserCheck,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    {
      title: 'Khách hàng',
      value: formatNumber(dashboardData.users.customers),
      description: 'Số lượng khách hàng đã đăng ký',
      icon: Users,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    {
      title: 'Tổng doanh thu',
      value: formatCurrency(dashboardData.revenue.total),
      description: 'Tổng doanh thu từ đặt sân',
      icon: DollarSign,
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600'
    },
    {
      title: 'Doanh thu đặt sân',
      value: formatCurrency(dashboardData.revenue.regular),
      description: 'Doanh thu từ đặt sân thông thường',
      icon: Calendar,
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600'
    },
    {
      title: 'Doanh thu gói dịch vụ',
      value: formatCurrency(dashboardData.revenue.package),
      description: 'Doanh thu từ bán gói dịch vụ',
      icon: Package,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600'
    },
    {
      title: 'Tỷ lệ hủy đặt sân',
      value: `${dashboardData.bookings.cancellationRate}%`,
      description: `${dashboardData.bookings.cancelled}/${dashboardData.bookings.total} lượt đặt đã bị hủy`,
      icon: XCircle,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600'
    },
    {
      title: 'Tổng số sân',
      value: formatNumber(dashboardData.fields.total),
      description: `${dashboardData.fields.active} đã xác minh, ${dashboardData.fields.inactive} chưa xác minh`,
      icon: MapPin,
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600'
    }
  ] : [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Thống kê chi tiết</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <span className="ml-2 text-lg text-gray-600">Đang tải dữ liệu...</span>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {statsCards.map((card, index) => {
              const Icon = card.icon;
              const isClickable = isClickableCard(card.title);
              return (
                <div 
                  key={index} 
                  className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${
                    isClickable 
                      ? 'cursor-pointer hover:shadow-md hover:bg-gray-50 transition-all duration-200 transform hover:-translate-y-1' 
                      : ''
                  }`}
                  onClick={() => isClickable && handleCardClick(card.title)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                      <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {card.description}
                      </p>
                      {isClickable && (
                        <p className="text-xs text-emerald-600 mt-2 font-medium">
                          Click để xem chi tiết →
                        </p>
                      )}
                    </div>
                    <div className={`w-12 h-12 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${card.iconColor}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {loading ? null : (
        <>
          {/* Monthly Revenue Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <BarChart2 className="w-5 h-5 text-yellow-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Doanh thu tổng theo tháng</h3>
              </div>
              <div className="flex items-center space-x-4">
                {/* Year Filter */}
                <div>
                  <select 
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                
                {/* Period Filter */}
                <div>
                  <select 
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                  >
                    <option value="year">Năm</option>
                    <option value="quarter1">Quý 1</option>
                    <option value="quarter2">Quý 2</option>
                    <option value="quarter3">Quý 3</option>
                    <option value="quarter4">Quý 4</option>
                    <option value="custom">Tùy chỉnh</option>
                  </select>
                </div>
                
                {/* Compare checkbox */}
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="compareLastYear" 
                    checked={compareWithLastYear}
                    onChange={(e) => setCompareWithLastYear(e.target.checked)}
                    className="mr-2 h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="compareLastYear" className="text-sm text-gray-700">So sánh với năm trước</label>
                </div>
              </div>
            </div>
            
            {/* Custom date range inputs (only show if selectedPeriod is 'custom') */}
            {selectedPeriod === 'custom' && (
              <div className="flex items-center mb-4 space-x-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
                  <input
                    type="date"
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                    value={customDateRange.start}
                    onChange={(e) => setCustomDateRange({...customDateRange, start: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
                  <input
                    type="date"
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                    value={customDateRange.end}
                    onChange={(e) => setCustomDateRange({...customDateRange, end: e.target.value})}
                  />
                </div>
                <button 
                  className="mt-6 bg-blue-600 hover:bg-blue-700 text-white py-1 px-4 rounded text-sm"
                  onClick={() => {
                    // Implement filter logic here
                  }}
                >
                  Áp dụng
                </button>
              </div>
            )}
            
            <p className="text-sm text-gray-600 mb-4">
              {compareWithLastYear 
                ? `So sánh doanh thu năm ${selectedYear} với năm ${selectedYear - 1}` 
                : `Doanh thu từ các đặt sân đã thanh toán theo từng tháng trong năm ${selectedYear}`}
            </p>
            <div 
              ref={revenueChartRef} 
              className="w-full h-80"
            ></div>
          </div>
          
          {/* Top 5 Field Owners */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Users className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Top 5 Chủ sân có nhiều lượt đặt nhất</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Danh sách các chủ sân có số lượt đặt cao nhất trên hệ thống
            </p>
            
            {topFieldOwners.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chủ sân</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số sân</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lượt đặt</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topFieldOwners.map((owner, index) => (
                      <tr key={owner.id} className="border-b hover:bg-gray-50">
                        <td className="py-4 px-4 whitespace-nowrap">{index + 1}</td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <img 
                                className="h-10 w-10 rounded-full object-cover" 
                                src={owner.avatar_url || 'https://via.placeholder.com/40'} 
                                alt={owner.full_name} 
                              />
                            </div>
                            <div className="ml-4">
                              <div className="font-medium text-gray-900">{owner.full_name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-gray-500">{owner.email}</td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {owner.fields_count} sân
                          </span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {owner.booking_count} lượt đặt
                          </span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-gray-500">
                          {formatCurrency(owner.total_revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">Không có dữ liệu để hiển thị</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
