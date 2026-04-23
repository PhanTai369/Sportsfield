import { API_BASE_URL } from '../config/api';

export interface FieldRevenueData {
  id: string;
  name: string;
  revenue: number;
  bookings: number;
  averageRating: number;
  totalReviews: number;
  growth: number;
  percentage: number;
}

export interface DashboardStats {
  totalRevenue: number;
  totalBookings: number;
  newCustomers: number;
  averageRating: number;
  totalReviews: number;
  revenueGrowth: number;
  bookingGrowth: number;
  customerGrowth: number;
  ratingGrowth: number;
}

export interface MonthlyRevenueData {
  month: string;
  revenue: number;
}

export interface RevenueResponse {
  success: boolean;
  data: {
    stats: DashboardStats;
    fieldRevenue: FieldRevenueData[];
    monthlyRevenue: MonthlyRevenueData[];
  };
  message?: string;
}

export interface RecentBookingData {
  id: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  fieldName: string;
  date: string;
  status: 'refund' | 'confirmed' | 'cancelled' | 'completed' | 'payment_pending';
  avatar: string;
  createdAt?: string;
}

export interface RecentReviewData {
  id: string;
  rating: number;
  comment: string;
  fieldName: string;
  userName: string;
  userEmail?: string;
  avatar: string;
  createdAt: string;
  timeAgo: string;
}

export interface PopularTimeSlotData {
  id: string;
  timeRange: string;
  bookings: number;
  percentage: number;
}

class RevenueService {
  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private async makeRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(`${API_BASE_URL}${url}`, config);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('Không thể kết nối tới server. Vui lòng kiểm tra kết nối mạng.');
      }
      throw error;
    }
  }

  /**
   * Lấy thống kê doanh thu tổng quan cho owner
   */
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const response = await this.makeRequest<{ success: boolean; data: DashboardStats }>('/revenue/dashboard-stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Lấy doanh thu theo sân của owner
   */
  async getFieldRevenue(): Promise<FieldRevenueData[]> {
    try {
      const response = await this.makeRequest<{ success: boolean; data: FieldRevenueData[] }>('/revenue/field-revenue');
      return response.data;
    } catch (error) {
      console.error('Error fetching field revenue:', error);
      throw error;
    }
  }

  /**
   * Lấy doanh thu theo tháng
   */
  async getMonthlyRevenue(): Promise<MonthlyRevenueData[]> {
    try {
      const response = await this.makeRequest<{ success: boolean; data: MonthlyRevenueData[] }>('/revenue/monthly-revenue');
      return response.data;
    } catch (error) {
      console.error('Error fetching monthly revenue:', error);
      throw error;
    }
  }

  /**
   * Lấy tất cả dữ liệu revenue cho dashboard
   */
  async getAllRevenueData(): Promise<{
    stats: DashboardStats;
    fieldRevenue: FieldRevenueData[];
    monthlyRevenue: MonthlyRevenueData[];
  }> {
    try {
      const response = await this.makeRequest<RevenueResponse>('/revenue/dashboard');
      return response.data;
    } catch (error) {
      console.error('Error fetching all revenue data:', error);
      throw error;
    }
  }

  /**
   * Lấy doanh thu theo khoảng thời gian
   */
  async getRevenueByDateRange(startDate: string, endDate: string): Promise<{
    totalRevenue: number;
    fieldRevenue: FieldRevenueData[];
    dailyRevenue: { date: string; revenue: number }[];
  }> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: {
          totalRevenue: number;
          fieldRevenue: FieldRevenueData[];
          dailyRevenue: { date: string; revenue: number }[];
        };
      }>(`/revenue/date-range?startDate=${startDate}&endDate=${endDate}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching revenue by date range:', error);
      throw error;
    }
  }

  /**
   * Lấy top các sân có doanh thu cao nhất
   */
  async getTopRevenueFields(limit: number = 5): Promise<FieldRevenueData[]> {
    try {
      const response = await this.makeRequest<{ success: boolean; data: FieldRevenueData[] }>(`/revenue/top-fields?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching top revenue fields:', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách đặt sân gần đây
   */
  async getRecentBookings(limit: number = 5): Promise<RecentBookingData[]> {
    try {
      const response = await this.makeRequest<{ success: boolean; data: RecentBookingData[] }>(`/revenue/recent-bookings?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching recent bookings:', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách đánh giá gần đây
   */
  async getRecentReviews(limit: number = 5): Promise<RecentReviewData[]> {
    try {
      const response = await this.makeRequest<{ success: boolean; data: RecentReviewData[] }>(`/revenue/recent-reviews?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching recent reviews:', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách khung giờ phổ biến
   */
  async getPopularTimeSlots(limit: number = 5): Promise<PopularTimeSlotData[]> {
    try {
      const response = await this.makeRequest<{ success: boolean; data: PopularTimeSlotData[] }>(`/revenue/popular-timeslots?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching popular time slots:', error);
      throw error;
    }
  }

  /**
   * Kiểm tra kết nối tới API
   */
  async checkApiHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch (error) {
      console.error('API health check failed:', error);
      return false;
    }
  }

  /**
   * Lấy danh sách đánh giá chi tiết với phân trang
   */
  async getReviewsWithPagination(page: number = 1, limit: number = 20, filters?: {
    rating?: number;
    search?: string;
    sortBy?: 'newest' | 'oldest' | 'rating_high' | 'rating_low';
  }): Promise<{
    reviews: RecentReviewData[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters?.rating && { rating: filters.rating.toString() }),
        ...(filters?.search && { search: filters.search }),
        ...(filters?.sortBy && { sortBy: filters.sortBy }),
      });

      const response = await this.makeRequest<{
        success: boolean;
        data: {
          reviews: RecentReviewData[];
          totalCount: number;
          totalPages: number;
          currentPage: number;
        };
      }>(`/revenue/reviews-detailed?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching detailed reviews:', error);
      throw error;
    }
  }

  /**
   * Gửi phản hồi cho đánh giá
   */
  async replyToReview(reviewId: string, content: string): Promise<{
    id: string;
    content: string;
    createdAt: string;
  }> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: {
          id: string;
          content: string;
          createdAt: string;
        };
      }>(`/revenue/reviews/${reviewId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      return response.data;
    } catch (error) {
      console.error('Error replying to review:', error);
      throw error;
    }
  }

  /**
   * Cập nhật phản hồi
   */
  async updateReply(reviewId: string, replyId: string, content: string): Promise<{
    id: string;
    content: string;
    updatedAt: string;
  }> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: {
          id: string;
          content: string;
          updatedAt: string;
        };
      }>(`/revenue/reviews/${reviewId}/reply/${replyId}`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
      });
      return response.data;
    } catch (error) {
      console.error('Error updating reply:', error);
      throw error;
    }
  }

  /**
   * Xóa phản hồi
   */
  async deleteReply(reviewId: string, replyId: string): Promise<void> {
    try {
      await this.makeRequest<{ success: boolean }>(`/revenue/reviews/${reviewId}/reply/${replyId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting reply:', error);
      throw error;
    }
  }
}

export default new RevenueService();
