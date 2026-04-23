import { useState, useEffect } from 'react';
import { DetailedRevenueData, FilterOptions, TimeRange, ChartType, ViewMode } from '../types/reportsTypes';
import reportsService from '../services/reportsService';
import { toast } from 'sonner';

export const useReportsData = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DetailedRevenueData | null>(null);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  const [filters, setFilters] = useState<FilterOptions>({
    timeRange: '30d',
    chartType: 'mixed',
    viewMode: 'daily',
    showPredictions: true,
    showTrendLine: true
  });

  const fetchData = async (newFilters?: Partial<FilterOptions>) => {
    setLoading(true);
    setError(null);
    
    try {
      const finalFilters = { ...filters, ...newFilters };
      const result = await reportsService.getDetailedRevenueData(finalFilters);
      setData(result);
      
      if (newFilters) {
        setFilters(finalFilters);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Có lỗi xảy ra khi tải dữ liệu';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateFilters = (newFilters: Partial<FilterOptions>) => {
    fetchData(newFilters);
  };

  const exportPDF = async () => {
    if (!data) return;
    
    setExporting('pdf');
    try {
      await reportsService.exportReportPDF(data, filters);
      toast.success('Xuất báo cáo PDF thành công!');
    } catch (err) {
      toast.error('Có lỗi xảy ra khi xuất PDF');
    } finally {
      setExporting(null);
    }
  };

  const exportExcel = async () => {
    if (!data) return;
    
    setExporting('excel');
    try {
      await reportsService.exportReportExcel(data, filters);
      toast.success('Xuất dữ liệu Excel thành công!');
    } catch (err) {
      toast.error('Có lỗi xảy ra khi xuất Excel');
    } finally {
      setExporting(null);
    }
  };

  const refreshData = () => {
    fetchData();
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);

  return {
    loading,
    error,
    data,
    filters,
    exporting,
    updateFilters,
    exportPDF,
    exportExcel,
    refreshData,
    formatCurrency: reportsService.formatCurrency,
    formatCurrencyShort: reportsService.formatCurrencyShort
  };
};
