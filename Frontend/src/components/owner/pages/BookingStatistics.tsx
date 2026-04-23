import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ownerBookingService, OwnerBookingParams, OwnerBookingStats } from '../../../services/ownerBookingService';
import { Booking } from '../../../types/booking';
import { 
  getStatusColor, 
  getStatusText 
} from '../../../utils/shared/bookingStatusUtils';
import * as XLSX from 'xlsx';

const BookingStatistics: React.FC = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<OwnerBookingStats | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [fieldFilter, setFieldFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Date range
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Export modal
  const [showExportModal, setShowExportModal] = useState(false);

  // Fetch bookings data
  const fetchBookings = async (params: OwnerBookingParams) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await ownerBookingService.getOwnerBookings(params);
      
      setBookings(response.bookings);
      setTotalPages(response.pagination.totalPages);
      setTotalItems(response.pagination.total);
      setCurrentPage(response.pagination.page);
      setStats(response.stats);
      
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Không thể tải dữ liệu đặt sân. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Load data when filters change
  useEffect(() => {
    const params: OwnerBookingParams = {
      page: currentPage,
      limit: itemsPerPage,
      sortBy: 'booking_date',
      sortOrder: 'desc'
    };

    if (statusFilter !== 'all') {
      params.status = statusFilter;
    }

    if (searchTerm) {
      params.search = searchTerm;
    }

    if (startDate && endDate) {
      params.startDate = startDate;
      params.endDate = endDate;
    }

    fetchBookings(params);
  }, [statusFilter, dateFilter, fieldFilter, searchTerm, startDate, endDate, currentPage, itemsPerPage]);

  // Filter bookings based on date filter
  const getFilteredBookings = () => {
    if (dateFilter === 'all') {
      return bookings;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.date.split('/').reverse().join('-')); // Convert DD/MM/YYYY to YYYY-MM-DD
      
      switch (dateFilter) {
        case 'today':
          return bookingDate >= today && bookingDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          return bookingDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          return bookingDate >= monthAgo;
        default:
          return true;
      }
    });
  };

  const displayedBookings = getFilteredBookings();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'credit_card':
        return 'Thẻ tín dụng';
      case 'cash':
        return 'Tiền mặt';
      case 'transfer':
        return 'Chuyển khoản';
      default:
        return method;
    }
  };

  const exportData = async () => {
    // Kiểm tra nếu không có dữ liệu
    if (getTotalExportCount() === 0) {
      console.warn('Không có dữ liệu để xuất');
      return;
    }

    try {
      // Lấy toàn bộ dữ liệu theo bộ lọc hiện tại (không phân trang)
      const allDataParams: OwnerBookingParams = {
        page: 1,
        limit: 999999, // Lấy tất cả dữ liệu
        sortBy: 'booking_date',
        sortOrder: 'desc'
      };

      if (statusFilter !== 'all') {
        allDataParams.status = statusFilter;
      }

      if (searchTerm) {
        allDataParams.search = searchTerm;
      }

      if (startDate && endDate) {
        allDataParams.startDate = startDate;
        allDataParams.endDate = endDate;
      }

      // Fetch toàn bộ dữ liệu để xuất
      const allDataResponse = await ownerBookingService.getOwnerBookings(allDataParams);
      let allBookings = allDataResponse.bookings;

      // Áp dụng bộ lọc date filter nếu có
      if (dateFilter !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        allBookings = allBookings.filter(booking => {
          const bookingDate = new Date(booking.date.split('/').reverse().join('-')); // Convert DD/MM/YYYY to YYYY-MM-DD
          
          switch (dateFilter) {
            case 'today':
              return bookingDate >= today && bookingDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
            case 'week':
              const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
              return bookingDate >= weekAgo;
            case 'month':
              const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
              return bookingDate >= monthAgo;
            default:
              return true;
          }
        });
      }

      // Chuẩn bị dữ liệu để xuất (sử dụng toàn bộ dữ liệu)
      const exportBookings = allBookings.map((booking, index) => ({
        'STT': index + 1,
        'Mã đặt sân': booking.id,
        'Tên khách hàng': booking.customerName || 'Không xác định',
        'Email': booking.customerEmail || '',
        'Số điện thoại': booking.customerPhone || '',
        'Tên sân': booking.fieldName.split(' (')[0],
        'Loại sân': booking.fieldType,
        'Ngày chơi': booking.date,
        'Thời gian': booking.timeSlot,
        'Thời gian đặt': booking.bookingDate,
        'Tổng tiền (VND)': booking.totalPrice,
        'Phương thức thanh toán': getPaymentMethodText(booking.paymentMethod),
        'Trạng thái': getStatusText(booking.status),
        'Đánh giá (1-5)': booking.rating ? booking.rating.toString() : 'Chưa đánh giá',
        'Nhận xét': booking.review || '',
        'Lý do hủy': booking.cancellationReason || '',
        'Phương thức hoàn tiền': booking.refundMethod || '',
        'Số tiền hoàn': booking.refundAmount || ''
      }));

      // Tạo worksheet từ dữ liệu
      const ws = XLSX.utils.json_to_sheet(exportBookings);

      // Thiết lập độ rộng cột
      const colWidths = [
        { wch: 5 },   // STT
        { wch: 15 },  // Mã đặt sân
        { wch: 20 },  // Tên khách hàng
        { wch: 25 },  // Email
        { wch: 15 },  // Số điện thoại
        { wch: 25 },  // Tên sân
        { wch: 15 },  // Loại sân
        { wch: 12 },  // Ngày chơi
        { wch: 15 },  // Thời gian
        { wch: 18 },  // Thời gian đặt
        { wch: 15 },  // Tổng tiền
        { wch: 15 },  // Số tiền cọc
        { wch: 15 },  // Còn lại
        { wch: 18 },  // Phương thức thanh toán
        { wch: 12 },  // Trạng thái
        { wch: 12 },  // Đánh giá
        { wch: 30 },  // Nhận xét
        { wch: 20 },  // Lý do hủy
        { wch: 18 },  // Phương thức hoàn tiền
        { wch: 15 }   // Số tiền hoàn
      ];
      ws['!cols'] = colWidths;

      // Tạo workbook và thêm worksheet
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Chi tiết đặt sân');

      // Thêm sheet thống kê tổng quan nếu có stats
      if (stats) {
        const currentDate = new Date().toLocaleDateString('vi-VN');
        const filterInfo = [];
        
        // Thêm thông tin bộ lọc
        if (statusFilter !== 'all') {
          const statusText = statusFilter === 'confirmed' ? 'Đã xác nhận' : 
                           statusFilter === 'completed' ? 'Hoàn thành' : 
                           statusFilter === 'cancelled' ? 'Đã hủy' : 
                           statusFilter === 'refund' ? 'Hoàn tiền' : statusFilter;
          filterInfo.push(['Lọc theo trạng thái', statusText]);
        }
        if (searchTerm) {
          filterInfo.push(['Từ khóa tìm kiếm', searchTerm]);
        }
        if (startDate && endDate) {
          filterInfo.push(['Từ ngày', startDate]);
          filterInfo.push(['Đến ngày', endDate]);
        }
        if (dateFilter !== 'all') {
          const dateFilterMap = {
            'today': 'Hôm nay',
            'week': '7 ngày qua',
            'month': '30 ngày qua'
          };
          filterInfo.push(['Lọc thời gian', dateFilterMap[dateFilter as keyof typeof dateFilterMap]]);
        }

        const statsData = [
          ['BÁOCÁO THỐNG KÊ ĐẶT SÂN'],
          ['Ngày xuất báo cáo', currentDate],
          ['Tổng số bản ghi', allBookings.length],
          [],
          ['CÁC BỘ LỌC ÁP DỤNG'],
          ...filterInfo,
          [],
          ['THỐNG KÊ TỔNG QUAN'],
          ['Chỉ số', 'Số lượng', 'Tỷ lệ (%)'],
          ['Tổng số đặt sân', stats.totalBookings || 0, '100%'],
          ['Đã xác nhận', stats.confirmedBookings || 0, `${((stats.confirmedBookings || 0) / (stats.totalBookings || 1) * 100).toFixed(1)}%`],
          ['Hoàn thành', stats.completedBookings || 0, `${((stats.completedBookings || 0) / (stats.totalBookings || 1) * 100).toFixed(1)}%`],
          ['Đã hủy', stats.cancelledBookings || 0, `${((stats.cancelledBookings || 0) / (stats.totalBookings || 1) * 100).toFixed(1)}%`],
          ['Hoàn tiền', stats.refundBookings || 0, `${((stats.refundBookings || 0) / (stats.totalBookings || 1) * 100).toFixed(1)}%`],
          [],
          ['THỐNG KÊ DOANH THU'],
          ['Tổng doanh thu', stats.totalRevenue || 0, 'VND'],
          ['Doanh thu trung bình/đặt sân', Math.round((stats.totalRevenue || 0) / (stats.totalBookings || 1)), 'VND']
        ];
        
        const statsWs = XLSX.utils.aoa_to_sheet(statsData);
        
        // Thiết lập độ rộng cột cho sheet thống kê
        statsWs['!cols'] = [
          { wch: 30 },  // Chỉ số
          { wch: 15 },  // Số lượng/Giá trị
          { wch: 15 }   // Đơn vị/Tỷ lệ
        ];
        
        XLSX.utils.book_append_sheet(wb, statsWs, 'Thống kê tổng quan');
      }

      // Tạo tên file với thời gian hiện tại và bộ lọc
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
      
      let fileName = `thong-ke-dat-san-${dateStr}_${timeStr}`;
      
      // Thêm thông tin bộ lọc vào tên file
      if (statusFilter !== 'all') {
        fileName += `_${statusFilter}`;
      }
      if (dateFilter !== 'all') {
        fileName += `_${dateFilter}`;
      }
      
      fileName += '.xlsx';

      // Xuất file
      XLSX.writeFile(wb, fileName);
      
      // Log thông báo thành công
      console.log(`✅ Xuất dữ liệu thành công! File: ${fileName}, Số bản ghi: ${allBookings.length}`);
      
    } catch (error) {
      console.error('Lỗi khi xuất dữ liệu:', error);
    }
  };

  const uniqueFields = [...new Set(bookings.map(b => b.fieldName))];

  // Function to calculate total export count
  const getTotalExportCount = () => {
    // This is an estimation based on current stats and filters
    if (statusFilter !== 'all' || searchTerm || (startDate && endDate) || dateFilter !== 'all') {
      // If there are filters, we use the total from API response
      return totalItems;
    }
    // If no filters, use total bookings from stats
    return stats?.totalBookings || totalItems;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            <p className="font-bold">Lỗi!</p>
            <p>{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">📊 Thống Kê Đặt Sân Chi Tiết</h1>
              <p className="text-blue-100">Quản lý và phân tích tất cả đặt sân</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/owner/dashboard')}
                className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 border border-blue-300 text-white px-4 py-2 rounded-lg transition-all"
              >
                <i className="fas fa-arrow-left"></i>
                <span>Quay lại Dashboard</span>
              </button>
              <button
                onClick={async () => {
                  await ownerBookingService.refreshData();
                  setCurrentPage(1);
                  const params: OwnerBookingParams = {
                    page: 1,
                    limit: itemsPerPage,
                    sortBy: 'booking_date',
                    sortOrder: 'desc'
                  };
                  fetchBookings(params);
                }}
                className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 border border-blue-300 text-white px-4 py-2 rounded-lg transition-all"
              >
                <i className="fas fa-refresh"></i>
                <span>Làm mới</span>
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 border border-blue-300 text-white px-4 py-2 rounded-lg transition-all"
              >
                <i className="fas fa-download"></i>
                <span>Xuất dữ liệu</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng đặt sân</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalBookings || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-calendar-alt text-blue-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Hoàn tiền</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.refundBookings || 0}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-undo text-yellow-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đã xác nhận</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.confirmedBookings || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-check-circle text-blue-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Hoàn thành</p>
                <p className="text-2xl font-bold text-green-600">{stats?.completedBookings || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-check-double text-green-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đã hủy</p>
                <p className="text-2xl font-bold text-red-600">{stats?.cancelledBookings || 0}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-times-circle text-red-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng doanh thu</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(stats?.totalRevenue || 0)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-dollar-sign text-green-600"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 mb-6">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <h3 className="text-lg font-semibold text-gray-900">🔍 Bộ lọc</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Tìm kiếm</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tên, email, số điện thoại..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <i className="fas fa-search absolute left-3 top-2.5 text-gray-400"></i>
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tất cả</option>
                <option value="confirmed">Đã xác nhận</option>
                <option value="completed">Hoàn thành</option>
                <option value="cancelled">Đã hủy</option>
                <option value="refund">Hoàn tiền</option>
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Thời gian</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tất cả</option>
                <option value="today">Hôm nay</option>
                <option value="week">7 ngày qua</option>
                <option value="month">30 ngày qua</option>
              </select>
            </div>

            {/* Field Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sân</label>
              <select
                value={fieldFilter}
                onChange={(e) => setFieldFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tất cả sân</option>
                {uniqueFields.map(field => (
                  <option key={field} value={field}>{field}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Từ ngày</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Đến ngày</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Results Info */}
        <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Hiển thị {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} trong tổng số {totalItems} kết quả
              </span>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => setShowExportModal(true)}
                disabled={getTotalExportCount() === 0}
                className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm transition-all ${
                  getTotalExportCount() === 0
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                <i className="fas fa-file-excel"></i>
                <span>Xuất Excel</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Khách hàng
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sân & Thời gian
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thời gian đặt
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thanh toán
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Đánh giá
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayedBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">
                            {booking.customerName?.charAt(0) || 'N'}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{booking.customerName || 'Không xác định'}</div>
                          <div className="text-sm text-gray-500">{booking.customerEmail || ''}</div>
                          <div className="text-sm text-gray-500">{booking.customerPhone || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        {booking.fieldName.split(' (')[0]}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        {booking.subFields && booking.subFields.length > 0 ? 
                          booking.subFields.map((subField, index) => (
                            <div key={index} className="flex items-center space-x-1">
                              <span className="text-blue-600 font-medium">{subField.name.trim()}:</span>
                              <span className="text-gray-700">{subField.timeSlot}</span>
                            </div>
                          )) : 
                          <div className="flex items-center space-x-1">
                            <span className="text-blue-600 font-medium">{booking.fieldType}:</span>
                            <span className="text-gray-700">{booking.timeSlot}</span>
                          </div>
                        }
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        📅 {booking.date}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center space-x-2 mb-2">
                          <i className="fas fa-calendar-plus text-blue-500"></i>
                          <span className="font-medium">Đặt lúc:</span>
                          <span className="text-gray-700">{booking.bookingDate}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-calendar-check text-green-500"></i>
                          <span className="font-medium">Ngày chơi:</span>
                          <span className="text-gray-700">{booking.playDate || booking.date}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(booking.totalPrice)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {getPaymentMethodText(booking.paymentMethod)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}>
                        {getStatusText(booking.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {booking.rating ? (
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <i
                                key={i}
                                className={`fas fa-star text-sm ${
                                  i < Math.floor(booking.rating!) ? 'text-yellow-400' : 'text-gray-300'
                                }`}
                              ></i>
                            ))}
                          </div>
                          <span className="text-sm text-gray-600">{booking.rating}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Chưa đánh giá</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => navigate(`/owner/booking-detail/${booking.id}`)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Xem chi tiết"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        <button className="text-green-600 hover:text-green-900" title="Chỉnh sửa">
                          <i className="fas fa-edit"></i>
                        </button>
                        {booking.status === 'refund' && (
                          <button className="text-yellow-600 hover:text-yellow-900" title="Xử lý hoàn tiền">
                            <i className="fas fa-undo"></i>
                          </button>
                        )}
                        <button className="text-red-600 hover:text-red-900" title="Hủy">
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200 mt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                
                {[...Array(totalPages)].map((_, index) => {
                  const page = index + 1;
                  if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded-lg text-sm ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="text-gray-400">...</span>;
                  }
                  return null;
                })}
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
              
              <div className="text-sm text-gray-600">
                Trang {currentPage} / {totalPages}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">📊 Xuất dữ liệu Excel</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                Sẽ xuất toàn bộ <strong>{getTotalExportCount()}</strong> bản ghi đặt sân theo bộ lọc hiện tại (không chỉ {displayedBookings.length} bản ghi hiển thị trên trang này).
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">📋 Dữ liệu sẽ bao gồm:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Thông tin khách hàng (tên, email, SĐT)</li>
                  <li>• Chi tiết đặt sân (sân, thời gian, ngày)</li>
                  <li>• Thông tin thanh toán</li>
                  <li>• Trạng thái và đánh giá</li>
                  <li>• Thống kê tổng quan (sheet riêng)</li>
                </ul>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  exportData();
                  setShowExportModal(false);
                }}
                disabled={getTotalExportCount() === 0}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                  getTotalExportCount() === 0
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <i className="fas fa-download"></i>
                <span>Xuất Excel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingStatistics;
