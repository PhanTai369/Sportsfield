import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Eye, Check, X, ChevronLeft, ChevronRight, MoreHorizontal, Loader2, AlertCircle } from 'lucide-react';

// Add CSS for the fade-in animation
const animationStyle = document.createElement('style');
animationStyle.innerHTML = `
  @keyframes fadeInDown {
    from {
      opacity: 0;
      transform: translate3d(0, -20px, 0);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }
  .animate-fade-in-down {
    animation: fadeInDown 0.5s ease-out forwards;
  }
`;
document.head.appendChild(animationStyle);
import { useToast } from '@/components/ui/use-toast';
import adminFieldService from '@/services/adminField.service';
import { debounce } from 'lodash';
import {
  CustomDialog as Dialog,
  CustomDialogContent as DialogContent,
  CustomDialogDescription as DialogDescription,
  CustomDialogFooter as DialogFooter,
  CustomDialogHeader as DialogHeader,
  CustomDialogTitle as DialogTitle,
} from "@/components/ui/custom-dialog";
import { Button } from "@/components/ui/button";

// Define the Field interface based on your backend structure
interface Field {
  id: string; // Changed from number to string to support UUID format
  name: string;
  description: string;
  price_per_hour: number;
  images1: string;
  images2: string;
  images3: string;
  is_verified: boolean;
  created_at: string;
  owner: {
    id: number;
    name: string;
    phone: string;
  };
  location: {
    address_text: string;
    city: string;
    district: string;
    ward: string;
  };
}

// Define pagination interface
interface Pagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

