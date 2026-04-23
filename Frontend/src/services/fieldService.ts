import { API_BASE_URL } from '../config/api';

export interface Field {
  id: string;
  name: string;
  description: string;
  price_per_hour: number;
  images1?: string;
  images2?: string;
  images3?: string;
  is_verified: boolean;
  created_at: string;
  updated_at?: string;
  location?: {
    id: string;
    address_text: string;
    city: string;
    district: string;
    ward: string;
  };
  owner?: {
    id: string;
    name: string;
    phone: string;
  };
  SubFields?: Array<{
    id: string;
    name: string;
    field_type: string;
  }>;
}

export interface UserLicense {
  business_license_image?: string;
  identity_card_image?: string;
  identity_card_back_image?: string;
  has_complete_license: boolean;
  has_business_license: boolean;
  has_identity_card_front: boolean;
  has_identity_card_back: boolean;
  last_updated: string;
}

export interface UserLicenseResponse {
  license: UserLicense;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface FieldsResponse {
  success: boolean;
  data: Field[];
}

export interface PaginatedFieldsResponse {
  success: boolean;
  data: {
    items: Field[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    };
  };
}

class FieldService {
  private baseUrl = `${API_BASE_URL}/fields`;

  /**
   * Lấy tất cả fields (không phân trang)
   */
  async getAllFields(): Promise<Field[]> {
    try {
      const response = await fetch(`${this.baseUrl}/all`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: FieldsResponse = await response.json();
      
      if (!result.success) {
        throw new Error('Failed to fetch fields');
      }
      
      return result.data;
    } catch (error) {
      console.error('Error fetching all fields:', error);
      throw error;
    }
  }

  /**
   * Lấy fields với phân trang
   */
  async getFields(page: number = 1): Promise<PaginatedFieldsResponse['data']> {
    try {
      const response = await fetch(`${this.baseUrl}?page=${page}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: PaginatedFieldsResponse = await response.json();
      
      if (!result.success) {
        throw new Error('Failed to fetch fields');
      }
      
      return result.data;
    } catch (error) {
      console.error('Error fetching fields:', error);
      throw error;
    }
  }

  /**
   * Lấy thông tin chi tiết của một field
   */
  async getFieldDetail(id: string): Promise<Field> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error('Failed to fetch field detail');
      }
      
      return result.data;
    } catch (error) {
      console.error('Error fetching field detail:', error);
      throw error;
    }
  }

  /**
   * Tìm kiếm fields theo tên hoặc loại sân
   */
  async searchFields(params: { name?: string; field_type?: string }): Promise<Field[]> {
    try {
      // Xây dựng query string từ các tham số
      const queryParams = new URLSearchParams();
      if (params.name) {
        queryParams.append('name', params.name);
      }
      if (params.field_type) {
        queryParams.append('field_type', params.field_type);
      }
      
      const response = await fetch(`${this.baseUrl}/search?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: FieldsResponse = await response.json();
      
      if (!result.success) {
        throw new Error('Failed to search fields');
      }
      
      return result.data;
    } catch (error) {
      console.error('Error searching fields:', error);
      throw error;
    }
  }

  /**
   * Lấy fields của owner đã đăng nhập
   */
  async getOwnerFields(): Promise<Field[]> {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      
      if (!token) {
        console.warn('No authentication token found, falling back to all fields');
        // Fallback to getAllFields if no token
        return this.getAllFields();
      }
      
      const response = await fetch(`${this.baseUrl}/owner/my-fields`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.warn('Authentication failed, falling back to all fields');
          // Fallback to getAllFields if authentication fails
          return this.getAllFields();
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: FieldsResponse = await response.json();
      
      if (!result.success) {
        throw new Error('Failed to fetch owner fields');
      }
      
      return result.data;
    } catch (error) {
      console.error('Error fetching owner fields:', error);
      // Fallback to getAllFields on any error
      console.warn('Falling back to getAllFields due to error');
      return this.getAllFields();
    }
  }

  /**
   * Tạo field mới (dành cho owner)
   */
  async createField(fieldData: Partial<Field>): Promise<Field> {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(fieldData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error('Failed to create field');
      }
      
      return result.data;
    } catch (error) {
      console.error('Error creating field:', error);
      throw error;
    }
  }

  /**
   * Tạo field mới với file upload (dành cho owner)
   */  async addFieldWithFiles(formData: FormData): Promise<Field> {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    console.log('=== SENDING FIELD DATA ===');
    // Log FormData contents for debugging
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`${key}: File(${value.name}, ${value.size} bytes)`);
      } else {
        console.log(`${key}: ${value}`);
      }
    }
    console.log('=== END FIELD DATA ===');

    const response = await fetch(`${API_BASE_URL}/fields/with-files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData, // FormData will set Content-Type automatically
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Backend error response:', errorData);
      throw new Error(errorData.error?.message || `HTTP ${response.status}: Failed to add field`);
    }

    const result = await response.json();
    console.log('Success response:', result);
    
    if (!result.success) {
      console.error('Backend returned success=false:', result);
      throw new Error(result.error?.message || 'Failed to add field');
    }

    return result.data;
  }
  /**
   * Lấy thông tin giấy phép của user hiện tại
   */
  async getUserLicense(): Promise<UserLicenseResponse> {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${this.baseUrl}/owner/license`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to fetch license information');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to fetch license information');
    }

    return result.data;
  }

  /**
   * Cập nhật giấy phép của user (upload documents)
   */
  async updateUserLicense(formData: FormData): Promise<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${this.baseUrl}/owner/license`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to update license documents');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to update license documents');
    }

    return result.data;
  }

  /**
   * Xóa tài liệu giấy phép cụ thể
   */
  async deleteLicenseDocument(documentType: 'business_license' | 'identity_card_front' | 'identity_card_back'): Promise<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${this.baseUrl}/owner/license/${documentType}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to delete license document');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to delete license document');
    }

    return result.data;
  }

  /**
   * Lấy thông tin sân bóng để chỉnh sửa (chỉ owner)
   */
  async getFieldForEdit(fieldId: string): Promise<Field> {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${this.baseUrl}/edit/${fieldId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `HTTP ${response.status}: Failed to get field for edit`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to get field for edit');
    }

    return result.data;
  }

  /**
   * Cập nhật sân bóng với file upload (dành cho owner)
   */
  async updateFieldWithFiles(fieldId: string, formData: FormData): Promise<Field> {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    console.log('=== UPDATING FIELD DATA ===');
    console.log('Field ID:', fieldId);
    // Log FormData contents for debugging
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`${key}: File(${value.name}, ${value.size} bytes)`);
      } else {
        console.log(`${key}: ${value}`);
      }
    }
    console.log('=== END FIELD UPDATE DATA ===');

    const response = await fetch(`${this.baseUrl}/${fieldId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData, // FormData will set Content-Type automatically
    });

    console.log('Update response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Backend error response:', errorData);
      throw new Error(errorData.error?.message || `HTTP ${response.status}: Failed to update field`);
    }

    const result = await response.json();
    console.log('Update success response:', result);
    
    if (!result.success) {
      console.error('Backend returned success=false:', result);
      throw new Error(result.error?.message || 'Failed to update field');
    }

    return result.data;
  }
}

export const fieldService = new FieldService();
export default fieldService;
