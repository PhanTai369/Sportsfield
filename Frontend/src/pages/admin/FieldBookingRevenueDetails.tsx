import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  DollarSign, 
  Users, 
  Calendar,
  TrendingUp,
  Filter,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Star,
  MapPin,
  Clock,
  BarChart3
} from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import * as echarts from 'echarts';
import { exportRevenueDataToExcel, exportSummaryToExcel } from '../../utils/excelExport';
import { showToast } from '../../utils/toast';

interface Owner {
  ownerId: number;
  ownerName: string;
  ownerEmail: string;
  ownerAvatar: string;
  periodDate?: string;
  periodMonth?: number;
  periodYear?: number;
  totalFields: number;
  totalRevenue: number;
  avgBookingValue: number;
  uniqueCustomers: number;
}

interface Summary {
  totalOwners: number;
  totalFields: number;
  totalBookings: number;
  totalRevenue: number;
  avgBookingValue: number;
  totalCustomers: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface RevenueData {
  summary: Summary;
  owners: Owner[];
  pagination: Pagination;
  filters: {
    period: string;
    year: number;
    month: number | null;
    ownerId: number | null;
  };
}

const FieldBookingRevenueDetails: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [period, setPeriod] = useState('monthly');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchRevenueData();
  }, [period, year, month, currentPage]);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };
      
      let params: any = {
        period,
        year,
        page: currentPage,
        limit: 10
      };
      
      if (month && period === 'daily') {
        params.month = month;
      }
      
      const response = await axios.get(`${API_BASE_URL}/admin/dashboard/field-booking-revenue`, {
        headers,
        params
      });
      
      if (response.data.success) {
        setRevenueData(response.data.data);
      } else {
        setError('Không thể tải dữ liệu thống kê');
      }
    } catch (error: any) {
      console.error('Error fetching revenue data:', error);
      setError(error.response?.data?.error?.message || 'Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  // Initialize chart when data is available
  useEffect(() => {
    if (!revenueData || !chartRef.current || revenueData.owners.length === 0) return;

    const chart = echarts.init(chartRef.current);
    
    const ownerNames = revenueData.owners.map(owner => 
      owner.ownerName.length > 15 ? owner.ownerName.substring(0, 15) + '...' : owner.ownerName
    );
    const revenues = revenueData.owners.map(owner => owner.totalRevenue);

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          crossStyle: {
            color: '#999'
          }
        },
        formatter: function(params: any) {
          let result = params[0].name + '<br/>';
          params.forEach((param: any) => {
            const value = param.value;
            const formattedValue = formatCurrency(value);
            result += `${param.marker} ${param.seriesName}: ${formattedValue}<br/>`;
          });
          return result;
        }
      },
      legend: {
        data: ['Doanh thu'],
        bottom: 0
      },
      xAxis: [
        {
          type: 'category',
          data: ownerNames,
          axisPointer: {
            type: 'shadow'
          },
          axisLabel: {
            rotate: 45,
            interval: 0
          }
        }
      ],
      yAxis: [
        {
          type: 'value',
          name: 'Doanh thu (VNĐ)',
          position: 'left',
          axisLabel: {
            formatter: function(value: number) {
              if (value >= 1000000) {
                return (value / 1000000) + 'M';
              } else if (value >= 1000) {
                return (value / 1000) + 'K';
              }
              return value;
            }
          }
        }
      ],
      series: [
        {
          name: 'Doanh thu',
          type: 'bar',
          data: revenues,
          itemStyle: {
            color: '#3B82F6'
          }
        }
      ]
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      chart.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, [revenueData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    setCurrentPage(1);
    if (newPeriod !== 'daily') {
      setMonth(null);
    }
  };

  const filteredOwners = revenueData?.owners.filter(owner =>
    owner.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    owner.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getPeriodText = () => {
    switch (period) {
      case 'daily':
        return month ? `hàng ngày trong tháng ${month}/${year}` : `hàng ngày trong năm ${year}`;
      case 'yearly':
        return 'hàng năm';
      default:
        return `hàng tháng trong năm ${year}`;
    }
  };

  const handleExportExcel = async () => {
    if (!revenueData) return;

    try {
      setIsExporting(true);
      
      const exportData = {
        owners: revenueData.owners,
        summary: revenueData.summary,
        filters: {
          period,
          year,
          month
        }
      };

      const filename = await exportRevenueDataToExcel(exportData);
      
      // Show success message
      console.log(`Đã xuất file Excel: ${filename}`);
      
      showToast.success(
        'Xuất Excel thành công',
        `Đã xuất file: ${filename}`
      );
      
    } catch (error) {
      console.error('Lỗi khi xuất Excel:', error);
      showToast.error(
        'Lỗi xuất Excel',
        'Có lỗi xảy ra khi xuất file Excel'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSummary = async () => {
    if (!revenueData) return;

    try {
      setIsExporting(true);
      
      const filename = await exportSummaryToExcel(revenueData.summary, {
        period,
        year,
        month
      });
      
      console.log(`Đã xuất file tổng quan: ${filename}`);
      showToast.success(
        'Xuất tổng quan thành công',
        `Đã xuất file: ${filename}`
      );
      
    } catch (error) {
      console.error('Lỗi khi xuất tổng quan:', error);
      showToast.error(
        'Lỗi xuất tổng quan',
        'Có lỗi xảy ra khi xuất file tổng quan'
      );
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Quay lại Dashboard</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Thống Kê Doanh Thu Đặt Sân Chi Tiết</h1>
            <p className="text-gray-600">Phân tích doanh thu theo chủ sân {getPeriodText()}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg"
          >
            <Filter className="w-4 h-4" />
            <span>Bộ lọc</span>
          </button>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleExportSummary}
              disabled={isExporting || !revenueData}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-2 rounded-lg"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Đang xuất...' : 'Xuất tổng quan'}</span>
            </button>
            
           
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Chu kỳ</label>
              <select
                value={period}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="daily">Theo ngày</option>
                <option value="monthly">Theo tháng</option>
                <option value="yearly">Theo năm</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Năm</label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {period === 'daily' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tháng</label>
                <select
                  value={month || ''}
                  onChange={(e) => setMonth(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Tất cả tháng</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>Tháng {m}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tìm kiếm</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tên chủ sân hoặc email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {revenueData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng chủ sân</p>
                <p className="text-2xl font-bold text-blue-600">{formatNumber(revenueData.summary.totalOwners)}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600 bg-blue-100 rounded-lg p-1.5" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng số sân</p>
                <p className="text-2xl font-bold text-green-600">{formatNumber(revenueData.summary.totalFields)}</p>
              </div>
              <MapPin className="w-8 h-8 text-green-600 bg-green-100 rounded-lg p-1.5" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng lượt đặt</p>
                <p className="text-2xl font-bold text-purple-600">{formatNumber(revenueData.summary.totalBookings)}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-600 bg-purple-100 rounded-lg p-1.5" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng doanh thu</p>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(revenueData.summary.totalRevenue)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-orange-600 bg-orange-100 rounded-lg p-1.5" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Giá trị TB/đặt</p>
                <p className="text-xl font-bold text-indigo-600">{formatCurrency(revenueData.summary.avgBookingValue)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-indigo-600 bg-indigo-100 rounded-lg p-1.5" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng khách hàng</p>
                <p className="text-2xl font-bold text-pink-600">{formatNumber(revenueData.summary.totalCustomers)}</p>
              </div>
              <Users className="w-8 h-8 text-pink-600 bg-pink-100 rounded-lg p-1.5" />
            </div>
          </div>
        </div>
      )}

      {/* Revenue Chart */}
      {revenueData && revenueData.owners.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <BarChart3 className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Biểu đồ doanh thu theo chủ sân</h3>
          </div>
          <div ref={chartRef} className="w-full h-80"></div>
        </div>
      )}

      {/* Owners Table */}
      {revenueData && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Danh sách chủ sân ({filteredOwners.length} / {revenueData.pagination.total})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chủ sân</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thông tin</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doanh thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOwners.map((owner, index) => (
                  <tr key={owner.ownerId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <img
                          className="h-10 w-10 rounded-full object-cover"
                          src={owner.ownerAvatar || 'https://via.placeholder.com/40'}
                          alt={owner.ownerName}
                        />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{owner.ownerName}</div>
                          <div className="text-sm text-gray-500">{owner.ownerEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center space-x-2 mb-1">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span>{owner.totalFields} sân</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span>{owner.uniqueCustomers} khách hàng</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        <div className="font-medium text-lg text-green-600">
                          {formatCurrency(owner.totalRevenue)}
                        </div>
                        <div className="text-gray-500">
                          TB: {formatCurrency(owner.avgBookingValue)}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {revenueData.pagination.totalPages > 1 && (
            <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Hiển thị {(revenueData.pagination.page - 1) * revenueData.pagination.limit + 1} - {Math.min(revenueData.pagination.page * revenueData.pagination.limit, revenueData.pagination.total)} của {revenueData.pagination.total} kết quả
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={!revenueData.pagination.hasPrev}
                  className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Trước</span>
                </button>
                <span className="text-sm text-gray-700">
                  Trang {revenueData.pagination.page} / {revenueData.pagination.totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!revenueData.pagination.hasNext}
                  className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <span>Sau</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FieldBookingRevenueDetails;
