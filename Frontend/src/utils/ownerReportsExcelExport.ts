import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { DetailedRevenueData, FilterOptions } from '../types/reportsTypes';

// Interface cho dữ liệu xuất Excel
interface ExcelReportData {
  data: DetailedRevenueData;
  filters: FilterOptions;
}

// Hàm chính để xuất báo cáo doanh thu chi tiết ra Excel
export const exportOwnerRevenueReportToExcel = (reportData: ExcelReportData): string => {
  const { data, filters } = reportData;
  
  // Tạo workbook mới
  const wb = XLSX.utils.book_new();

  // Sheet 1: Tổng quan
  const summaryData = [
    ['BÁO CÁO DOANH THU CHI TIẾT', ''],
    ['Thời gian xuất:', new Date().toLocaleString('vi-VN')],
    ['Khoảng thời gian:', getTimeRangeText(filters.timeRange)],
    ['Loại biểu đồ:', getChartTypeText(filters.chartType)],
    ['Chế độ xem:', getViewModeText(filters.viewMode)],
    [''],
    ['📊 THỐNG KÊ TỔNG QUAN', ''],
    ['Tổng doanh thu:', formatCurrency(data.summary.totalRevenue)],
    ['Doanh thu trung bình/ngày:', formatCurrency(data.summary.averageDailyRevenue)],
    ['Tỷ lệ tăng trưởng:', `${data.summary.growthRate}%`],
    ['Ngày có doanh thu cao nhất:', data.summary.bestDay.date],
    ['Doanh thu cao nhất trong ngày:', formatCurrency(data.summary.bestDay.revenue)],
    [''],
    ['📈 SO SÁNH KỲ TRƯỚC', ''],
    ['Doanh thu kỳ trước:', formatCurrency(data.summary.previousPeriodComparison.revenue)],
    ['Số lượt đặt kỳ trước:', data.summary.previousPeriodComparison.bookings.toString()],
    ['Tăng trưởng so với kỳ trước:', `${data.summary.previousPeriodComparison.growth}%`],
  ];

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWs['!cols'] = [{ width: 30 }, { width: 25 }];
  
  // Styling for summary sheet
  const summaryRange = XLSX.utils.decode_range(summaryWs['!ref'] || 'A1');
  for (let rowIndex = summaryRange.s.r; rowIndex <= summaryRange.e.r; rowIndex++) {
    const cellA = `A${rowIndex + 1}`;
    const cellB = `B${rowIndex + 1}`;
    
    if (summaryWs[cellA] && (summaryWs[cellA].v?.toString().includes('📊') || summaryWs[cellA].v?.toString().includes('📈'))) {
      summaryWs[cellA].s = {
        font: { bold: true, color: { rgb: "0066CC" } },
        fill: { fgColor: { rgb: "E6F3FF" } }
      };
    }
  }
  
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Tổng quan');

  // Sheet 2: Doanh thu theo ngày
  const dailyHeaders = [
    'STT',
    'Ngày',
    'Thứ trong tuần',
    'Doanh thu (VNĐ)', 
    'Số lượt đặt',
    'Doanh thu TB/lượt (VNĐ)',
    '% so với TB',
    'Cuối tuần',
    'Ghi chú'
  ];

  const dailyData = [
    ['DOANH THU THEO NGÀY', '', '', '', '', '', '', '', ''],
    ['Kỳ báo cáo:', getTimeRangeText(filters.timeRange), '', '', '', '', '', '', ''],
    ['Tổng số ngày:', data.dailyRevenue.length.toString(), '', '', '', '', '', '', ''],
    [''],
    dailyHeaders,
    ...data.dailyRevenue.map((day, index) => [
      index + 1,
      day.date,
      getDayOfWeekText(day.date),
      day.revenue,
      day.bookings,
      day.averagePerBooking,
      `${day.percentageVsAverage > 0 ? '+' : ''}${day.percentageVsAverage}%`,
      day.isWeekend ? 'Có' : 'Không',
      day.isHoliday ? 'Ngày lễ' : (day.isWeekend ? 'Cuối tuần' : 'Ngày thường')
    ])
  ];

  const dailyWs = XLSX.utils.aoa_to_sheet(dailyData);
  dailyWs['!cols'] = [
    { width: 8 },   // STT
    { width: 15 },  // Ngày
    { width: 15 },  // Thứ trong tuần
    { width: 18 },  // Doanh thu
    { width: 15 },  // Số lượt đặt
    { width: 20 },  // Doanh thu TB/lượt
    { width: 12 },  // % so với TB
    { width: 12 },  // Cuối tuần
    { width: 15 }   // Ghi chú
  ];

  XLSX.utils.book_append_sheet(wb, dailyWs, 'Doanh thu theo ngày');

  // Sheet 3: So sánh theo sân
  const fieldHeaders = [
    'STT',
    'Tên sân',
    'Loại sân',
    'Doanh thu (VNĐ)',
    'Số lượt đặt',
    'Tỷ lệ (%)',
    'Tăng trưởng (%)',
    'Điểm đánh giá TB',
    'Tổng số đánh giá',
    'Giờ cao điểm',
    'Hiệu suất'
  ];

  const fieldData = [
    ['SO SÁNH HIỆU SUẤT THEO SÂN', '', '', '', '', '', '', '', '', '', ''],
    ['Tổng số sân:', data.fieldComparison.length.toString(), '', '', '', '', '', '', '', '', ''],
    ['Sân có doanh thu cao nhất:', data.fieldComparison.length > 0 ? data.fieldComparison[0].name : 'N/A', '', '', '', '', '', '', '', '', ''],
    [''],
    fieldHeaders,
    ...data.fieldComparison.map((field, index) => [
      index + 1,
      field.name,
      getFieldTypeText(field.type),
      field.revenue,
      field.bookings,
      `${field.percentage}%`,
      `${field.growth > 0 ? '+' : ''}${field.growth.toFixed(1)}%`,
      field.averageRating.toFixed(1),
      field.totalReviews,
      field.peakHours.join(', '),
      getFieldPerformanceText(field.percentage, field.averageRating)
    ])
  ];

  const fieldWs = XLSX.utils.aoa_to_sheet(fieldData);
  fieldWs['!cols'] = [
    { width: 8 },   // STT
    { width: 20 },  // Tên sân
    { width: 15 },  // Loại sân
    { width: 18 },  // Doanh thu
    { width: 15 },  // Số lượt đặt
    { width: 12 },  // Tỷ lệ
    { width: 15 },  // Tăng trưởng
    { width: 15 },  // Điểm đánh giá
    { width: 15 },  // Tổng đánh giá
    { width: 20 },  // Giờ cao điểm
    { width: 15 }   // Hiệu suất
  ];

  XLSX.utils.book_append_sheet(wb, fieldWs, 'So sánh theo sân');

 
  // Sheet 5: Dự báo (nếu có dữ liệu)
  if (data.predictions && data.predictions.length > 0) {
    const predictionHeaders = [
      'STT',
      'Ngày dự báo',
      'Doanh thu dự báo (VNĐ)',
      'Độ tin cậy (%)',
      'Các yếu tố ảnh hưởng'
    ];

    const predictionData = [
      predictionHeaders,
      ...data.predictions.map((prediction, index) => [
        index + 1,
        prediction.date,
        prediction.predictedRevenue,
        `${prediction.confidence}%`,
        prediction.factors.join(', ')
      ])
    ];

    const predictionWs = XLSX.utils.aoa_to_sheet(predictionData);
    predictionWs['!cols'] = [
      { width: 8 },
      { width: 15 },
      { width: 20 },
      { width: 15 },
      { width: 30 }
    ];

    XLSX.utils.book_append_sheet(wb, predictionWs, 'Dự báo');
  }

  // Tạo tên file
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  const filename = `Bao_cao_doanh_thu_chi_tiet_${dateStr}_${timeStr}.xlsx`;

  // Xuất file
  const wbout = XLSX.write(wb, { 
    bookType: 'xlsx', 
    type: 'array',
    bookSST: true,
    compression: true
  });
  
  const blob = new Blob([wbout], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' 
  });
  
  saveAs(blob, filename);

  return filename;
};

