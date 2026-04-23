import { ChartData, DashboardStats } from './types';

// Mock data service - replace with actual API calls
export class AdminDashboardService {
  
  static async getDashboardStats(): Promise<DashboardStats> {
    // Simulate API call
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          totalUsers: 1494,
          fieldOwners: 245,
          activityRate: 89,
          revenue: 580000000,
          userGrowth: 16,
          ownerGrowth: 17,
          activityGrowth: 8,
          revenueGrowth: 15
        });
      }, 500);
    });
  }

  static async getChartData(): Promise<ChartData> {
    // Simulate API call
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          userGrowth: {
            months: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
            owners: [80, 90, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300],
            customers: [120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340]
          },
          totalUsers: {
            months: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
            total: [200, 230, 280, 320, 360, 400, 440, 480, 520, 560, 600, 640]
          },
          userTypeDistribution: {
            owners: 16,
            customers: 83,
            admins: 1
          },
          userStatus: {
            active: 92,
            blocked: 2,
            inactive: 7
          }
        });
      }, 500);
    });
  }

  static async exportReport(type: 'pdf' | 'excel', data: any): Promise<Blob> {
    // Simulate report generation
    return new Promise(resolve => {
      setTimeout(() => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        resolve(blob);
      }, 1000);
    });
  }
}

// Utility functions for data formatting
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('vi-VN').format(num);
};

export const formatPercentage = (percent: number): string => {
  return `${percent}%`;
};
