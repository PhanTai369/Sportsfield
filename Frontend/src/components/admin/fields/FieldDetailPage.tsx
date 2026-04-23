import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, Map, User, FileText, Image as ImageIcon, Info, Lock, AlertCircle } from 'lucide-react';

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
import { useSecureDocuments, SecureDocumentImage } from '@/utils/secureDocuments';
import {
  CustomDialog as Dialog,
  CustomDialogContent as DialogContent,
  CustomDialogDescription as DialogDescription,
  CustomDialogFooter as DialogFooter,
  CustomDialogHeader as DialogHeader,
  CustomDialogTitle as DialogTitle,
} from "@/components/ui/custom-dialog";
import { Button } from "@/components/ui/button";

// Debug function for logging
const debug = (message, data = null) => {
  const timestamp = new Date().toISOString().substring(11, 19);
  if (data) {
    console.log(`[${timestamp}] 🔍 ${message}`, data);
  } else {
    console.log(`[${timestamp}] 🔍 ${message}`);
  }
};

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
    business_license_image?: string;
    identity_card_image?: string;
    identity_card_back_image?: string;
  };
  location: {
    address_text: string;
    city: string;
    district: string;
    ward: string;
    latitude?: number;
    longitude?: number;
  };
  subfields?: Array<{
    id: number;
    name: string;
    field_type: string;
  }>;
}

interface SecureUrls {
  business_license?: string;
  identity_card?: string;
  identity_card_back?: string;
}

const FieldDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [field, setField] = useState<Field | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('info');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // States for confirmation dialogs
  const [approveDialogOpen, setApproveDialogOpen] = useState<boolean>(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  
  // State for showing success message
  const [showSuccessMessage, setShowSuccessMessage] = useState<{show: boolean, message: string, title: string}>({
    show: false, 
    message: '',
    title: ''
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Use the secure documents hook - don't pass owner.id here since we'll use field_id format
  const { 
    secureUrls, 
    loadingSecureUrls, 
    secureUrlsError,
    loadSecureUrls 
  } = useSecureDocuments(null);

  useEffect(() => {
    debug('Initial load, fetching field details for ID:', id);
    
    // Check if the ID is in UUID format for debugging
    if (id) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      debug('ID format check - is UUID:', isUuid);
      if (!isUuid) {
        debug('WARNING: ID is not in UUID format. This may cause API calls to fail:', id);
      }
    }
    
    fetchFieldDetail();
  }, [id]);
  
  // Auto-hide success message after 5 seconds
  useEffect(() => {
    if (showSuccessMessage.show) {
      const timer = setTimeout(() => {
        setShowSuccessMessage({show: false, message: '', title: ''});
        debug('Auto-hiding success message');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [showSuccessMessage.show]);
  
  // Load secure URLs when the documents tab is activated
  useEffect(() => {
    if (activeTab === 'documents' && field?.id) {
      debug('Documents tab activated, loading secure documents');
      
      // Log document images paths from backend
      debug('Field owner document images:', {
        business_license: field.owner?.business_license_image,
        identity_card: field.owner?.identity_card_image,
        identity_card_back: field.owner?.identity_card_back_image
      });
      
      // Determine which documents to load based on what's available
      const documentTypes = [];
      
      if (field.owner?.business_license_image) {
        debug('Business license image available, adding to load list');
        documentTypes.push('business_license');
      }
      
      if (field.owner?.identity_card_image) {
        debug('Identity card image available, adding to load list');
        documentTypes.push('identity_card');
      }
      
      if (field.owner?.identity_card_back_image) {
        debug('Identity card back image available, adding to load list');
        documentTypes.push('identity_card_back');
      }
      
      if (documentTypes.length > 0) {
        // Important: Use field_ID format to access owner documents through field relationship
        // Pass the raw field ID as it comes from the API (could be integer or UUID)
        const fieldIdParam = `field_${field.id}`;
        debug(`Loading secure URLs using field ID format: ${fieldIdParam} for types:`, documentTypes);
        loadSecureUrls(documentTypes, fieldIdParam);
      } else {
        debug('No documents available to load');
      }
    }
  }, [activeTab, field?.id]);

  // Debug effect to monitor secureUrls changes
  useEffect(() => {
    if (Object.keys(secureUrls).length > 0) {
      debug('Secure URLs loaded:', Object.keys(secureUrls).map(key => `${key}: ${secureUrls[key] ? 'URL received' : 'empty'}`));
    }
  }, [secureUrls]);

  const fetchFieldDetail = async () => {
    setLoading(true);
    try {
      if (!id) {
        throw new Error("Field ID is missing");
      }
      
      // Check UUID format
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (!isUuid) {
        debug('Warning: Field ID is not in UUID format:', id);
      }
      
      debug('Fetching field details from API');
      const response = await adminFieldService.getFieldDetail(id);
      
      if (response.success) {
        debug('Field details fetched successfully', {
          fieldId: response.data.id,
          ownerId: response.data.owner?.id,
          hasDocuments: {
            business_license: !!response.data.owner?.business_license_image,
            identity_card: !!response.data.owner?.identity_card_image,
            identity_card_back: !!response.data.owner?.identity_card_back_image
          }
        });
        setField(response.data);
      } else if (response.error?.code === 'INVALID_UUID') {
        toast({
          variant: "destructive",
          title: "Lỗi định dạng",
          description: "ID sân bóng không đúng định dạng UUID yêu cầu",
        });
        setError("ID sân bóng không đúng định dạng. Vui lòng quay lại danh sách sân.");
      } else {
        throw new Error(response.error?.message || 'Lỗi không xác định');
      }
    } catch (err: any) {
      console.error("Error fetching field details:", err);
      
      if (err.response && err.response.status === 401) {
        setError("Lỗi xác thực: Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.");
        toast({
          variant: "destructive",
          title: "Lỗi xác thực",
          description: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        });
      } else {
        setError(err.response?.data?.message || err.message);
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: err.response?.data?.message || err.message,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Opens the approve confirmation dialog
  const openApproveConfirmation = () => {
    setApproveDialogOpen(true);
  };
  
  const handleApproveField = async () => {
    try {
      if (!id) {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: "Không tìm thấy ID sân bóng",
        });
        return;
      }

      // First close the dialog to show the main screen
      setApproveDialogOpen(false);
      
      debug('Approving field with ID:', id);
      // Don't use parseInt as IDs are UUIDs, not numbers
      const response = await adminFieldService.approveField(id);
      
      if (response.success) {
        debug('Field approved successfully, status updated in database');
        
        // Show the success message in our custom component
        setShowSuccessMessage({
          show: true,
          title: "Duyệt thành công",
          message: field ? `Sân bóng "${field.name}" đã được duyệt thành công và email thông báo đã được gửi` : "Sân bóng đã được duyệt thành công và email thông báo đã được gửi"
        });
        
        // Also show toast as backup
        toast({
          title: "Duyệt thành công",
          description: field ? `Sân bóng "${field.name}" đã được duyệt thành công và email thông báo đã được gửi` : "Sân bóng đã được duyệt thành công và email thông báo đã được gửi",
          duration: 5000, // Longer duration
        });
        
        // Navigate back to the fields management page after a short delay
        // to allow the user to see the toast message
        setTimeout(() => {
          debug('Navigating back to fields management page');
          navigate('/admin/fields');
        }, 3000);
      } else {
        if (response.error?.code === 'INVALID_UUID') {
          toast({
            variant: "destructive",
            title: "Lỗi định dạng",
            description: "ID sân bóng không đúng định dạng UUID yêu cầu",
          });
          debug("Field ID format error:", id);
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
      debug('Error while approving field:', err.message || err);
      
      if (err.response && err.response.status === 401) {
        toast({
          variant: "destructive",
          title: "Lỗi xác thực",
          description: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: err.response?.data?.message || err.message,
        });
      }
    } finally {
      // No need to close the dialog here since we're doing it at the beginning,
      // but we still want to ensure navigation happens even if there's an error
      setTimeout(() => {
        debug('Navigating back to fields management page after timeout');
        navigate('/admin/fields');
      }, 3000); // 3 seconds delay
    }
  };

  // Opens the reject confirmation dialog
  const openRejectConfirmation = () => {
    setRejectionReason(''); // Reset reason
    setRejectDialogOpen(true);
  };
  
  const handleRejectField = async () => {
    try {
      if (!id) {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: "Không tìm thấy ID sân bóng",
        });
        return;
      }

      // First close the dialog to show the main screen
      setRejectDialogOpen(false);
      
      debug(`Rejecting field with ID: ${id}, reason: ${rejectionReason}`);
      // Don't use parseInt as IDs are UUIDs, not numbers
      const response = await adminFieldService.rejectField(id, rejectionReason);
      
      if (response.success) {
        debug('Field rejected successfully, status updated in database');
        
        // Show the success message in our custom component
        setShowSuccessMessage({
          show: true,
          title: "Từ chối thành công",
          message: field ? `Sân bóng "${field.name}" đã bị từ chối và email thông báo đã được gửi` : "Sân bóng đã bị từ chối và email thông báo đã được gửi"
        });
        
        // Also show toast as backup
        toast({
          title: "Từ chối thành công",
          description: field ? `Sân bóng "${field.name}" đã bị từ chối và email thông báo đã được gửi` : "Sân bóng đã bị từ chối và email thông báo đã được gửi",
          duration: 5000, // Longer duration
        });
        
        // Navigate back to the fields management page after a short delay
        // to allow the user to see the success message
        setTimeout(() => {
          debug('Navigating back to fields management page');
          navigate('/admin/fields');
        }, 3000);
      } else {
        if (response.error?.code === 'INVALID_UUID') {
          toast({
            variant: "destructive",
            title: "Lỗi định dạng",
            description: "ID sân bóng không đúng định dạng UUID yêu cầu",
          });
          debug("Field ID format error:", id);
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
      debug('Error while rejecting field:', err.message || err);
      
      if (err.response && err.response.status === 401) {
        toast({
          variant: "destructive",
          title: "Lỗi xác thực",
          description: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: err.response?.data?.message || err.message,
        });
      }
    } finally {
      // No need to close the dialog here since we're doing it at the beginning,
      // but we still want to ensure navigation happens even if there's an error
      setRejectionReason('');
      setTimeout(() => {
        debug('Navigating back to fields management page after timeout');
        navigate('/admin/fields');
      }, 3000); // 3 seconds delay
    }
  };

  const openImageViewer = (imageUrl: string) => {
    if (!imageUrl) {
      console.log('Attempted to open image viewer with empty URL');
      return;
    }
    console.log('Opening image viewer');
    setSelectedImage(imageUrl);
  };

  const closeImageViewer = () => {
    setSelectedImage(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error || !field) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error || 'Không tìm thấy thông tin sân bóng'}</span>
        </div>
        <div className="mt-4">
          <button
            onClick={() => navigate('/admin/fields')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
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
      
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/fields')}
            className="p-1 rounded-full hover:bg-gray-200"
            title="Quay lại"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Chi tiết sân bóng: {field.name}</h1>
        </div>
        
        {field.is_verified === false && (
          <div className="flex space-x-4">
            <button
              onClick={openApproveConfirmation}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Check className="w-4 h-4 mr-2" /> Duyệt sân
            </button>
            <button
              onClick={openRejectConfirmation}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <X className="w-4 h-4 mr-2" /> Từ chối
            </button>
          </div>
        )}
        
        {field.is_verified === true && (
          <div className="px-4 py-2 bg-green-100 text-green-800 rounded-md flex items-center">
            <Check className="w-5 h-5 mr-2" /> Sân bóng đã được duyệt
          </div>
        )}
        
        {field.is_verified === null && (
          <div className="px-4 py-2 bg-red-100 text-red-800 rounded-md flex items-center">
            <X className="w-5 h-5 mr-2" /> Sân bóng đã bị từ chối
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('info')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'info'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <Info className="w-5 h-5 mr-2" />
              Thông tin sân
            </div>
          </button>
          <button
            onClick={() => setActiveTab('images')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'images'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <ImageIcon className="w-5 h-5 mr-2" />
              Hình ảnh sân bóng
            </div>
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'documents'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Giấy tờ pháp lý
            </div>
          </button>
          <button
            onClick={() => setActiveTab('location')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'location'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <Map className="w-5 h-5 mr-2" />
              Vị trí
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white shadow-md rounded-lg p-6">
        {/* Info Tab */}
        {activeTab === 'info' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Thông tin cơ bản</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tên sân</p>
                    <p className="mt-1 text-lg text-gray-900">{field.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Giá thuê</p>
                    <p className="mt-1 text-lg text-gray-900">{new Intl.NumberFormat('vi-VN').format(field.price_per_hour)} VNĐ/giờ</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Ngày tạo</p>
                    <p className="mt-1 text-lg text-gray-900">{new Date(field.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Sân con</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {field.subfields && field.subfields.length > 0 ? (
                        field.subfields.map(subfield => (
                          <span key={subfield.id} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                            {subfield.name} ({subfield.field_type})
                          </span>
                        ))
                      ) : (
                        <p className="text-gray-500">Không có sân con</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Thông tin chủ sân</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-lg font-medium">{field.owner.name}</p>
                      <p className="text-gray-500">{field.owner.phone}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Mô tả</h3>
              <p className="text-gray-700 whitespace-pre-line">{field.description}</p>
            </div>
          </div>
        )}

        {/* Images Tab */}
        {activeTab === 'images' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Hình ảnh sân bóng</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {field.images1 && (
                <div className="overflow-hidden rounded-lg shadow">
                  <img 
                    src={field.images1} 
                    alt={`${field.name} - Ảnh 1`} 
                    className="w-full h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                    onClick={() => openImageViewer(field.images1)}
                  />
                </div>
              )}
              {field.images2 && (
                <div className="overflow-hidden rounded-lg shadow">
                  <img 
                    src={field.images2} 
                    alt={`${field.name} - Ảnh 2`} 
                    className="w-full h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                    onClick={() => openImageViewer(field.images2)}
                  />
                </div>
              )}
              {field.images3 && (
                <div className="overflow-hidden rounded-lg shadow">
                  <img 
                    src={field.images3} 
                    alt={`${field.name} - Ảnh 3`} 
                    className="w-full h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                    onClick={() => openImageViewer(field.images3)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Giấy tờ pháp lý</h3>
            {loadingSecureUrls ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500"></div>
                <span className="ml-3 text-gray-600">Đang tải giấy tờ bảo mật...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {field.owner.business_license_image && (
                  <div className="border rounded-lg p-4 bg-white shadow">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-md font-medium">Giấy phép kinh doanh</h4>
                      <div title="Tài liệu bảo mật">
                        <Lock className="w-4 h-4 text-blue-500" />
                      </div>
                    </div>
                    <div className="aspect-[3/4] overflow-hidden rounded-md border">
                      <SecureDocumentImage 
                        url={secureUrls['business_license']}
                        alt="Giấy phép kinh doanh" 
                        onClick={() => openImageViewer(secureUrls['business_license'] || '')}
                      />
                    </div>
                  </div>
                )}
                
                {field.owner.identity_card_image && (
                  <div className="border rounded-lg p-4 bg-white shadow">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-md font-medium">CCCD/CMND (Mặt trước)</h4>
                      <div title="Tài liệu bảo mật">
                        <Lock className="w-4 h-4 text-blue-500" />
                      </div>
                    </div>
                    <div className="aspect-[3/2] overflow-hidden rounded-md border">
                      <SecureDocumentImage 
                        url={secureUrls['identity_card']}
                        alt="CCCD/CMND mặt trước" 
                        onClick={() => openImageViewer(secureUrls['identity_card'] || '')}
                      />
                    </div>
                  </div>
                )}
                
                {field.owner.identity_card_back_image && (
                  <div className="border rounded-lg p-4 bg-white shadow">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-md font-medium">CCCD/CMND (Mặt sau)</h4>
                      <div title="Tài liệu bảo mật">
                        <Lock className="w-4 h-4 text-blue-500" />
                      </div>
                    </div>
                    <div className="aspect-[3/2] overflow-hidden rounded-md border">
                      <SecureDocumentImage 
                        url={secureUrls['identity_card_back']}
                        alt="CCCD/CMND mặt sau" 
                        onClick={() => openImageViewer(secureUrls['identity_card_back'] || '')}
                      />
                    </div>
                  </div>
                )}
                
                {!field.owner.business_license_image && !field.owner.identity_card_image && !field.owner.identity_card_back_image && (
                  <div className="col-span-3 p-6 text-center">
                    <p className="text-gray-500">Không có thông tin giấy tờ pháp lý</p>
                  </div>
                )}
                
                {secureUrlsError && (
                  <div className="col-span-3 bg-red-50 border border-red-200 rounded-md p-4 mt-4">
                    <p className="text-sm text-red-600">
                      Lỗi tải giấy tờ: {secureUrlsError}. Vui lòng thử lại sau.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Location Tab */}
        {activeTab === 'location' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Thông tin địa chỉ</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Địa chỉ đầy đủ</p>
                <p className="mt-1 text-lg text-gray-900">
                  {field.location.address_text}, {field.location.ward}, {field.location.district}, {field.location.city}
                </p>
              </div>

              {field.location.latitude && field.location.longitude && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Tọa độ</p>
                  <p className="mt-1 text-gray-700">
                    Vĩ độ: {parseFloat(String(field.location.latitude)).toFixed(6) || 'N/A'}, 
                    Kinh độ: {parseFloat(String(field.location.longitude)).toFixed(6) || 'N/A'}
                  </p>
                  <div className="mt-4 rounded-lg overflow-hidden border border-gray-200 shadow-md">
                    <iframe
                      src={`https://maps.google.com/maps?q=${field.location.latitude},${field.location.longitude}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                      width="100%"
                      height="400"
                      style={{ border: 0 }}
                      allowFullScreen={true}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="w-full"
                    />
                  </div>
                  <div className="mt-2 flex justify-end">
                    <a 
                      href={`https://www.google.com/maps?q=${field.location.latitude},${field.location.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1 text-sm border border-transparent font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Mở Google Maps
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={closeImageViewer}>
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <img src={selectedImage} alt="Enlarged view" className="w-full h-full object-contain" />
            <button
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70"
              onClick={closeImageViewer}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
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
              Bạn có chắc chắn muốn duyệt sân bóng {field?.name ? <strong>{field.name}</strong> : 'này'} không?
              <div className="mt-2 text-sm text-green-700">
                Sân bóng sẽ được hiển thị công khai và khách hàng có thể đặt sân ngay sau khi được duyệt.
              </div>
            </DialogDescription>
          
            {field && (
              <div className="bg-gray-50 p-3 rounded-md mb-4">
                <div className="flex items-center mb-2">
                  <div className="h-10 w-10 flex-shrink-0">
                    <img className="h-10 w-10 rounded-full object-cover" src={field.images1} alt={field.name} />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{field.name}</div>
                    <div className="text-xs text-gray-500">
                      {field.location.address_text}, {field.location.ward}, {field.location.district}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  <p>Chủ sân: {field.owner.name} ({field.owner.phone})</p>
                  <p className="mt-1">Giá: {new Intl.NumberFormat('vi-VN').format(field.price_per_hour)} VNĐ/giờ</p>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="bg-gray-50 px-4 py-3 flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setApproveDialogOpen(false)}
              className="bg-white"
            >
              Hủy
            </Button>
            <Button 
              variant="default" 
              onClick={handleApproveField}
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
              Bạn có chắc chắn muốn từ chối sân bóng {field?.name ? <strong>{field.name}</strong> : 'này'} không?
              <div className="mt-2 text-sm text-red-700">
                Sân bóng sẽ không được hiển thị và chủ sân phải cập nhật thông tin để gửi yêu cầu duyệt lại.
              </div>
            </DialogDescription>
          
            {field && (
              <div className="bg-gray-50 p-3 rounded-md mb-4">
                <div className="flex items-center mb-2">
                  <div className="h-10 w-10 flex-shrink-0">
                    <img className="h-10 w-10 rounded-full object-cover" src={field.images1} alt={field.name} />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{field.name}</div>
                    <div className="text-xs text-gray-500">
                      {field.location.address_text}, {field.location.ward}, {field.location.district}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  <p>Chủ sân: {field.owner.name} ({field.owner.phone})</p>
                  <p className="mt-1">Giá: {new Intl.NumberFormat('vi-VN').format(field.price_per_hour)} VNĐ/giờ</p>
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
                setRejectionReason('');
              }}
              className="bg-white"
            >
              Hủy
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRejectField}
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

export default FieldDetailPage;