// Hàm hỗ trợ format tiền tệ
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(amount);
};

// Hàm chuyển đổi timeRange thành text
const getTimeRangeText = (timeRange: string): string => {
  switch (timeRange) {
    case '7d': return '7 ngày qua';
    case '30d': return '30 ngày qua';
    case '3m': return '3 tháng qua';
    case '6m': return '6 tháng qua';
    case '1y': return '1 năm qua';
    case 'custom': return 'Tùy chỉnh';
    default: return timeRange;
  }
};

// Hàm chuyển đổi chartType thành text
const getChartTypeText = (chartType: string): string => {
  switch (chartType) {
    case 'bar': return 'Biểu đồ cột';
    case 'line': return 'Biểu đồ đường';
    case 'mixed': return 'Biểu đồ kết hợp';
    default: return chartType;
  }
};

// Hàm chuyển đổi viewMode thành text
const getViewModeText = (viewMode: string): string => {
  switch (viewMode) {
    case 'daily': return 'Theo ngày';
    case 'weekly': return 'Theo tuần';
    case 'monthly': return 'Theo tháng';
    default: return viewMode;
  }
};

// Hàm chuyển đổi field type thành text
const getFieldTypeText = (type: string): string => {
  switch (type) {
    case 'grass': return 'Sân cỏ tự nhiên';
    case 'artificial': return 'Sân cỏ nhân tạo';
    case 'indoor': return 'Sân trong nhà';
    default: return 'Không xác định';
  }
};

