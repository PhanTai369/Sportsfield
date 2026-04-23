import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { PackageServiceStats } from '../types/reportsTypes';

class AdminDashboardService {
  private getHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Lấy thống kê chi tiết gói dịch vụ
   */
  async getPackageServiceStats(): Promise<PackageServiceStats> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/admin/dashboard/package-service-stats`,
        { headers: this.getHeaders() }
      );
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Không thể lấy thống kê gói dịch vụ');
      }
    } catch (error: any) {
      console.error('Error fetching package service stats:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Có lỗi xảy ra khi lấy thống kê gói dịch vụ'
      );
    }
  }

  /**
   * Lấy thống kê dashboard tổng quan
   */
  async getDashboardStatistics(): Promise<any> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/admin/dashboard/statistics`,
        { headers: this.getHeaders() }
      );
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Không thể lấy thống kê dashboard');
      }
    } catch (error: any) {
      console.error('Error fetching dashboard statistics:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Có lỗi xảy ra khi lấy thống kê dashboard'
      );
    }
  }

  /**
   * Lấy dữ liệu doanh thu theo tháng
   */
  async getMonthlyRevenue(year?: number): Promise<any[]> {
    try {
      const url = year 
        ? `${API_BASE_URL}/admin/dashboard/monthly-revenue?year=${year}`
        : `${API_BASE_URL}/admin/dashboard/monthly-revenue`;
        
      const response = await axios.get(url, { headers: this.getHeaders() });
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Không thể lấy dữ liệu doanh thu theo tháng');
      }
    } catch (error: any) {
      console.error('Error fetching monthly revenue:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Có lỗi xảy ra khi lấy dữ liệu doanh thu theo tháng'
      );
    }
  }

  /**
   * Lấy danh sách chủ sân hàng đầu
   */
  async getTopFieldOwners(): Promise<any[]> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/admin/dashboard/top-field-owners`,
        { headers: this.getHeaders() }
      );
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Không thể lấy danh sách chủ sân hàng đầu');
      }
    } catch (error: any) {
      console.error('Error fetching top field owners:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Có lỗi xảy ra khi lấy danh sách chủ sân hàng đầu'
      );
    }
  }
}

export default new AdminDashboardService();
