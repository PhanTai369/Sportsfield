import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import fieldService, { Field } from '../../../services/fieldService';
import authService from '../../../services/authService';
import PackageStatusAlert from '../../common/PackageStatusAlert';
import { usePackageStatus } from '../../../hooks/usePackageStatus';


const PitchManagement: React.FC = () => {
  const packageStatus = usePackageStatus();
  const [pitchSearchTerm, setPitchSearchTerm] = useState('');
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [userPackage, setUserPackage] = useState<{
    package_type: 'basic' | 'premium' | 'none';
    package_purchase_date?: string | null;
  }>({
    package_type: 'none',
    package_purchase_date: null
  });
  const [userLoading, setUserLoading] = useState(true);
  const actionButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const navigate = useNavigate();

  // Load fields từ API khi component mount
  useEffect(() => {
    loadFields();
  }, []);
  const loadFields = async () => {
    try {
      setLoading(true);
      setError(null);
      // Sử dụng getOwnerFields để chỉ lấy fields của owner hiện tại
      const fieldsData = await fieldService.getOwnerFields();
      setFields(fieldsData);
    } catch (err) {
      console.error('Error loading fields:', err);
      setError('Không thể tải danh sách sân bóng. Vui lòng thử lại.');
      toast.error('Không thể tải danh sách sân bóng');
    } finally {
      setLoading(false);
    }
  };

  // Lấy thông tin user khi mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setUserLoading(true);
        const user: any = await authService.getMe();
        setUserPackage({
          package_type: user.package_type || 'none',
          package_purchase_date: user.package_purchase_date || null,
        });
      } catch (err) {
        setUserPackage({ package_type: 'none', package_purchase_date: null });
      } finally {
        setUserLoading(false);
      }
    };
    fetchUser();
  }, []);

  // Filter fields based on search term
  const filteredFields = fields.filter(field =>
    field.name.toLowerCase().includes(pitchSearchTerm.toLowerCase()) ||
    field.location?.address_text.toLowerCase().includes(pitchSearchTerm.toLowerCase()) ||
    field.location?.city.toLowerCase().includes(pitchSearchTerm.toLowerCase())
  );
  const toggleActionMenu = (id: string, event: React.MouseEvent<HTMLButtonElement>) => {
    if (showActionMenu === id) {
      setShowActionMenu(null);
      setMenuPosition(null);
    } else {
      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      // Calculate position for the menu
      setMenuPosition({
        top: rect.bottom + scrollTop + 4, // 4px gap below button
        left: rect.right + scrollLeft - 192, // 192px is menu width (w-48), align to right
      });
      setShowActionMenu(id);
    }
  };
  const handleTimeSlotManagement = (fieldId: string, fieldName: string) => {
    console.log('Navigating to timeslots for field:', fieldId, fieldName);
    // Navigate to time slot management with field info
    navigate(`/owner/pitches/${fieldId}/timeslots`, { 
      state: { pitchName: fieldName } 
    });
    setShowActionMenu(null);
    setMenuPosition(null);
  };

  const handleEditField = (fieldId: string) => {
    console.log('Navigating to edit field:', fieldId);
    // Navigate to edit field page
    navigate(`/owner/edit-field/${fieldId}`);
    setShowActionMenu(null);
    setMenuPosition(null);
  };
  const handleViewReviews = (fieldId: string) => {
    navigate(`/owner/pitches/${fieldId}/reviews`);
    setShowActionMenu(null);
  };
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const getFieldStatus = (field: Field) => {
    return field.is_verified ? 'Có sẵn' : 'Chờ duyệt';
  };

  const getStatusBadge = (field: Field) => {
    const isVerified = field.is_verified;
    return isVerified ? (
      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
        Có sẵn
      </span>
    ) : (
      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
        Chờ duyệt
      </span>
    );
  };
  // Close menu when clicking outside or on scroll/resize
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Don't close if clicking on the action button or the menu itself
      if (showActionMenu) {
        const actionButton = actionButtonRefs.current[showActionMenu];
        const menuElement = document.querySelector('.action-menu-portal');
        
        if (actionButton?.contains(target) || menuElement?.contains(target)) {
          return;
        }
        
        setShowActionMenu(null);
        setMenuPosition(null);
      }
    };

    const handleScroll = () => {
      if (showActionMenu) {
        setShowActionMenu(null);
        setMenuPosition(null);
      }
    };

    if (showActionMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [showActionMenu]);

  // Logic kiểm tra quyền thêm sân bóng
  const canAddField = (() => {
    if (userPackage.package_type === 'none') return false;
    if (userPackage.package_type === 'basic' && fields.length >= 2) return false;
    if (userPackage.package_type === 'premium' && fields.length >= 5) return false;
    return true;
  })();

  const handleAddField = () => {
    if (userPackage.package_type === 'none') {
      toast.info('Bạn cần đăng ký gói dịch vụ để thêm sân bóng!');
      navigate('/owner/packages');
      return;
    }
    if (!canAddField) {
      toast.warning(
        userPackage.package_type === 'basic'
          ? 'Gói Basic chỉ cho phép tối đa 2 sân bóng.'
          : 'Gói Premium chỉ cho phép tối đa 5 sân bóng.'
      );
      return;
    }
    navigate('/owner/add-field');
  };

  return (
    <>
      {/* Package Status Alert - chỉ hiển thị cảnh báo, không hiển thị thông tin bình thường */}
      <PackageStatusAlert className="mb-6" showOnlyWarnings={true} />
      
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-800">Danh sách sân bóng</h2>
          {!loading && (
            <p className="text-sm text-gray-600 mt-1">
              Tổng cộng: {fields.length} sân bóng
              {pitchSearchTerm && ` • Hiển thị: ${filteredFields.length} kết quả`}
            </p>
          )}
        </div>
        {userLoading ? (
          <button className="bg-gray-300 text-white px-4 py-2 rounded-md flex items-center !rounded-button whitespace-nowrap cursor-not-allowed" disabled>
            <i className="fas fa-plus mr-2"></i>
            Đang kiểm tra gói dịch vụ...
          </button>
        ) : userPackage.package_type === 'none' ? (
          <button
            onClick={() => navigate('/owner/service-plans')}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md flex items-center !rounded-button whitespace-nowrap"
          >
            <i className="fas fa-gem mr-2"></i>
            Đăng ký gói dịch vụ
          </button>
        ) : (
          <button
            onClick={handleAddField}
            className={`px-4 py-2 rounded-md flex items-center !rounded-button whitespace-nowrap ${canAddField ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            disabled={!canAddField}
          >
            <i className="fas fa-plus mr-2"></i>
            Thêm sân bóng
          </button>
        )}
      </div>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Lỗi
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {error}
              </div>
              <div className="mt-3">
                <button
                  onClick={loadFields}
                  className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
                >
                  Thử lại
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm kiếm sân bóng..."
              className="w-full py-2 pl-10 pr-4 text-sm border rounded-md border-gray-300 focus:outline-none focus:ring-1 focus:ring-green-500"
              value={pitchSearchTerm}
              onChange={(e) => setPitchSearchTerm(e.target.value)}
            />
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
          </div>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <p className="mt-2 text-gray-600">Đang tải danh sách sân bóng...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tên sân
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Địa điểm
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chủ sân
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Giá thuê
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFields.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      <div className="space-y-2">
                        <p>{pitchSearchTerm ? 'Không tìm thấy sân bóng nào phù hợp' : 'Chưa có sân bóng nào'}</p>
                        {!pitchSearchTerm && (
                          <p className="text-sm text-gray-400">
                            Đăng nhập bằng tài khoản owner để xem sân bóng của bạn hoặc tạo sân mới
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredFields.map((field) => (
                    <tr key={field.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-green-600">{field.name}</div>
                        {field.description && (
                          <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                            {field.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">
                          {field.location ? 
                            `${field.location.address_text}, ${field.location.district}, ${field.location.city}` 
                            : 'Chưa có thông tin'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">
                          {field.owner?.name || 'Chưa có thông tin'}
                        </div>
                        {field.owner?.phone && (
                          <div className="text-xs text-gray-500">{field.owner.phone}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">{formatPrice(field.price_per_hour)}/giờ</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(field)}
                      </td>                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          ref={(el) => actionButtonRefs.current[field.id] = el}
                          onClick={(e) => toggleActionMenu(field.id, e)}
                          className="text-gray-500 hover:text-gray-700 cursor-pointer"
                        >
                          <i className="fas fa-ellipsis-h"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>      {/* Portal-based Action Menu */}
      {showActionMenu && menuPosition && createPortal(
        <div 
          className="action-menu-portal fixed w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50"
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
          }}
        >
          <div className="py-1">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                console.log('Edit button clicked for field:', showActionMenu);
                handleEditField(showActionMenu);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center cursor-pointer"
            >
              <i className="fas fa-edit w-5 mr-2"></i>
              <span>Chỉnh sửa</span>
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                const field = fields.find(f => f.id === showActionMenu);
                if (field) {
                  handleTimeSlotManagement(field.id, field.name);
                }
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center cursor-pointer"
            >
              <i className="fas fa-clock w-5 mr-2"></i>
              <span>Quản lý khung giờ</span>
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                const field = fields.find(f => f.id === showActionMenu);
                if (field) {
                  handleViewReviews(field.id);
                }
              }}
              className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-gray-100 flex items-center cursor-pointer"
            >
              <i className="fas fa-star w-5 mr-2"></i>
              <span>Xem đánh giá</span>
            </button>
            {(() => {
              const field = fields.find(f => f.id === showActionMenu);
              return field?.SubFields && field.SubFields.length > 0 && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('SubFields button clicked - not implemented yet');
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center cursor-pointer"
                >
                  <i className="fas fa-th-large w-5 mr-2"></i>
                  <span>Quản lý sân phụ ({field.SubFields.length})</span>
                </button>
              );
            })()}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default PitchManagement;