// Hàm chuyển đổi trend thành text
const getTrendText = (trend: string): string => {
  switch (trend) {
    case 'up': return '📈 Tăng';
    case 'down': return '📉 Giảm';
    case 'stable': return '➡️ Ổn định';
    default: return trend;
  }
};

// Hàm lấy thứ trong tuần từ ngày
const getDayOfWeekText = (dateString: string): string => {
  try {
    // Parse date từ định dạng dd/mm/yyyy hoặc mm/dd/yyyy
    const parts = dateString.split('/');
    let date: Date;
    
    if (parts.length === 3) {
      // Giả sử định dạng dd/mm/yyyy
      date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    } else {
      date = new Date(dateString);
    }
    
    const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return dayNames[date.getDay()];
  } catch (error) {
    return 'N/A';
  }
};

// Hàm đánh giá hiệu suất sân
const getFieldPerformanceText = (percentage: number, rating: number): string => {
  if (percentage >= 30 && rating >= 4.0) {
    return '🌟 Xuất sắc';
  } else if (percentage >= 20 && rating >= 3.5) {
    return '✅ Tốt';
  } else if (percentage >= 10 && rating >= 3.0) {
    return '📈 Khá';
  } else if (percentage >= 5) {
    return '⚠️ Trung bình';
  } else {
    return '📉 Cần cải thiện';
  }
};

// Hàm xuất Excel đơn giản chỉ với dữ liệu cơ bản
export const exportSimpleOwnerRevenueReport = (data: DetailedRevenueData): string => {
  const wb = XLSX.utils.book_new();

  // Chỉ xuất dữ liệu doanh thu theo ngày
  const csvData = [
    ['Ngày', 'Doanh thu (VNĐ)', 'Số lượt đặt', 'Doanh thu TB/lượt (VNĐ)', '% so với TB'],
    ...data.dailyRevenue.map(day => [
      day.date,
      day.revenue,
      day.bookings,
      day.averagePerBooking,
      `${day.percentageVsAverage > 0 ? '+' : ''}${day.percentageVsAverage}%`
    ])
  ];

  const ws = XLSX.utils.aoa_to_sheet(csvData);
  ws['!cols'] = [
    { width: 15 },
    { width: 18 },
    { width: 15 },
    { width: 20 },
    { width: 12 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Doanh thu theo ngày');

  const filename = `Doanh_thu_don_gian_${new Date().toISOString().split('T')[0]}.xlsx`;
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  saveAs(blob, filename);
  return filename;
};