const FieldsManagementPage: React.FC = () => {
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [showSuccessMessage, setShowSuccessMessage] = useState<{show: boolean, message: string, title: string}>({
    show: false, 
    message: '',
    title: ''
  });
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    total_pages: 0
  });
  
  // State for confirmation modals
  const [approveDialogOpen, setApproveDialogOpen] = useState<boolean>(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState<boolean>(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    console.log(`Effect triggered. Status: ${filterStatus}, Page: ${pagination.page}`);
    fetchFields();
  }, [filterStatus, pagination.page]); // Removed searchQuery dependency to implement client-side search
  
  // Auto-hide success message after 5 seconds
  useEffect(() => {
    if (showSuccessMessage.show) {
      const timer = setTimeout(() => {
        setShowSuccessMessage({show: false, message: '', title: ''});
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [showSuccessMessage.show]);

  const fetchFields = async () => {
    setLoading(true);
    try {
      // Remove search parameter from API call - we'll do search on client-side
      const response = await adminFieldService.getFieldsPaginated(
        pagination.page, 
        pagination.limit,
        filterStatus,
        "" // Empty search term since we'll handle search on client-side
      );
      if (response && response.success) {
        // Log the field IDs to check their format
        console.log("Fields from API:", response.data);
        if (response.data && response.data.length > 0) {
          console.log("Sample field ID:", response.data[0].id);
          console.log("Field ID type:", typeof response.data[0].id);
          console.log("Is UUID format:", /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(response.data[0].id));
        }
        
        setFields(response.data || []);
        
        // Ensure pagination has valid values
        if (response.pagination) {
          setPagination({
            total: response.pagination.total || 0,
            page: response.pagination.page || 1,
            limit: response.pagination.limit || 10,
            total_pages: response.pagination.total_pages || 1
          });
        }
      } else {
        throw new Error(response?.error?.message || 'Lỗi không xác định');
      }
    } catch (err: any) {
      console.error("Error fetching fields:", err);
      
      // Handle specific error types
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (err.response.status === 401) {
          setError("Lỗi xác thực: Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.");
          toast({
            variant: "destructive",
            title: "Lỗi xác thực",
            description: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
          });
          // You could redirect to login page here
          // navigate('/auth');
          return;
        } else {
          setError(`Lỗi máy chủ: ${err.response.status} - ${err.response.data?.message || err.message}`);
        }
      } else if (err.request) {
        // The request was made but no response was received
        setError("Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.");
      } else {
        // Something happened in setting up the request that triggered an Error
        setError(err.message || "Đã xảy ra lỗi không xác định");
      }
      
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (fieldId: string) => {
    if (!fieldId) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không tìm thấy ID sân bóng",
      });
      return;
    }
    navigate(`/admin/fields/${fieldId}`);
  };

  // Opens the approve confirmation dialog
  const openApproveConfirmation = (field: Field) => {
    setSelectedField(field);
    setSelectedFieldId(field.id);
    setApproveDialogOpen(true);
  };
  
  const handleApproveField = async (fieldId: string) => {
    try {
      if (!fieldId) {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: "Không tìm thấy ID sân bóng",
        });
        return;
      }
      
      console.log(`Approving field with ID: ${fieldId}`);
      
      // First close the dialog to show the main screen
      setApproveDialogOpen(false);
      
      const response = await adminFieldService.approveField(fieldId);
      if (response.success) {
        console.log("Field approved successfully, showing success message");
        
        // Set the success message state which will show the toast in the UI
        setShowSuccessMessage({
          show: true,
          title: "Thành công",
          message: "Sân bóng đã được duyệt thành công và email thông báo đã được gửi"
        });
        
        // Use toast as a backup method
        toast({
          title: "Thành công",
          description: "Sân bóng đã được duyệt thành công và email thông báo đã được gửi",
          duration: 5000, // Longer duration
        });
        
        // Refresh after a delay to ensure message is seen
        setTimeout(() => {
          console.log("Now refreshing the fields list after message displayed");
          fetchFields();
        }, 2000);
      } else {
        if (response.error?.code === 'INVALID_UUID') {
          toast({
            variant: "destructive",
            title: "Lỗi định dạng",
            description: "ID sân bóng không đúng định dạng UUID yêu cầu",
          });
          console.error("Field ID format error:", fieldId);
        } else {
          toast({
            variant: "destructive",
            title: "Lỗi",
            description: response.error?.message || 'Lỗi không xác định',
          });
        }
      }
    } catch (err: any) {
      console.error("Error approving field:", err);
      
      if (err.response && err.response.status === 401) {
        toast({
          variant: "destructive",
          title: "Lỗi xác thực",
          description: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        });
        // Could redirect to login
        // navigate('/auth');
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: err.response?.data?.message || err.message,
        });
      }
    } finally {
      // Only clear the selection, dialog is already closed at the beginning
      setSelectedFieldId(null);
      setSelectedField(null);
    }
  };

  // Opens the reject confirmation dialog
  const openRejectConfirmation = (field: Field) => {
    setSelectedField(field);
    setSelectedFieldId(field.id);
    setRejectionReason(''); // Reset reason
    setRejectDialogOpen(true);
  };
  
  const handleRejectField = async (fieldId: string) => {
    try {
      if (!fieldId) {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: "Không tìm thấy ID sân bóng",
        });
        return;
      }
      
      console.log(`Rejecting field with ID: ${fieldId}, reason: ${rejectionReason}`);
      
      // First close the dialog to show the main screen
      setRejectDialogOpen(false);
      
      const response = await adminFieldService.rejectField(fieldId, rejectionReason);
      if (response.success) {
        console.log("Field rejected successfully, showing success message");
        
        // Set the success message state which will show the toast in the UI
        setShowSuccessMessage({
          show: true,
          title: "Thành công",
          message: "Sân bóng đã bị từ chối và email thông báo đã được gửi"
        });
        
        // Use toast as a backup method
        toast({
          title: "Thành công",
          description: "Sân bóng đã bị từ chối và email thông báo đã được gửi",
          duration: 5000, // Longer duration
        });
        
        // Refresh after a delay to ensure message is seen
        setTimeout(() => {
          console.log("Now refreshing the fields list after rejection message displayed");
          fetchFields();
        }, 2000);
      } else {
        if (response.error?.code === 'INVALID_UUID') {
          toast({
            variant: "destructive",
            title: "Lỗi định dạng",
            description: "ID sân bóng không đúng định dạng UUID yêu cầu",
          });
          console.error("Field ID format error:", fieldId);
        } else {
          toast({
            variant: "destructive",
            title: "Lỗi",
            description: response.error?.message || 'Lỗi không xác định',
          });
        }
      }
    } catch (err: any) {
      console.error("Error rejecting field:", err);
      
      if (err.response && err.response.status === 401) {
        toast({
          variant: "destructive",
          title: "Lỗi xác thực",
          description: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        });
        // Could redirect to login
        // navigate('/auth');
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: err.response?.data?.message || err.message,
        });
      }
    } finally {
      // Only clear the selection, dialog is already closed at the beginning
      setSelectedFieldId(null);
      setSelectedField(null);
      setRejectionReason('');
    }
  };

  // Function to handle page changes
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.total_pages) {
      return; // Don't allow invalid page numbers
    }
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // When filter status changes, reset to page 1 and refetch
  const handleFilterStatusChange = (status: string) => {
    console.log(`Setting filter status to: ${status}`);
    setFilterStatus(status || 'pending'); // Ensure status is never empty
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Tách biệt giá trị hiển thị (inputValue) và giá trị tìm kiếm thực tế (searchQuery)
  const [inputValue, setInputValue] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Using client-side search with debounce to avoid performance issues
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearchQuery(value); // Chỉ cập nhật searchQuery sau khi debounce
      setIsSearching(false); // Kết thúc trạng thái đang tìm kiếm
    }, 250), // Giảm debounce time xuống để cải thiện UX
    []
  );
  
  // Handle search changes - update input value immediately for UX
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setInputValue(value); // Cập nhật giá trị hiển thị ngay lập tức
    setIsSearching(true); // Bắt đầu trạng thái đang tìm kiếm
    debouncedSearch(value); // Debounce giá trị tìm kiếm
  };
  
  // Hàm focus vào ô tìm kiếm
  const focusSearchInput = () => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };
  
  // Filter fields based on search query - optimized client-side search
  const filteredFields = useMemo(() => {
    if (!searchQuery.trim()) {
      return fields; // Return all fields if search query is empty
    }
    
    // Tối ưu việc tìm kiếm bằng cách chia nhỏ từ khóa
    const queryTerms = searchQuery.toLowerCase().split(/\s+/).filter(term => term.length > 0);
    
    if (queryTerms.length === 0) return fields;
    
    return fields.filter(field => {
      // Các giá trị cần tìm kiếm
      const searchableValues = [
        field.name,
        field.owner.name,
        field.owner.phone,
        field.location.address_text,
        field.location.district,
        field.location.ward
      ].map(val => (val || '').toLowerCase());
      
      // Tìm kiếm mỗi từ khóa trong tất cả các trường
      return queryTerms.every(term => 
        searchableValues.some(value => value.includes(term))
      );
    });
  }, [fields, searchQuery]);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý Sân bóng</h1>
        <div className="flex items-center space-x-4">
          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => handleFilterStatusChange(e.target.value)}
              className="bg-white border border-gray-300 text-gray-700 py-2 px-3 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="pending">Chờ duyệt</option>
              <option value="verified">Đã duyệt</option>
              <option value="rejected">Đã từ chối</option>
              <option value="all">Tất cả</option>
            </select>
          </div>
          
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {isSearching ? (
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
              ) : (
                <Search className="h-5 w-5 text-gray-400" />
              )}
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Tìm kiếm sân bóng, chủ sân..."
              value={inputValue} // Sử dụng inputValue để phản hồi ngay lập tức
              onChange={handleSearchChange}
              className={`bg-white border ${isSearching ? 'border-blue-300' : 'border-gray-300'} 
                text-gray-900 pl-10 py-2 px-4 rounded-md shadow-sm 
                focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 w-[320px]`}
            />
            {inputValue && (
              <button 
                onClick={() => {
                  setInputValue('');
                  setSearchQuery('');
                  focusSearchInput();
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Success Message Alert */}
      {showSuccessMessage.show && (
        <div className="fixed top-4 right-4 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-md max-w-md animate-fade-in-down">
          <div className="flex items-center">
            <div className="py-1">
              <svg className="fill-current h-6 w-6 text-green-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM6.7 9.29L9 11.6l4.3-4.3 1.4 1.42L9 14.4l-3.7-3.7 1.4-1.42z"/>
              </svg>
            </div>
            <div>
              <p className="font-bold">{showSuccessMessage.title}</p>
              <p className="text-sm">{showSuccessMessage.message}</p>
            </div>
            <div className="ml-auto pl-3">
              <button 
                onClick={() => setShowSuccessMessage({show: false, message: '', title: ''})}
                className="inline-flex text-gray-400 focus:outline-none focus:text-gray-600 hover:text-gray-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      ) : (
        <>
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    STT
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tên sân
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chủ sân
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Địa chỉ
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Giá (VNĐ/giờ)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ngày tạo
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFields.length > 0 ? (
                  filteredFields.map((field, index) => (
                    <tr key={field.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <img className="h-10 w-10 rounded-full object-cover" src={field.images1} alt={field.name} />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{field.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{field.owner.name}</div>
                        <div className="text-sm text-gray-500">{field.owner.phone}</div>
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs overflow-hidden text-ellipsis truncate"
                        style={{ maxWidth: 220 }}
                        title={`${field.location.address_text}, ${field.location.ward}, ${field.location.district}`}
                      >
                        {field.location.address_text}, {field.location.ward}, {field.location.district}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Intl.NumberFormat('vi-VN').format(field.price_per_hour)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(field.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {field.is_verified === true ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Đã duyệt
                          </span>
                        ) : field.is_verified === false ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Chờ duyệt
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Đã từ chối
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleViewDetails(field.id)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          
                          {field.is_verified === false && ( // Only show approve/reject for pending fields
                            <>
                              <button
                                onClick={() => openApproveConfirmation(field)}
                                className="text-green-600 hover:text-green-900 p-1"
                                title="Duyệt sân"
                              >
                                <Check className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => openRejectConfirmation(field)}
                                className="text-red-600 hover:text-red-900 p-1"
                                title="Từ chối"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      {searchQuery ? `Không tìm thấy sân bóng nào phù hợp với từ khóa "${searchQuery}"` : "Không tìm thấy sân bóng nào"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Search indicator */}
          {searchQuery && (
            <div className="mt-4 bg-blue-50 p-3 rounded-md text-blue-800">
              <p className="flex items-center text-sm">
                {isSearching ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                {isSearching ? (
                  <>Đang tìm kiếm...</>
                ) : (
                  <>
                    {filteredFields.length > 0 ? (
                      <>Tìm thấy <span className="font-medium">{filteredFields.length}</span> kết quả cho từ khóa: </>
                    ) : (
                      <>Không tìm thấy kết quả nào cho từ khóa: </>
                    )}
                    <span className="font-medium ml-1">"{searchQuery}"</span>
                  </>
                )}
                <button 
                  onClick={() => {
                    setInputValue(''); // Xóa giá trị hiển thị
                    setSearchQuery(''); // Xóa giá trị tìm kiếm
                    focusSearchInput(); // Focus lại vào ô tìm kiếm
                  }} 
                  className="ml-3 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded"
                >
                  Xóa tìm kiếm
                </button>
              </p>
            </div>
          )}
          
          {/* Pagination Controls - Hide when searching */}
          {pagination && pagination.total > 0 && !searchQuery && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => setPagination({...pagination, page: Math.max(1, pagination.page - 1)})}
                  disabled={pagination.page === 1}
                  className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${
                    pagination.page === 1 
                      ? 'text-gray-300 cursor-not-allowed' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Trang trước
                </button>
                <button
                  onClick={() => setPagination({...pagination, page: Math.min(pagination.total_pages, pagination.page + 1)})}
                  disabled={pagination.page === pagination.total_pages}
                  className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${
                    pagination.page === pagination.total_pages 
                      ? 'text-gray-300 cursor-not-allowed' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Trang sau
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    {filteredFields.length > 0 ? (
                      <>
                        {searchQuery ? (
                          <>
                            Tìm thấy <span className="font-medium">{filteredFields.length}</span> kết quả{' '}
                            <span className="font-medium text-blue-600">"{searchQuery}"</span>{' '}
                          </>
                        ) : (
                          <>
                            Hiển thị <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> đến{' '}
                            <span className="font-medium">
                              {(pagination.page - 1) * pagination.limit + fields.length}
                            </span>{' '}
                          </>
                        )}
                        
                        {filterStatus !== 'all' && !searchQuery ? (
                          <span className="font-medium text-green-600">
                            {' '}{filterStatus === 'pending' ? '(đang chờ duyệt)' : 
                                filterStatus === 'verified' ? '(đã duyệt)' : 
                                filterStatus === 'rejected' ? '(đã từ chối)' : ''}
                          </span>
                        ) : ''}
                      </>
                    ) : (
                      <>
                        {searchQuery ? (
                          <>Không tìm thấy kết quả nào cho từ khóa <span className="font-medium text-blue-600">"{searchQuery}"</span></>
                        ) : (
                          <>Không có sân bóng nào {filterStatus !== 'all' ? (
                            <span className="font-medium">
                              {filterStatus === 'pending' ? 'đang chờ duyệt' : 
                               filterStatus === 'verified' ? 'đã duyệt' : 
                               filterStatus === 'rejected' ? 'đã từ chối' : ''}
                            </span>
                          ) : ''}</>
                        )}
                      </>
                    )}
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={() => setPagination({...pagination, page: 1})}
                      disabled={pagination.page === 1}
                      className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 
                        ${pagination.page === 1 ? 'cursor-not-allowed' : 'hover:bg-gray-50 focus:z-20 focus:outline-offset-0'}`}
                    >
                      <span className="sr-only">Trang đầu</span>
                      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                      <ChevronLeft className="h-5 w-5 -ml-3" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setPagination({...pagination, page: Math.max(1, pagination.page - 1)})}
                      disabled={pagination.page === 1}
                      className={`relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 
                        ${pagination.page === 1 ? 'cursor-not-allowed' : 'hover:bg-gray-50 focus:z-20 focus:outline-offset-0'}`}
                    >
                      <span className="sr-only">Trang trước</span>
                      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </button>
                    
                    {/* Current page indicator */}
                    <div className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                      <span>Trang {pagination.page} / {pagination.total_pages}</span>
                    </div>
                    
                    <button
                      onClick={() => setPagination({...pagination, page: Math.min(pagination.total_pages, pagination.page + 1)})}
                      disabled={pagination.page === pagination.total_pages}
                      className={`relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 
                        ${pagination.page === pagination.total_pages ? 'cursor-not-allowed' : 'hover:bg-gray-50 focus:z-20 focus:outline-offset-0'}`}
                    >
                      <span className="sr-only">Trang sau</span>
                      <ChevronRight className="h-5 w-5" aria-hidden="true" />
                    </button>
                    
                    <button
                      onClick={() => setPagination({...pagination, page: pagination.total_pages})}
                      disabled={pagination.page === pagination.total_pages}
                      className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 
                        ${pagination.page === pagination.total_pages ? 'cursor-not-allowed' : 'hover:bg-gray-50 focus:z-20 focus:outline-offset-0'}`}
                    >
                      <span className="sr-only">Trang cuối</span>
                      <ChevronRight className="h-5 w-5" aria-hidden="true" />
                      <ChevronRight className="h-5 w-5 -ml-3" aria-hidden="true" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Approve Confirmation Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-white">
          <div className="p-4 bg-white border-b">
            <DialogHeader>
              <DialogTitle className="flex items-center text-base">
                <Check className="h-5 w-5 text-green-500 mr-2" />
                Xác nhận duyệt sân bóng
              </DialogTitle>
            </DialogHeader>
          </div>
          
          <div className="p-5">
            <DialogDescription className="text-gray-700 mb-3">
              Bạn có chắc chắn muốn duyệt sân bóng {selectedField?.name ? <strong>{selectedField.name}</strong> : 'này'} không?
            </DialogDescription>
          
            {selectedField && (
              <div className="bg-gray-50 p-3 rounded-md mb-4">
                <div className="flex items-center mb-2">
                  <div className="h-10 w-10 flex-shrink-0">
                    <img className="h-10 w-10 rounded-full object-cover" src={selectedField.images1} alt={selectedField.name} />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{selectedField.name}</div>
                    <div className="text-xs text-gray-500">
                      {selectedField.location.address_text}, {selectedField.location.ward}, {selectedField.location.district}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  <p>Chủ sân: {selectedField.owner.name} ({selectedField.owner.phone})</p>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="bg-gray-50 px-4 py-3 flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setApproveDialogOpen(false);
                setSelectedFieldId(null);
                setSelectedField(null);
              }}
              className="bg-white"
            >
              Hủy
            </Button>
            <Button 
              variant="default" 
              onClick={() => selectedFieldId && handleApproveField(selectedFieldId)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Xác nhận duyệt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Reject Confirmation Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white">
          <div className="p-4 bg-white border-b">
            <DialogHeader>
              <DialogTitle className="flex items-center text-base">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                Xác nhận từ chối sân bóng
              </DialogTitle>
            </DialogHeader>
          </div>
          
          <div className="p-5">
            <DialogDescription className="text-gray-700 mb-3">
              Bạn có chắc chắn muốn từ chối sân bóng {selectedField?.name ? <strong>{selectedField.name}</strong> : 'này'} không?
            </DialogDescription>
          
            {selectedField && (
              <div className="bg-gray-50 p-3 rounded-md mb-4">
                <div className="flex items-center mb-2">
                  <div className="h-10 w-10 flex-shrink-0">
                    <img className="h-10 w-10 rounded-full object-cover" src={selectedField.images1} alt={selectedField.name} />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{selectedField.name}</div>
                    <div className="text-xs text-gray-500">
                      {selectedField.location.address_text}, {selectedField.location.ward}, {selectedField.location.district}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  <p>Chủ sân: {selectedField.owner.name} ({selectedField.owner.phone})</p>
                </div>
              </div>
            )}

            {/* Rejection Reason Input */}
            <div className="space-y-2">
              <label htmlFor="rejection-reason" className="text-sm font-medium text-gray-700">
                Lý do từ chối <span className="text-red-500">*</span>
              </label>
              <textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Vui lòng nhập lý do từ chối sân bóng này..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 resize-none"
                rows={4}
                required
              />
              <p className="text-xs text-gray-500">
                Lý do từ chối sẽ được gửi qua email cho chủ sân để họ có thể chỉnh sửa.
              </p>
            </div>
          </div>
          
          <DialogFooter className="bg-gray-50 px-4 py-3 flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setRejectDialogOpen(false);
                setSelectedFieldId(null);
                setSelectedField(null);
                setRejectionReason('');
              }}
              className="bg-white"
            >
              Hủy
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedFieldId && handleRejectField(selectedFieldId)}
              disabled={!rejectionReason.trim()}
            >
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FieldsManagementPage;
