// Import các interfaces từ reportsTypes
import type { 
  DetailedRevenueData, 
  FilterOptions, 
  DailyRevenue, 
  FieldRevenueData,
  HourlyData,
  SeasonalData,
  PredictionData 
} from './reportsTypes';

// Interfaces cho Excel export của Owner Reports
export interface ExcelOwnerReportData {
  data: DetailedRevenueData;
  filters: FilterOptions;
}

// Interface cho dữ liệu tóm tắt Excel
export interface ExcelOwnerSummaryData {
  totalRevenue: number;
  averageDailyRevenue: number;
  totalBookings: number;
  totalFields: number;
  growthRate: number;
  bestDayRevenue: number;
  bestDayDate: string;
}

// Interface cho filters Excel
export interface ExcelOwnerFilters {
  timeRange: string;
  chartType: string;
  viewMode: string;
  customDateRange?: {
    start: string;
    end: string;
  };
}

// Re-export types for convenience
export type { 
  DetailedRevenueData, 
  FilterOptions, 
  DailyRevenue, 
  FieldRevenueData,
  HourlyData,
  SeasonalData,
  PredictionData 
};
