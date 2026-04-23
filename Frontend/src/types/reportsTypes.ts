export interface DailyRevenue {
  date: string;
  revenue: number;
  bookings: number;
  averagePerBooking: number;
  percentageVsAverage: number;
  isWeekend: boolean;
  isHoliday?: boolean;
  events?: string[];
}

export interface HourlyData {
  hour: number;
  day: number; // 0-6 (Sunday-Saturday)
  bookings: number;
  revenue: number;
  occupancyRate: number;
}

export interface SeasonalData {
  period: string;
  revenue: number;
  bookings: number;
  averageRating: number;
  trend: 'up' | 'down' | 'stable';
}

export interface PredictionData {
  date: string;
  predictedRevenue: number;
  confidence: number;
  factors: string[];
}

export interface DetailedRevenueData {
  dailyRevenue: DailyRevenue[];
  fieldComparison: FieldRevenueData[];
  hourlyHeatmap: HourlyData[][];
  seasonalTrends: SeasonalData[];
  predictions: PredictionData[];
  summary: {
    totalRevenue: number;
    averageDailyRevenue: number;
    bestDay: {
      date: string;
      revenue: number;
      reason?: string;
    };
    growthRate: number;
    previousPeriodComparison: {
      revenue: number;
      bookings: number;
      growth: number;
    };
  };
}

export interface PackageServiceStats {
  summary: {
    totalRevenue: number;
    totalPackages: number;
    basicPackages: number;
    premiumPackages: number;
  };
  packageStats: PackageTypeStats[];
  monthlyRevenue: MonthlyPackageRevenue[];
  topUsers: TopPackageUser[];
  recentPurchases: RecentPackagePurchase[];
}

export interface PackageTypeStats {
  packageType: 'basic' | 'premium';
  packageName: string;
  totalPurchases: number;
  totalRevenue: number;
  avgPrice: number;
  firstPurchase: string;
  latestPurchase: string;
}

export interface MonthlyPackageRevenue {
  year: number;
  month: number;
  purchasesCount: number;
  revenue: number;
  packageType: 'basic' | 'premium';
}

export interface TopPackageUser {
  name: string;
  email: string;
  role: string;
  totalPackages: number;
  totalSpent: number;
  latestPurchase: string;
  packageTypes: string;
}

export interface RecentPackagePurchase {
  id: string;
  date: string;
  price: number;
  packageType: 'basic' | 'premium';
  packageName: string;
  userName: string;
  userEmail: string;
  userRole: string;
}

export interface FieldRevenueData {
  id: string;
  name: string;
  revenue: number;
  bookings: number;
  averageRating: number;
  totalReviews: number;
  growth: number;
  percentage: number;
  trend: number[];
  peakHours: string[];
  type: 'grass' | 'artificial' | 'indoor';
  rank?: number; // Thêm thứ hạng cho Top 5
}

export type TimeRange = '7d' | '30d' | '3m' | '6m' | '1y' | 'custom';
export type ChartType = 'bar' | 'line' | 'mixed';
export type ViewMode = 'daily' | 'weekly' | 'monthly';
export type TabType = 'daily' | 'fields' | 'hours' | 'comparison';

export interface FilterOptions {
  timeRange: TimeRange;
  chartType: ChartType;
  viewMode: ViewMode;
  customDateRange?: {
    start: string;
    end: string;
  };
  selectedFields?: string[];
  showPredictions: boolean;
  showTrendLine: boolean;
}
