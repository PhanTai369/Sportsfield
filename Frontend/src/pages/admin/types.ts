export interface StatsCard {
  title: string;
  value: string;
  growth: string;
  icon: any;
  iconBg: string;
  iconColor: string;
}

export interface ChartData {
  userGrowth: {
    months: string[];
    owners: number[];
    customers: number[];
  };
  totalUsers: {
    months: string[];
    total: number[];
  };
  userTypeDistribution: {
    owners: number;
    customers: number;
    admins: number;
  };
  userStatus: {
    active: number;
    blocked: number;
    inactive: number;
  };
}

export interface DashboardStats {
  totalUsers: number;
  fieldOwners: number;
  activityRate: number;
  revenue: number;
  userGrowth: number;
  ownerGrowth: number;
  activityGrowth: number;
  revenueGrowth: number;
}

export type TabType = 'Người dùng' | 'Hoạt động' | 'Doanh thu';
