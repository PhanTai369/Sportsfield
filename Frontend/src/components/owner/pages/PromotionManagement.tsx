import React, { useState, useEffect } from 'react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface Field {
  id: string;
  name: string;
  images1?: string;
  price_per_hour: number;
  is_verified?: boolean;
}

interface Promotion {
  id: string;
  title: string;
  discount_percent: number;
  valid_from: string;
  valid_to: string;
  field_id: string;
  created_at: string;
  field: Field;
}

interface PromotionStats {
  total: number;
  active: number;
  expired: number;
}

const PromotionManagement: React.FC = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [stats, setStats] = useState<PromotionStats>({ total: 0, active: 0, expired: 0 });
  const [loading, setLoading] = useState(true);
  const [paginating, setPaginating] = useState(false); // New state for pagination loading
  const [showModal, setShowModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    discount_percent: '',
    valid_from: '',
    valid_to: '',
    field_id: '',
    field_ids: [] as string[] // For multiple field selection
  });

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://football-field-booking-backend.onrender.com/api';

  // Toast functions
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  useEffect(() => {
    const isInitialLoad = currentPage === 1 && promotions.length === 0;
    fetchPromotions(isInitialLoad);
    
    if (isInitialLoad) {
      fetchFields();
      fetchStats();
    }
  }, [currentPage]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('⚠️ No token found in localStorage');
      showToast('Chưa đăng nhập. Vui lòng đăng nhập lại.', 'error');
      return null;
    }
    
    // Check if token is expired (basic check)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        console.warn('⚠️ Token expired');
        showToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
        localStorage.removeItem('token');
        // Redirect to login or refresh page
        setTimeout(() => window.location.reload(), 2000);
        return null;
      }
    } catch (e) {
      console.warn('⚠️ Invalid token format');
      showToast('Token không hợp lệ. Vui lòng đăng nhập lại.', 'error');
      localStorage.removeItem('token');
      return null;
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };
  };

  const fetchPromotions = async (isInitialLoad = false) => {
    try {
      console.log('🔄 Fetching promotions...');
      
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setPaginating(true);
      }
      
      const headers = getAuthHeaders();
      if (!headers) {
        console.error('❌ No valid auth headers');
        setLoading(false);
        setPaginating(false);
        return;
      }
      
      const url = `${API_BASE_URL}/promotions/owner?page=${currentPage}&limit=10&t=${Date.now()}`;
      console.log('📍 API URL:', url);
      
      const response = await fetch(url, { headers });
      
      console.log('📊 Promotions response status:', response.status);
      console.log('📋 Promotions response ok:', response.ok);
      
      if (!response.ok) {
        console.error('❌ Promotions response not OK:', response.status, response.statusText);
        if (response.status === 401) {
          showToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
          localStorage.removeItem('token');
          setTimeout(() => window.location.reload(), 2000);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📦 Promotions response data:', data);
      
      if (data.success) {
        setPromotions(data.data.promotions);
        setTotalPages(data.data.pagination.totalPages);
        console.log('✅ Promotions loaded:', data.data.promotions.length);
      } else {
        console.error('❌ Promotions API returned success=false:', data);
        showToast(data.error?.message || 'API trả về lỗi', 'error');
      }
    } catch (error) {
      console.error('💥 Error fetching promotions:', error);
      showToast(`Lỗi khi tải ưu đãi: ${error.message}`, 'error');
    } finally {
      setLoading(false);
      setPaginating(false);
    }
  };

  const fetchFields = async () => {
    try {
      console.log('🔄 Fetching fields...');
      const headers = getAuthHeaders();
      if (!headers) {
        console.error('❌ No valid auth headers');
        return;
      }
      
      const url = `${API_BASE_URL}/promotions/owner/fields?t=${Date.now()}`;
      console.log('📍 API URL:', url);
      console.log('🔑 Auth headers:', headers);
      
      const response = await fetch(url, { headers });
      
      console.log('📊 Response status:', response.status);
      console.log('📋 Response ok:', response.ok);
      console.log('🌐 Response URL:', response.url);
      
      if (!response.ok) {
        console.error('❌ Response not OK:', response.status, response.statusText);
        if (response.status === 401) {
          showToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
          localStorage.removeItem('token');
          setTimeout(() => window.location.reload(), 2000);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📦 Fields response data:', data);
      
      if (data.success) {
        setFields(data.data);
        console.log('✅ Fields set successfully:', data.data.length, 'fields');
      } else {
        console.error('❌ API returned success=false:', data);
        showToast(data.error?.message || 'API trả về lỗi', 'error');
      }
    } catch (error) {
      console.error('💥 Error fetching fields:', error);
      showToast(`Lỗi khi tải danh sách sân bóng: ${error.message}`, 'error');
    }
  };

  const fetchStats = async () => {
    try {
      const headers = getAuthHeaders();
      if (!headers) return;
      
      const response = await fetch(`${API_BASE_URL}/promotions/owner/stats`, { headers });
      
      if (!response.ok) {
        if (response.status === 401) {
          showToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
          localStorage.removeItem('token');
          setTimeout(() => window.location.reload(), 2000);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.discount_percent || !formData.valid_from || !formData.valid_to || formData.field_ids.length === 0) {
      showToast('Vui lòng điền đầy đủ thông tin và chọn ít nhất một sân bóng', 'error');
      return;
    }

    const discount = parseInt(formData.discount_percent);
    if (discount < 1 || discount > 100) {
      showToast('Phần trăm giảm giá phải từ 1% đến 100%', 'error');
      return;
    }

    if (new Date(formData.valid_from) >= new Date(formData.valid_to)) {
      showToast('Ngày kết thúc phải sau ngày bắt đầu', 'error');
      return;
    }

    try {
      if (editingPromotion) {
        // For editing, only update the existing promotion
        const url = `${API_BASE_URL}/promotions/${editingPromotion.id}`;
        const requestData = {
          ...formData,
          field_id: formData.field_ids[0] // Use first selected field for update
        };

        const response = await fetch(url, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(requestData)
        });

        const data = await response.json();

        if (data.success) {
          showToast('Cập nhật ưu đãi thành công', 'success');
          setShowModal(false);
          resetForm();
          fetchPromotions(false); // Refresh current page
          fetchStats();
        } else {
          showToast(data.error?.message || 'Có lỗi xảy ra', 'error');
        }
      } else {
        // For creating, create promotions for each selected field
        const promises = formData.field_ids.map(async (field_id) => {
          const requestData = {
            title: formData.title,
            discount_percent: formData.discount_percent,
            valid_from: formData.valid_from,
            valid_to: formData.valid_to,
            field_id
          };

          return fetch(`${API_BASE_URL}/promotions`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(requestData)
          });
        });

        const responses = await Promise.all(promises);
        const results = await Promise.all(responses.map(r => r.json()));

        const successCount = results.filter(data => data.success).length;
        const failedCount = results.length - successCount;

        if (successCount > 0) {
          showToast(
            failedCount > 0 
              ? `Tạo thành công ${successCount} ưu đãi, ${failedCount} thất bại`
              : `Tạo thành công ${successCount} ưu đãi cho các sân bóng`, 
            failedCount > 0 ? 'error' : 'success'
          );
          setShowModal(false);
          resetForm();
          fetchPromotions(false); // Refresh current page
          fetchStats();
        } else {
          showToast('Không thể tạo ưu đãi này', 'error');
        }
      }
    } catch (error) {
      console.error('Error saving promotion:', error);
      showToast('Lỗi khi lưu ưu đãi', 'error');
    }
  };

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      title: promotion.title,
      discount_percent: promotion.discount_percent.toString(),
      valid_from: new Date(promotion.valid_from).toISOString().split('T')[0],
      valid_to: new Date(promotion.valid_to).toISOString().split('T')[0],
      field_id: promotion.field_id,
      field_ids: [promotion.field_id] // Initialize with current field
    });
    setShowModal(true);
  };

  const handleDelete = async (promotionId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa ưu đãi này?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/promotions/${promotionId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      const data = await response.json();

      if (data.success) {
        showToast('Xóa ưu đãi thành công', 'success');
        fetchPromotions(false); // Refresh current page
        fetchStats();
      } else {
        showToast(data.error?.message || 'Có lỗi xảy ra', 'error');
      }
    } catch (error) {
      console.error('Error deleting promotion:', error);
      showToast('Lỗi khi xóa ưu đãi', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      discount_percent: '',
      valid_from: '',
      valid_to: '',
      field_id: '',
      field_ids: []
    });
    setEditingPromotion(null);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const isActive = (promotion: Promotion) => {
    const now = new Date();
    const endDate = new Date(promotion.valid_to);
    return endDate > now;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Quản lý ưu đãi</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors duration-200"
          >
            <i className="fas fa-plus mr-2"></i>
            Tạo ưu đãi mới
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <i className="fas fa-percentage text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tổng ưu đãi</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <i className="fas fa-check-circle text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Đang hoạt động</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 text-red-600">
                <i className="fas fa-times-circle text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Đã hết hạn</p>
                <p className="text-2xl font-bold text-gray-900">{stats.expired}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Promotions List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Danh sách ưu đãi</h2>
        </div>

        <div className="overflow-x-auto relative">
          {paginating && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
                <span className="text-sm text-gray-600">Đang tải...</span>
              </div>
            </div>
          )}
          
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ưu đãi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sân bóng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giảm giá
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thời gian
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {promotions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <i className="fas fa-percentage text-4xl text-gray-300 mb-4"></i>
                      <p>Chưa có ưu đãi nào</p>
                      <p className="text-sm">Tạo ưu đãi đầu tiên để thu hút khách hàng</p>
                    </div>
                  </td>
                </tr>
              ) : (
                promotions.map((promotion) => (
                  <tr key={promotion.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{promotion.title}</div>
                        <div className="text-sm text-gray-500">
                          Tạo ngày {formatDate(promotion.created_at)}
                        </div>
                        <div className="text-xs text-blue-600 mt-1">
                          Áp dụng cho: {promotion.field.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {promotion.field.images1 && (
                          <img
                            className="h-10 w-10 rounded-lg object-cover mr-3"
                            src={promotion.field.images1}
                            alt={promotion.field.name}
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{promotion.field.name}</div>
                          <div className="text-sm text-gray-500">
                            {promotion.field.price_per_hour.toLocaleString('vi-VN')}đ/giờ
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        {promotion.discount_percent}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div>Từ: {formatDate(promotion.valid_from)}</div>
                        <div>Đến: {formatDate(promotion.valid_to)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isActive(promotion) ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <i className="fas fa-check-circle mr-1"></i>
                          Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <i className="fas fa-times-circle mr-1"></i>
                          Hết hạn
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(promotion)}
                          className="text-indigo-600 hover:text-indigo-900 transition-colors duration-200"
                          title="Chỉnh sửa"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(promotion.id)}
                          className="text-red-600 hover:text-red-900 transition-colors duration-200"
                          title="Xóa"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <p className="text-sm text-gray-700">
                  Trang <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
                </p>
                <p className="text-sm text-gray-500">
                  Hiển thị {promotions.length} / {stats.total} ưu đãi
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1 || paginating}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors duration-200"
                  title="Trang đầu"
                >
                  <i className="fas fa-angle-double-left"></i>
                </button>
                
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1 || paginating}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors duration-200 flex items-center"
                >
                  <i className="fas fa-chevron-left mr-1"></i>
                  Trước
                </button>
                
                {/* Page numbers */}
                <div className="flex items-center space-x-1">
                  {(() => {
                    const pages = [];
                    const startPage = Math.max(1, currentPage - 2);
                    const endPage = Math.min(totalPages, currentPage + 2);
                    
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i)}
                          disabled={paginating}
                          className={`px-3 py-2 text-sm border rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                            i === currentPage
                              ? 'bg-green-600 text-white border-green-600'
                              : 'border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          {i}
                        </button>
                      );
                    }
                    return pages;
                  })()}
                </div>
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages || paginating}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors duration-200 flex items-center"
                >
                  Sau
                  <i className="fas fa-chevron-right ml-1"></i>
                </button>
                
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages || paginating}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors duration-200"
                  title="Trang cuối"
                >
                  <i className="fas fa-angle-double-right"></i>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal for Create/Edit Promotion */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingPromotion ? 'Chỉnh sửa ưu đãi' : 'Tạo ưu đãi mới'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiêu đề ưu đãi
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="VD: Giảm giá cuối tuần"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sân bóng
                </label>
                {fields.length === 0 ? (
                  <div className="text-sm text-gray-500 p-2 border border-gray-300 rounded-md bg-gray-50">
                    Không có sân bóng nào. Vui lòng tạo sân bóng trước.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        Tích để chọn các sân bóng áp dụng ưu đãi này
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            const allFieldIds = fields.map(f => f.id);
                            setFormData({ 
                              ...formData, 
                              field_ids: allFieldIds,
                              field_id: allFieldIds[0] || ''
                            });
                          }}
                          className="text-xs text-green-600 hover:text-green-800"
                        >
                          Chọn tất cả
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ 
                              ...formData, 
                              field_ids: [],
                              field_id: ''
                            });
                          }}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    </div>
                    <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2 space-y-1">
                      {fields.map((field) => (
                        <label key={field.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={formData.field_ids.includes(field.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ 
                                  ...formData, 
                                  field_ids: [...formData.field_ids, field.id],
                                  field_id: formData.field_ids.length === 0 ? field.id : formData.field_id // Set first selection as primary
                                });
                              } else {
                                const newFieldIds = formData.field_ids.filter(id => id !== field.id);
                                setFormData({ 
                                  ...formData, 
                                  field_ids: newFieldIds,
                                  field_id: newFieldIds.length > 0 ? newFieldIds[0] : '' // Update primary field
                                });
                              }
                            }}
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                          <div className="flex items-center space-x-2 flex-1">
                            {field.images1 && (
                              <img
                                src={field.images1}
                                alt={field.name}
                                className="w-8 h-8 rounded object-cover"
                              />
                            )}
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                {field.name}
                                {!field.is_verified && (
                                  <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                                    Chưa xác minh
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">
                                {field.price_per_hour.toLocaleString('vi-VN')}đ/giờ
                              </div>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                    {formData.field_ids.length === 0 && (
                      <div className="text-xs text-red-500">
                        Vui lòng chọn ít nhất một sân bóng
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phần trăm giảm giá (%)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.discount_percent}
                  onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="VD: 20"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày bắt đầu
                  </label>
                  <input
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày kết thúc
                  </label>
                  <input
                    type="date"
                    value={formData.valid_to}
                    onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200"
                >
                  {editingPromotion ? 'Cập nhật' : 'Tạo ưu đãi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 space-y-2 z-50">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg flex items-center justify-between min-w-80 ${
              toast.type === 'success'
                ? 'bg-green-100 text-green-800 border border-green-200'
                : toast.type === 'error'
                ? 'bg-red-100 text-red-800 border border-red-200'
                : 'bg-blue-100 text-blue-800 border border-blue-200'
            }`}
          >
            <div className="flex items-center">
              <i className={`fas ${
                toast.type === 'success'
                  ? 'fa-check-circle'
                  : toast.type === 'error'
                  ? 'fa-exclamation-circle'
                  : 'fa-info-circle'
              } mr-2`}></i>
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-3 text-current hover:opacity-70"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PromotionManagement;
