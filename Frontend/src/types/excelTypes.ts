// Types for Excel export functionality
export interface ExcelOwnerData {
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

export interface ExcelSummaryData {
  totalOwners: number;
  totalFields: number;
  totalBookings: number;
  totalRevenue: number;
  avgBookingValue: number;
  totalCustomers: number;
}

export interface ExcelFilters {
  period: string;
  year: number;
  month: number | null;
}

export interface ExcelExportData {
  owners: ExcelOwnerData[];
  summary: ExcelSummaryData;
  filters: ExcelFilters;
}
