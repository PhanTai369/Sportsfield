import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Package, 
  DollarSign, 
  Users, 
  TrendingUp,
  Calendar,
  User,
  Mail,
  Clock,
  BarChart3,
  PieChart,
  XCircle
} from 'lucide-react';
import adminDashboardService from '../../services/adminDashboard.service';
import { PackageServiceStats } from '../../types/reportsTypes';
import * as echarts from 'echarts';

const PackageServiceDetails: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [packageStats, setPackageStats] = useState<PackageServiceStats | null>(null);
  const monthlyChartRef = React.useRef<HTMLDivElement>(null);
  const packageTypeChartRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPackageStats();
  }, []);

  const fetchPackageStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminDashboardService.getPackageServiceStats();
      setPackageStats(data);
    } catch (error: any) {
      console.error('Error fetching package stats:', error);
      setError(error.message || 'Không thể tải dữ liệu thống kê gói dịch vụ');
    } finally {
      setLoading(false);
    }
  };

  // Initialize charts
  useEffect(() => {
    if (!packageStats || loading) return;

    // Cleanup previous charts if they exist
    const cleanupCharts = () => {
      if (monthlyChartRef.current) {
        echarts.dispose(monthlyChartRef.current);
      }
      if (packageTypeChartRef.current) {
        echarts.dispose(packageTypeChartRef.current);
      }
    };

    cleanupCharts();

    // Monthly revenue chart
    if (monthlyChartRef.current) {
      const monthlyChart = echarts.init(monthlyChartRef.current);
      
      // Process monthly data
      const monthlyData = Array(12).fill(0).map((_, index) => {
        const month = index + 1;
        const monthData = packageStats.monthlyRevenue.filter(item => item.month === month);
        return monthData.reduce((sum, item) => sum + item.revenue, 0);
      });

      const monthlyOptions = {
        title: {
          text: 'Doanh thu gói dịch vụ theo tháng',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          formatter: (params: any) => {
            const value = params[0].value;
            return `Tháng ${params[0].axisValue}: ${new Intl.NumberFormat('vi-VN').format(value)} ₫`;
          }
        },
        xAxis: {
          type: 'category',
          data: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            formatter: (value: number) => {
              if (value >= 1000000) {
                return (value / 1000000).toFixed(1) + 'M';
              } else if (value >= 1000) {
                return (value / 1000).toFixed(0) + 'K';
              }
              return value.toString();
            }
          }
        },
        series: [{
          data: monthlyData,
          type: 'bar',
          itemStyle: {
            color: '#10b981'
          },
          barWidth: '60%'
        }],
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        }
      };

      monthlyChart.setOption(monthlyOptions);
    }

    // Package type pie chart
    if (packageTypeChartRef.current && packageStats.packageStats.length > 0) {
      const pieChart = echarts.init(packageTypeChartRef.current);
      
      const pieData = packageStats.packageStats.map(stat => ({
        name: stat.packageName,
        value: stat.totalRevenue
      }));

      const pieOptions = {
        title: {
          text: 'Phân bố doanh thu theo loại gói',
          left: 'center'
        },
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ₫ ({d}%)'
        },
        legend: {
          orient: 'vertical',
          left: 'left'
        },
        series: [{
          name: 'Doanh thu',
          type: 'pie',
          radius: '50%',
          data: pieData,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }]
      };

      pieChart.setOption(pieOptions);
    }

    // Cleanup function
    return () => {
      cleanupCharts();
    };
  }, [packageStats, loading]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Lỗi tải dữ liệu</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-4">
            <button
              onClick={fetchPackageStats}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
            >
              Thử lại
            </button>
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Quay lại Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!packageStats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Không thể tải dữ liệu thống kê gói dịch vụ</p>
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Quay lại Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Quay lại Dashboard</span>
          </button>
          <div className="h-6 border-l border-gray-300"></div>
          <div className="flex items-center space-x-2">
            <Package className="w-6 h-6 text-emerald-600" />
            <h1 className="text-2xl font-bold text-gray-900">Chi tiết thống kê gói dịch vụ</h1>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tổng doanh thu</p>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(packageStats.summary.totalRevenue)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tổng số gói</p>
              <p className="text-2xl font-bold text-blue-600">{packageStats.summary.totalPackages}</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Gói Basic</p>
              <p className="text-2xl font-bold text-yellow-600">{packageStats.summary.basicPackages}</p>
            </div>
            <Package className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Gói Premium</p>
              <p className="text-2xl font-bold text-purple-600">{packageStats.summary.premiumPackages}</p>
            </div>
            <Package className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-semibold">Doanh thu theo tháng</h3>
          </div>
          <div ref={monthlyChartRef} style={{ width: '100%', height: '300px' }}></div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <PieChart className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-semibold">Phân bố theo loại gói</h3>
          </div>
          <div ref={packageTypeChartRef} style={{ width: '100%', height: '300px' }}></div>
        </div>
      </div>

      {/* Package Stats Table */}
      {packageStats.packageStats && packageStats.packageStats.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold">Thống kê theo loại gói</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loại gói
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Số lượng bán
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tổng doanh thu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Giá trung bình
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lần mua đầu tiên
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lần mua gần nhất
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {packageStats.packageStats.map((stat, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className={`w-4 h-4 mr-2 ${stat.packageType === 'premium' ? 'text-purple-600' : 'text-yellow-600'}`} />
                        <span className="text-sm font-medium text-gray-900">
                          {stat.packageName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stat.totalPurchases}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(stat.totalRevenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(stat.avgPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(stat.firstPurchase)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(stat.latestPurchase)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold">Thống kê theo loại gói</h3>
            </div>
          </div>
          <div className="p-6 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Chưa có dữ liệu gói dịch vụ nào</p>
          </div>
        </div>
      )}

      {/* Top Users */}
      {packageStats.topUsers && packageStats.topUsers.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold">Top khách hàng mua gói dịch vụ</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Khách hàng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vai trò
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Số gói đã mua
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tổng chi tiêu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loại gói
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lần mua cuối
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {packageStats.topUsers.map((user, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{user.name}</span>
                        </div>
                        <div className="flex items-center mt-1">
                          <Mail className="w-3 h-3 mr-1 text-gray-400" />
                          <span className="text-xs text-gray-500">{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'owner' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {user.role === 'owner' ? 'Chủ sân' : 'Khách hàng'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.totalPackages}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(user.totalSpent)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.packageTypes}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.latestPurchase)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold">Top khách hàng mua gói dịch vụ</h3>
            </div>
          </div>
          <div className="p-6 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Chưa có khách hàng nào mua gói dịch vụ</p>
          </div>
        </div>
      )}

      {/* Recent Purchases */}
      {packageStats.recentPurchases && packageStats.recentPurchases.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold">Giao dịch gần đây</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ngày mua
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Khách hàng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gói dịch vụ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Giá trị
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vai trò
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {packageStats.recentPurchases.slice(0, 10).map((purchase, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(purchase.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{purchase.userName}</span>
                        </div>
                        <div className="flex items-center mt-1">
                          <Mail className="w-3 h-3 mr-1 text-gray-400" />
                          <span className="text-xs text-gray-500">{purchase.userEmail}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className={`w-4 h-4 mr-2 ${purchase.packageType === 'premium' ? 'text-purple-600' : 'text-yellow-600'}`} />
                        <span className="text-sm text-gray-900">{purchase.packageName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(purchase.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        purchase.userRole === 'owner' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {purchase.userRole === 'owner' ? 'Chủ sân' : 'Khách hàng'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold">Giao dịch gần đây</h3>
            </div>
          </div>
          <div className="p-6 text-center">
            <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Chưa có giao dịch nào</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackageServiceDetails;
