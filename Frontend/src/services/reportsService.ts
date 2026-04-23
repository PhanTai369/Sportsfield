import { DetailedRevenueData, FilterOptions, TimeRange, ChartType, ViewMode } from '../types/reportsTypes';
import apiClient from '../lib/apiClient';
import { toast } from 'sonner';

class ReportsService {
  private baseURL = import.meta.env.VITE_API_URL || 'https://football-field-booking-backend.onrender.com/api';

  async getDetailedRevenueData(filters: FilterOptions): Promise<DetailedRevenueData> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Không tìm thấy token xác thực');
      }

      // Build query parameters
      const queryParams = new URLSearchParams({
        timeRange: filters.timeRange,
        chartType: filters.chartType,
        viewMode: filters.viewMode,
        showPredictions: filters.showPredictions.toString(),
        showTrendLine: filters.showTrendLine.toString()
      });

      if (filters.customDateRange) {
        queryParams.append('customDateRange', JSON.stringify(filters.customDateRange));
      }

      if (filters.selectedFields) {
        queryParams.append('selectedFields', filters.selectedFields.join(','));
      }

      // Get detailed reports data
      const response = await fetch(`${this.baseURL}/revenue/detailed-reports?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Không thể tải dữ liệu báo cáo');
      }

      // Get field revenue data for Top 5
      const fieldRevenueResponse = await fetch(`${this.baseURL}/revenue/field-revenue`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (fieldRevenueResponse.ok) {
        const fieldRevenueResult = await fieldRevenueResponse.json();
        if (fieldRevenueResult.success) {
          // Replace fieldComparison with actual Top 5 data
          result.data.fieldComparison = fieldRevenueResult.data;
        }
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching reports data:', error);
      throw new Error('Không thể tải dữ liệu báo cáo. Vui lòng thử lại.');
    }
  }

  async exportReportPDF(data: DetailedRevenueData, filters: FilterOptions): Promise<void> {
    // Simulate PDF export
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('Exporting PDF report...', { data, filters });
    
    // In real app, this would generate and download PDF
    const blob = new Blob(['Mock PDF content'], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-report-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async exportReportExcel(data: DetailedRevenueData, filters: FilterOptions): Promise<void> {
    try {
      // Import the Excel export utility
      const { exportOwnerRevenueReportToExcel } = await import('../utils/ownerReportsExcelExport');
      
      // Export the detailed report with all data
      const filename = exportOwnerRevenueReportToExcel({ data, filters });
      
      toast.success(`Xuất Excel thành công! File: ${filename}`, {
        description: 'Báo cáo chi tiết đã được xuất ra file Excel',
        duration: 4000,
      });
      
      console.log('Excel report exported successfully:', filename);
    } catch (error) {
      console.error('Error exporting Excel report:', error);
      
      // Fallback to simple export if detailed export fails
      try {
        const { exportSimpleOwnerRevenueReport } = await import('../utils/ownerReportsExcelExport');
        const filename = exportSimpleOwnerRevenueReport(data);
        
        toast.success(`Xuất Excel đơn giản thành công! File: ${filename}`, {
          description: 'Đã xuất dữ liệu cơ bản ra file Excel',
          duration: 4000,
        });
        
        console.log('Simple Excel report exported as fallback:', filename);
      } catch (fallbackError) {
        console.error('Fallback export also failed:', fallbackError);
        toast.error('Không thể xuất file Excel', {
          description: 'Vui lòng thử lại sau hoặc liên hệ hỗ trợ',
          duration: 5000,
        });
        throw new Error('Không thể xuất file Excel. Vui lòng thử lại.');
      }
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatCurrencyShort(amount: number): string {
    if (amount >= 1000000000) {
      return (amount / 1000000000).toFixed(1) + 'B ₫';
    } else if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + 'M ₫';
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(1) + 'K ₫';
    }
    return amount.toLocaleString('vi-VN') + ' ₫';
  }
}

export default new ReportsService();
