import axios from 'axios';
import { API_BASE_URL } from '../config/api';

// Helper function to get auth token from localStorage
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

// Helper function to validate UUID format
const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

class AdminFieldService {
  // Get all fields with optional status filter
  async getAllFields(status = 'pending') {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/fields/all`, {
        params: { status },
        ...getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching fields:', error);
      throw error;
    }
  }

  // Get paginated fields with sorting, filtering and search
  async getFieldsPaginated(page = 1, limit = 10, status = 'pending', searchTerm = '') {
    try {
      console.log(`Fetching fields with status: ${status}, page: ${page}, search: ${searchTerm}`);
      const response = await axios.get(`${API_BASE_URL}/admin/fields/paginated`, {
        params: { 
          page, 
          limit, 
          status, // Always send status, default to 'pending'
          search: searchTerm || undefined,
          sort: 'created_at', // Fix: Use created_at instead of createdAt to match backend column name
          order: 'DESC'
        },
        ...getAuthHeaders()
      });
      
      // Log the response to check field ID format
      if (response.data && response.data.data && response.data.data.length > 0) {
        console.log("API Response - First field:", response.data.data[0]);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching paginated fields:', error);
      throw error;
    }
  }

  // Get detailed information about a specific field
  async getFieldDetail(fieldId: string) {
    try {
      // Verify if the fieldId is in UUID format (for debugging)
      if (fieldId && !isValidUUID(fieldId)) {
        console.warn(`Field ID ${fieldId} is not in UUID format`);
        return {
          success: false,
          error: {
            code: 'INVALID_UUID',
            message: 'ID sân bóng không đúng định dạng UUID'
          }
        };
      }
      
      const response = await axios.get(
        `${API_BASE_URL}/admin/fields/detail/${fieldId}`,
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching field detail for ID ${fieldId}:`, error);
      throw error;
    }
  }

  // Approve a field
  async approveField(fieldId: string) {
    try {
      // Check if the fieldId is in UUID format
      if (!isValidUUID(fieldId)) {
        console.error(`Field ID ${fieldId} is not in UUID format, cannot proceed with approval`);
        return {
          success: false,
          error: {
            code: 'INVALID_UUID',
            message: 'ID sân bóng không đúng định dạng UUID'
          }
        };
      }
      
      console.log(`Service: Approving field ID ${fieldId}`);
      const response = await axios.put(
        `${API_BASE_URL}/admin/fields/verify/${fieldId}`,
        {},  // Empty body
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error(`Error approving field ID ${fieldId}:`, error);
      throw error;
    }
  }

  // Reject a field with optional reason
  async rejectField(fieldId: string, reason = '') {
    try {
      // Check if the fieldId is in UUID format
      if (!isValidUUID(fieldId)) {
        console.error(`Field ID ${fieldId} is not in UUID format, cannot proceed with rejection`);
        return {
          success: false,
          error: {
            code: 'INVALID_UUID',
            message: 'ID sân bóng không đúng định dạng UUID'
          }
        };
      }
      
      console.log(`Service: Rejecting field ID ${fieldId}`);
      const response = await axios.put(
        `${API_BASE_URL}/admin/fields/reject/${fieldId}`,
        { reason },
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error(`Error rejecting field ID ${fieldId}:`, error);
      throw error;
    }
  }
}

export default new AdminFieldService();
