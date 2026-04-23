import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { ExcelExportData, ExcelSummaryData, ExcelFilters } from '../types/excelTypes';

export const exportRevenueDataToExcel = (data: ExcelExportData) => {
  // Create a new workbook
  const wb = XLSX.utils.book_new();

  // Sheet 1: Tổng quan
  const summaryData = [
    ['THỐNG KÊ DOANH THU ĐẶT SÂN', ''],
    ['Thời gian xuất:', new Date().toLocaleString('vi-VN')],
    ['Chu kỳ thống kê:', getPeriodText(data.filters.period, data.filters.year, data.filters.month)],
    [''],
    ['CHỈ SỐ TỔNG QUAN', ''],
    ['Tổng số chủ sân:', data.summary.totalOwners],
    ['Tổng số sân:', data.summary.totalFields],
    ['Tổng lượt đặt:', data.summary.totalBookings],
    ['Tổng doanh thu:', formatCurrency(data.summary.totalRevenue)],
    ['Giá trị trung bình/đặt:', formatCurrency(data.summary.avgBookingValue)],
    ['Tổng khách hàng:', data.summary.totalCustomers],
  ];

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  
  // Styling for summary sheet
  summaryWs['!cols'] = [{ width: 25 }, { width: 20 }];
  
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Tổng quan');

  // Sheet 2: Chi tiết chủ sân
  const ownerHeaders = [
    'STT',
    'Tên chủ sân',
    'Email',
    'Số sân',
    'Số khách hàng',
    'Tổng doanh thu (VNĐ)',
    'Giá trị TB/đặt (VNĐ)'
  ];

  const ownerData = [
    ownerHeaders,
    ...data.owners.map((owner, index) => [
      index + 1,
      owner.ownerName,
      owner.ownerEmail,
      owner.totalFields,
      owner.uniqueCustomers,
      owner.totalRevenue,
      owner.avgBookingValue
    ])
  ];

  const ownerWs = XLSX.utils.aoa_to_sheet(ownerData);
  
  // Auto width for all columns
  const ownerColWidths = ownerHeaders.map(() => ({ width: 20 }));
  ownerWs['!cols'] = ownerColWidths;

  XLSX.utils.book_append_sheet(wb, ownerWs, 'Chi tiết chủ sân');

  // Sheet 3: Top performers
  const topPerformers = [...data.owners]
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10);

  const topPerformersData = [
    ['TOP 10 CHỦ SÂN CÓ DOANH THU CAO NHẤT', ''],
    [''],
    ['Hạng', 'Tên chủ sân', 'Email', 'Doanh thu (VNĐ)', 'Số sân', 'Số khách hàng'],
    ...topPerformers.map((owner, index) => [
      index + 1,
      owner.ownerName,
      owner.ownerEmail,
      owner.totalRevenue,
      owner.totalFields,
      owner.uniqueCustomers
    ])
  ];

  const topPerformersWs = XLSX.utils.aoa_to_sheet(topPerformersData);
  topPerformersWs['!cols'] = [
    { width: 8 },
    { width: 25 },
    { width: 30 },
    { width: 18 },
    { width: 15 },
    { width: 15 }
  ];

  XLSX.utils.book_append_sheet(wb, topPerformersWs, 'Top chủ sân');

  // Generate filename
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const periodStr = getPeriodText(data.filters.period, data.filters.year, data.filters.month)
    .replace(/\s+/g, '_')
    .replace(/[^\w\-_]/g, '');
  
  const filename = `Thong_ke_doanh_thu_dat_san_${periodStr}_${dateStr}.xlsx`;

  // Save file
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename);

  return filename;
};

// Helper functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
};

const getPeriodText = (period: string, year: number, month: number | null): string => {
  switch (period) {
    case 'daily':
      return month ? `Hàng ngày tháng ${month}/${year}` : `Hàng ngày năm ${year}`;
    case 'yearly':
      return 'Hàng năm';
    default:
      return `Hàng tháng năm ${year}`;
  }
};

// Export summary data to Excel (simpler version)
export const exportSummaryToExcel = (summary: ExcelSummaryData, filters: ExcelFilters) => {
  const data = [
    ['TỔNG QUAN THỐNG KÊ DOANH THU ĐẶT SÂN'],
    [''],
    ['Thời gian xuất:', new Date().toLocaleString('vi-VN')],
    ['Chu kỳ:', getPeriodText(filters.period, filters.year, filters.month)],
    [''],
    ['Tổng số chủ sân:', summary.totalOwners],
    ['Tổng số sân:', summary.totalFields],
    ['Tổng lượt đặt:', summary.totalBookings],
    ['Tổng doanh thu:', formatCurrency(summary.totalRevenue)],
    ['Giá trị trung bình/đặt:', formatCurrency(summary.avgBookingValue)],
    ['Tổng khách hàng:', summary.totalCustomers],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ width: 30 }, { width: 20 }];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tổng quan');

  const filename = `Tong_quan_doanh_thu_${new Date().toISOString().split('T')[0]}.xlsx`;
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename);

  return filename;
};
