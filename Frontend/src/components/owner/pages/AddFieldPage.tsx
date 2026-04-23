import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Upload, ArrowLeft, MapPin, DollarSign, FileText, Users, Image } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Label } from '../../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { API_BASE_URL } from '../../../config/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import fieldService, { UserLicense } from '../../../services/fieldService';
import { toast } from 'sonner';

interface FieldFormData {
  name: string;
  city: string;
  district: string;
  ward: string;
  address: string;
  fieldType: string; // '5vs5', '7vs7'
  subFieldCount: string; // Số lượng sân con
  price: string;
  description: string;
  images: File[];
  businessLicense: File | null;
  identityCard: File | null;
  identityCardBack: File | null; // Thêm mặt sau CCCD
  latitude?: number; // Thêm vĩ độ
  longitude?: number; // Thêm kinh độ
}

// Default coordinates for Da Nang city center (fallback)
const DA_NANG_DEFAULT_COORDINATES = {
  latitude: 16.0471, 
  longitude: 108.2068
};

// Map of district coordinates for fallback at district level
const DISTRICT_COORDINATES = {
  'haichau': { latitude: 16.0544, longitude: 108.2022 }, // Hải Châu
  'thanhkhe': { latitude: 16.0657, longitude: 108.1890 }, // Thanh Khê
  'sontra': { latitude: 16.1068, longitude: 108.2339 }, // Sơn Trà
  'nguhanhson': { latitude: 16.0204, longitude: 108.2474 }, // Ngũ Hành Sơn
  'lienchieuq': { latitude: 16.0737, longitude: 108.1406 }, // Liên Chiểu
  'camle': { latitude: 16.0213, longitude: 108.1890 }, // Cẩm Lệ
  'hoavang': { latitude: 16.0771, longitude: 108.2730 }, // Hòa Vang
  'hoangsa': { latitude: 16.5000, longitude: 112.0000 } // Hoàng Sa (estimated)
};

// Mapping phường/xã theo quận/huyện
const WARDS_BY_DISTRICT: { [key: string]: string[] } = {
  'Hải Châu': [
    'Thuận Thành', 'Thuận Phước', 'Thạch Thang', 'Hải Châu 1', 'Hải Châu 2', 
    'Phước Ninh', 'Bình Thuận', 'Hòa Thuận Đông', 'Hòa Thuận Tây', 'Nam Dương', 'Bình Hiên'
  ],
  'Thanh Khê': [
    'Thanh Khê Tây', 'Thanh Khê Đông', 'Xuân Hà', 'Tân Chính', 'Chính Gián', 
    'Vĩnh Trung', 'Thạc Gián', 'An Khê', 'Hòa Khê'
  ],
  'Sơn Trà': [
    'An Hải Bắc', 'An Hải Tây', 'An Hải Đông', 'Mân Thái', 'Thọ Quang', 
    'Nại Hiên Đông', 'Phước Mỹ'
  ],
  'Ngũ Hành Sơn': [
    'Mỹ An', 'Khuê Mỹ', 'Hòa Hải', 'Hòa Quý'
  ],
  'Liên Chiểu': [
    'Hòa Khánh Bắc', 'Hòa Khánh Nam', 'Hòa Minh', 'Thanh Khê', 'Hòa Hiệp Bắc', 'Hòa Hiệp Nam'
  ],
  'Cẩm Lệ': [
    'Khuê Trung', 'Hòa Thọ Đông', 'Hòa Thọ Tây', 'Hòa An', 'Hòa Phát', 'Hòa Xuân'
  ],
  'Hòa Vang': [
    'Hòa Bắc', 'Hòa Liên', 'Hòa Ninh', 'Hòa Sơn', 'Hòa Nhơn', 
    'Hòa Phong', 'Hòa Châu', 'Hòa Tiến', 'Hòa Phú', 'Hòa Khương', 'Hòa Phước'
  ],
  'Hoàng Sa': [
    'Hoàng Sa'
  ]
};

const AddFieldPage: React.FC = () => {
  const navigate = useNavigate();  // Helper function để kiểm tra validation tổng thể
  const validateAllFields = () => {
    const errors = [];
    
    // Kiểm tra thông tin cơ bản
    if (!formData.name) errors.push('Tên sân');
    if (!formData.district) errors.push('Quận/huyện');
    if (!formData.ward) errors.push('Phường/xã');
    if (!formData.address) errors.push('Địa chỉ');
    if (!formData.price) errors.push('Giá thuê');
    if (!formData.description) errors.push('Mô tả');
    
    // Kiểm tra hình ảnh sân bóng
    if (formData.images.length !== 3) {
      errors.push('Hình ảnh sân bóng (cần đúng 3 ảnh)');
    }    // Kiểm tra giấy tờ tùy thân (bắt buộc)
    const hasIdentityCardFront = formData.identityCard || (licenseData?.has_identity_card_front && licenseData?.identity_card_image);
    const hasIdentityCardBack = formData.identityCardBack || (licenseData?.has_identity_card_back && licenseData?.identity_card_back_image);
    const hasBusinessLicense = formData.businessLicense || (licenseData?.has_business_license && licenseData?.business_license_image);
    
    if (!hasIdentityCardFront) {
      errors.push('Ảnh mặt trước CCCD/CMND');
    }
    if (!hasIdentityCardBack) {
      errors.push('Ảnh mặt sau CCCD/CMND');
    }
      // Kiểm tra giấy phép kinh doanh (bắt buộc)
    if (!hasBusinessLicense) {
      errors.push('Giấy phép kinh doanh');
    }
    
    return errors;
  };

  // Helper function để hiển thị tên quận/phường
  const getDisplayDistrictName = (value: string) => {
    const districtMap: { [key: string]: string } = {
      'Hải Châu': 'Quận Hải Châu',
      'Thanh Khê': 'Quận Thanh Khê',
      'Sơn Trà': 'Quận Sơn Trà',
      'Ngũ Hành Sơn': 'Quận Ngũ Hành Sơn',
      'Liên Chiểu': 'Quận Liên Chiểu',
      'Cẩm Lệ': 'Quận Cẩm Lệ',
      'Hòa Vang': 'Huyện Hòa Vang',
      'Hoàng Sa': 'Huyện Hoàng Sa'
    };
    return districtMap[value] || value;
  };

  const getDisplayWardName = (value: string) => {
    const wardMap: { [key: string]: string } = {
      'Thuận Thành': 'Phường Thuận Thành',
      'Thuận Phước': 'Phường Thuận Phước',
      'Thạch Thang': 'Phường Thạch Thang',
      'Hải Châu 1': 'Phường Hải Châu 1',
      'Hải Châu 2': 'Phường Hải Châu 2',
      'Phước Ninh': 'Phường Phước Ninh',
      'An Hải Bắc': 'Phường An Hải Bắc',
      'Mân Thái': 'Phường Mân Thái',
      'Hòa Khánh Bắc': 'Phường Hòa Khánh Bắc',
      'Hòa Khánh Nam': 'Phường Hòa Khánh Nam',
      'Thạnh An': 'Phường Thạnh An',
      'Xuân Phú': 'Phường Xuân Phú',
      'Khuê Trung': 'Phường Khuê Trung',
      'Thanh Khê Tây': 'Phường Thanh Khê Tây',
      'Thanh Khê Đông': 'Phường Thanh Khê Đông'
    };
    return wardMap[value] || value;
  };  const [formData, setFormData] = useState<FieldFormData>({
    name: '',
    city: 'Đà Nẵng', // Giá trị mặc định
    district: '',
    ward: '',
    address: '',
    fieldType: '5vs5', // Giá trị mặc định
    subFieldCount: '1', // Giá trị mặc định
    price: '',
    description: '',
    images: [],
    businessLicense: null,
    identityCard: null,
    identityCardBack: null,
    latitude: undefined,
    longitude: undefined
  });
  const [dragActive, setDragActive] = useState({
    images: false,
    businessLicense: false,
    identityCard: false,
    identityCardBack: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [licenseData, setLicenseData] = useState<UserLicense | null>(null);
  const [isLoadingLicense, setIsLoadingLicense] = useState(true);
  const [isGeocodingLoading, setIsGeocodingLoading] = useState(false);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);  // Fetch existing license data on component mount
  useEffect(() => {
    const fetchLicenseData = async () => {
      try {
        setIsLoadingLicense(true);
        const response = await fieldService.getUserLicense();
        setLicenseData(response.license);
        
        // Pre-fill form data if license exists
        if (response.license.has_complete_license) {
          setFormData(prev => ({
            ...prev,
            // Don't override with existing files since they're URLs, not File objects
            // These will be handled in the display logic
          }));
        }
      } catch (error) {
        console.error('Error fetching license:', error);
        // If no license exists, licenseData remains null
      } finally {
        setIsLoadingLicense(false);
      }
    };

    fetchLicenseData();
  }, []);
  const handleInputChange = (field: keyof FieldFormData, value: string) => {
    if (field === 'district') {
      // Khi chọn quận/huyện mới, reset giá trị phường/xã
      setFormData(prev => ({
        ...prev,
        [field]: value,
        ward: '' // Reset phường/xã khi thay đổi quận/huyện
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };
  const handleDrag = (e: React.DragEvent, type: 'images' | 'businessLicense' | 'identityCard' | 'identityCardBack') => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(prev => ({ ...prev, [type]: true }));
    } else if (e.type === "dragleave") {
      setDragActive(prev => ({ ...prev, [type]: false }));
    }
  };
  const handleDrop = (e: React.DragEvent, type: 'images' | 'businessLicense' | 'identityCard' | 'identityCardBack') => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [type]: false }));

    const files = Array.from(e.dataTransfer.files);
    if (files && files.length > 0) {
      if (type === 'images') {
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        const currentImagesCount = formData.images.length;
        const availableSlots = 3 - currentImagesCount;
        
        if (availableSlots <= 0) {
          alert('Bạn chỉ có thể upload tối đa 3 ảnh sân bóng!');
          return;
        }
        
        const filesToAdd = imageFiles.slice(0, availableSlots);
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...filesToAdd]
        }));
        
        if (imageFiles.length > availableSlots) {
          alert(`Chỉ có thể thêm ${availableSlots} ảnh nữa. ${imageFiles.length - availableSlots} ảnh đã bị bỏ qua.`);
        }
      } else {
        setFormData(prev => ({
          ...prev,
          [type]: files[0]
        }));
      }
    }
  };
  const handleFileSelect = (files: FileList | null, type: 'images' | 'businessLicense' | 'identityCard' | 'identityCardBack') => {
    if (!files) return;

    const fileArray = Array.from(files);
    if (type === 'images') {
      const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
      const currentImagesCount = formData.images.length;
      const availableSlots = 3 - currentImagesCount;
      
      if (availableSlots <= 0) {
        alert('Bạn chỉ có thể upload tối đa 3 ảnh sân bóng!');
        return;
      }
      
      const filesToAdd = imageFiles.slice(0, availableSlots);
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...filesToAdd]
      }));
      
      if (imageFiles.length > availableSlots) {
        alert(`Chỉ có thể thêm ${availableSlots} ảnh nữa. ${imageFiles.length - availableSlots} ảnh đã bị bỏ qua.`);
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [type]: fileArray[0]
      }));
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };  const handleSubmit = async () => {
    try {
      // Validation: Check if all required fields are filled
      if (!formData.name || !formData.district || !formData.ward || !formData.address || !formData.fieldType || 
          !formData.subFieldCount || !formData.price || !formData.description) {
        toast.error('Vui lòng điền đầy đủ thông tin cơ bản!');
        return;
      }
      
      // Validation: Check if exactly 3 images are uploaded
      if (formData.images.length !== 3) {
        toast.error('Bạn phải upload đúng 3 ảnh sân bóng!');
        return;
      }
      
      // Validation: Check if business license is uploaded or exists
      if (!formData.businessLicense && !(licenseData?.has_business_license && licenseData?.business_license_image)) {
        toast.error('Bạn phải upload ảnh giấy phép kinh doanh!');
        return;
      }
      
      // Validation: Check if identity card images are uploaded or exist
      if (!formData.identityCard && !(licenseData?.has_identity_card_front && licenseData?.identity_card_image)) {
        toast.error('Bạn phải upload ảnh mặt trước CCCD/CMND!');
        return;
      }

      if (!formData.identityCardBack && !(licenseData?.has_identity_card_back && licenseData?.identity_card_back_image)) {
        toast.error('Bạn phải upload ảnh mặt sau CCCD/CMND!');
        return;
      }

      setIsSubmitting(true);
      
      // Show loading toast
      const loadingToast = toast.loading('Đang tạo sân bóng...', {
        description: 'Đang xử lý dữ liệu địa lý và upload ảnh'
      });

      // Xây dựng địa chỉ đầy đủ cho geocoding
      const fullAddress = `${formData.address}, ${getDisplayWardName(formData.ward)}, ${getDisplayDistrictName(formData.district)}, ${formData.city}`;
      console.log("Full address for geocoding:", fullAddress);
      
      // Geocode địa chỉ để lấy tọa độ
      const coordinates = await geocodeAddress(fullAddress);
      console.log("Final coordinates:", coordinates);
      
      const formDataToSend = new FormData();
      
      // Add basic field data
      formDataToSend.append('name', formData.name);
      formDataToSend.append('location', formData.district); // Backend expects 'location' as district
      formDataToSend.append('address', formData.address);
      formDataToSend.append('field_type', formData.fieldType);
      formDataToSend.append('sub_field_count', formData.subFieldCount);
      formDataToSend.append('price_per_hour', formData.price);
      formDataToSend.append('description', formData.description);
      
      // Add location details for backend processing
      formDataToSend.append('city', formData.city);
      formDataToSend.append('district', formData.district);
      formDataToSend.append('ward', formData.ward);
      
      // Add geocoded coordinates
      formDataToSend.append('latitude', coordinates.latitude.toString());
      formDataToSend.append('longitude', coordinates.longitude.toString());

      // Add images (exactly 3)
      formData.images.forEach((image, index) => {
        formDataToSend.append(`image${index + 1}`, image);
      });
      
      // Add business documents (bắt buộc nếu chưa có trong database)
      // Nếu user chưa có giấy phép trong DB thì PHẢI upload mới
      if (formData.businessLicense) {
        formDataToSend.append('business_license_image', formData.businessLicense);
      } else if (!(licenseData?.has_business_license && licenseData?.business_license_image)) {
        toast.error('Vui lòng upload ảnh giấy phép kinh doanh!');
        return;
      }
      
      if (formData.identityCard) {
        formDataToSend.append('identity_card_image', formData.identityCard);
      } else if (!(licenseData?.has_identity_card_front && licenseData?.identity_card_image)) {
        toast.error('Vui lòng upload ảnh mặt trước CCCD/CMND!');
        return;
      }
      
      if (formData.identityCardBack) {
        formDataToSend.append('identity_card_back_image', formData.identityCardBack);
      } else if (!(licenseData?.has_identity_card_back && licenseData?.identity_card_back_image)) {
        toast.error('Vui lòng upload ảnh mặt sau CCCD/CMND!');
        return;
      }

      // Call fieldService to submit with S3 upload
      await fieldService.addFieldWithFiles(formDataToSend);
      
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      // Show success toast
      toast.success('Sân bóng đã được tạo thành công!', {
        description: 'Sân bóng đang chờ xét duyệt từ quản trị viên'
      });
      
      // Reset form
      setFormData({
        name: '',
        city: 'Đà Nẵng',
        district: '',
        ward: '',
        address: '',
        fieldType: '5vs5',
        subFieldCount: '1',
        price: '',
        description: '',
        images: [],
        businessLicense: null,
        identityCard: null,
        identityCardBack: null,
        latitude: undefined,
        longitude: undefined
      });
      
      // Navigate back to pitches list
      navigate('/owner/pitches');
      
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Có lỗi xảy ra khi tạo sân bóng!', {
        description: error instanceof Error ? error.message : 'Vui lòng thử lại sau'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to geocode the address to coordinates
  const geocodeAddress = async (fullAddress: string): Promise<{latitude: number, longitude: number}> => {
    setIsGeocodingLoading(true);
    setGeocodingError(null);
    
    try {
      console.log("Geocoding address:", fullAddress.trim());
      
      const response = await axios.post(`${import.meta.env.VITE_API_URL || "https://football-field-booking-backend.onrender.com/api"}/fields/geocode`, {
        address: fullAddress.trim()
      });
      
      console.log("Geocoding response:", response.data);
      
      if (response.data.success && response.data.data) {
        // Lấy dữ liệu tọa độ từ response
        // Backend có thể trả về latitude, longitude trực tiếp hoặc bên trong coordinates
        let latitude, longitude;
        
        const data = response.data.data;
        console.log("Geocoding data structure:", data);
        
        if (data.coordinates && typeof data.coordinates === 'object') {
          // Nếu tọa độ nằm trong đối tượng coordinates
          latitude = data.coordinates.latitude || data.coordinates[0];
          longitude = data.coordinates.longitude || data.coordinates[1];
        } else if (Array.isArray(data.coordinates)) {
          // Nếu coordinates là một mảng [lng, lat] hoặc [lat, lng]
          latitude = data.coordinates[0];
          longitude = data.coordinates[1];
        } else {
          // Nếu tọa độ được trả về trực tiếp
          latitude = data.latitude;
          longitude = data.longitude;
        }
        
        console.log("Extracted coordinates:", { latitude, longitude });
        
        // Kiểm tra tọa độ hợp lệ
        if (latitude !== undefined && longitude !== undefined && 
            !isNaN(Number(latitude)) && !isNaN(Number(longitude))) {
          // Đảm bảo tọa độ là số
          const lat = typeof latitude === 'string' ? parseFloat(latitude) : Number(latitude);
          const lng = typeof longitude === 'string' ? parseFloat(longitude) : Number(longitude);
          
          console.log("Parsed coordinates:", { lat, lng });
          return { latitude: lat, longitude: lng };
        }
      }
        // Nếu không thể lấy tọa độ từ API, sử dụng fallback theo district
      const districtKey = getDistrictKey(formData.district);
      if (formData.district && districtKey && DISTRICT_COORDINATES[districtKey]) {
        console.log("Using district fallback coordinates for:", formData.district, "with key:", districtKey);
        return DISTRICT_COORDINATES[districtKey];
      }
      
      // Fallback cuối cùng: sử dụng tọa độ mặc định cho Đà Nẵng
      console.log("Using default Da Nang coordinates");
      return DA_NANG_DEFAULT_COORDINATES;
      
    } catch (err: any) {
      console.error('Geocoding error:', err);
      setGeocodingError("Không thể xác định tọa độ từ địa chỉ, sử dụng tọa độ mặc định");
        // Fallback khi có lỗi: sử dụng tọa độ của quận/huyện hoặc tọa độ mặc định
      const districtKey = getDistrictKey(formData.district);
      if (formData.district && districtKey && DISTRICT_COORDINATES[districtKey]) {
        return DISTRICT_COORDINATES[districtKey];
      }
      return DA_NANG_DEFAULT_COORDINATES;
    } finally {
      setIsGeocodingLoading(false);
    }
  };
  // Function to check address and update coordinates
  const checkAddressAndUpdateCoordinates = async () => {
    // Only proceed if we have all the required address components
    if (!formData.address || !formData.district || !formData.ward || !formData.city) {
      return;
    }

    try {
      // Reset geocoding error state
      setGeocodingError(null);
      
      // Construct full address
      const fullAddress = `${formData.address}, ${getDisplayWardName(formData.ward)}, ${getDisplayDistrictName(formData.district)}, ${formData.city}`;
      console.log("Checking address for coordinates:", fullAddress);
      
      // Get coordinates
      setIsGeocodingLoading(true);
      const coordinates = await geocodeAddress(fullAddress);
      
      // Update form data with coordinates
      setFormData(prev => ({
        ...prev,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude
      }));
      
      console.log("Updated form data with coordinates:", coordinates);
    } catch (error) {
      console.error("Error getting coordinates:", error);
      setGeocodingError("Không thể xác định tọa độ từ địa chỉ, sẽ sử dụng tọa độ mặc định khi lưu");
    } finally {
      setIsGeocodingLoading(false);
    }
  };

  // Watch for changes in address components and update coordinates when all are present
  useEffect(() => {
    if (formData.address && formData.district && formData.ward && formData.city) {
      checkAddressAndUpdateCoordinates();
    }
  }, [formData.address, formData.district, formData.ward, formData.city]);

  // Helper function để chuyển đổi tên quận sang key sử dụng trong DISTRICT_COORDINATES
  const getDistrictKey = (districtName: string): string => {
    const districtKeyMap: { [key: string]: string } = {
      'Hải Châu': 'haichau',
      'Thanh Khê': 'thanhkhe',
      'Sơn Trà': 'sontra',
      'Ngũ Hành Sơn': 'nguhanhson',
      'Liên Chiểu': 'lienchieuq',
      'Cẩm Lệ': 'camle',
      'Hòa Vang': 'hoavang',
      'Hoàng Sa': 'hoangsa'
    };
    return districtKeyMap[districtName] || '';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">          {/* Back button with navigation */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-2"
            onClick={() => navigate('/owner/pitches')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Thêm sân bóng mới</h1>
        </div>

        <Tabs defaultValue="basic-info" className="w-full">          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic-info">
              Thông tin chung
            </TabsTrigger>
            <TabsTrigger value="images">
              Hình ảnh
            </TabsTrigger>
            <TabsTrigger value="documents">
              Giấy phép
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Thông tin cơ bản */}
          <TabsContent value="basic-info" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Thông tin cơ bản
                </CardTitle>
                <p className="text-sm text-gray-600">Nhập thông tin cơ bản của sân bóng.</p>
              </CardHeader>
              <CardContent className="space-y-4">                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Tên sân</Label>
                    <Input
                      id="name"
                      placeholder="Tên sân bóng: Sân ABC"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">Thành phố</Label>
                    <Select value={formData.city} onValueChange={(value) => handleInputChange('city', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn thành phố" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TP.HCM">TP. Hồ Chí Minh</SelectItem>
                        <SelectItem value="Hà Nội">Hà Nội</SelectItem>
                        <SelectItem value="Đà Nẵng">Đà Nẵng</SelectItem>
                        <SelectItem value="Cần Thơ">Cần Thơ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="district">Quận/Huyện</Label>
                    <Select value={formData.district} onValueChange={(value) => handleInputChange('district', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn quận/huyện" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Hải Châu">Hải Châu</SelectItem>
                        <SelectItem value="Thanh Khê">Thanh Khê</SelectItem>
                        <SelectItem value="Sơn Trà">Sơn Trà</SelectItem>
                        <SelectItem value="Ngũ Hành Sơn">Ngũ Hành Sơn</SelectItem>
                        <SelectItem value="Liên Chiểu">Liên Chiểu</SelectItem>
                        <SelectItem value="Cẩm Lệ">Cẩm Lệ</SelectItem>
                        <SelectItem value="Hòa Vang">Hòa Vang</SelectItem>
                        <SelectItem value="Hoàng Sa">Hoàng Sa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>                  <div>
                    <Label htmlFor="ward">Phường/Xã</Label>
                    <Select 
                      value={formData.ward} 
                      onValueChange={(value) => handleInputChange('ward', value)}
                      disabled={!formData.district} // Disable nếu chưa chọn quận/huyện
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={formData.district ? "Chọn phường/xã" : "Hãy chọn quận/huyện trước"} />
                      </SelectTrigger>                      <SelectContent>
                        {formData.district && WARDS_BY_DISTRICT[formData.district] ? (
                          WARDS_BY_DISTRICT[formData.district].map((ward) => (
                            <SelectItem key={ward} value={ward}>{ward}</SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-xs text-gray-500 text-center">Không có dữ liệu phường/xã</div>
                        )}
                      </SelectContent>
                    </Select>
                    {!formData.district && (
                      <p className="text-xs text-amber-500 mt-1">
                        Vui lòng chọn quận/huyện trước
                      </p>
                    )}
                  </div>
                </div>                <div>
                  <Label htmlFor="address">Địa chỉ đầy đủ</Label>
                  <Input
                    id="address"
                    placeholder="Số nhà, tên đường (VD: 123 Đường Trần Phú)"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Nhập số nhà và tên đường. Thông tin quận/huyện và phường/xã sẽ được chọn ở trên.
                  </p>                  {formData.address && formData.district && formData.ward && (
                    <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                      <div className="flex items-center mb-1">
                        <MapPin className="w-4 h-4 text-blue-600 mr-1" />
                        <p className="text-xs text-blue-700 font-medium">Xem trước địa chỉ đầy đủ:</p>
                      </div>
                      <p className="text-sm text-blue-800 font-medium">
                        {formData.address}, {getDisplayWardName(formData.ward)}, {getDisplayDistrictName(formData.district)}, {formData.city}
                      </p>
                      
                      {/* Show geocoding information */}
                      {(isGeocodingLoading || geocodingError || (formData.latitude && formData.longitude)) && (
                        <div className="mt-2 pt-2 border-t border-blue-200">
                          {isGeocodingLoading && (
                            <div className="flex items-center text-sm text-blue-600">
                              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                              Đang xác định tọa độ địa lý...
                            </div>
                          )}
                          
                          {geocodingError && !isGeocodingLoading && (
                            <p className="text-xs text-amber-600">
                              <span className="font-medium">Lưu ý:</span> {geocodingError}
                            </p>
                          )}
                          
                          {formData.latitude && formData.longitude && !isGeocodingLoading && (
                            <p className="text-xs text-green-600">
                              <span className="font-medium">Tọa độ:</span> {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div><div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="field-type">Loại sân</Label>
                    <Select value={formData.fieldType} onValueChange={(value) => handleInputChange('fieldType', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn loại sân" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5vs5">Sân 5vs5</SelectItem>
                        <SelectItem value="7vs7">Sân 7vs7</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="sub-field-count">Số lượng sân con</Label>
                    <Select value={formData.subFieldCount} onValueChange={(value) => handleInputChange('subFieldCount', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn số lượng sân" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 sân</SelectItem>
                        <SelectItem value="2">2 sân</SelectItem>
                        <SelectItem value="3">3 sân</SelectItem>
                        <SelectItem value="4">4 sân</SelectItem>
                        <SelectItem value="5">5 sân</SelectItem>
                        <SelectItem value="6">6 sân</SelectItem>
                        <SelectItem value="7">7 sân</SelectItem>
                        <SelectItem value="8">8 sân</SelectItem>
                        <SelectItem value="9">9 sân</SelectItem>
                        <SelectItem value="10">10 sân</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="price">Giá thuê (VNĐ/giờ)</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="1200000"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Mô tả</Label>
                  <Textarea
                    id="description"
                    placeholder="Sân bóng đá có nhân tạo chất lượng cao, có đèn chiếu sáng ban đêm."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Hình ảnh sân bóng */}
          <TabsContent value="images" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  Hình ảnh sân bóng
                </CardTitle>
                <p className="text-sm text-gray-600">Tải lên hình ảnh của sân bóng để khách hàng có thể xem trước.</p>
              </CardHeader>
              <CardContent>                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive.images ? 'border-blue-400 bg-blue-50' : 
                    formData.images.length >= 3 ? 'border-gray-200 bg-gray-50' : 'border-gray-300'
                  } ${formData.images.length >= 3 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onDragEnter={(e) => formData.images.length < 3 && handleDrag(e, 'images')}
                  onDragLeave={(e) => formData.images.length < 3 && handleDrag(e, 'images')}
                  onDragOver={(e) => formData.images.length < 3 && handleDrag(e, 'images')}
                  onDrop={(e) => formData.images.length < 3 && handleDrop(e, 'images')}
                >
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">
                    {formData.images.length >= 3 
                      ? 'Đã đủ 3 ảnh - Không thể thêm nữa' 
                      : 'Kéo thả hình ảnh vào đây hoặc click để chọn'
                    }
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Hỗ trợ JPG, JPEG, PNG, GIF (Bắt buộc đúng 3 ảnh, mỗi tệp không quá 5MB)
                  </p>
                  <p className="text-sm font-medium mb-4 text-blue-600">
                    Đã upload: {formData.images.length}/3 ảnh
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    id="field-images"
                    onChange={(e) => handleFileSelect(e.target.files, 'images')}
                    disabled={formData.images.length >= 3}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => formData.images.length < 3 && document.getElementById('field-images')?.click()}
                    disabled={formData.images.length >= 3}
                  >
                    {formData.images.length >= 3 ? 'Đã đủ ảnh' : 'Thêm hình ảnh'}
                  </Button>
                </div>                {/* Always show image grid */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium">
                      Hình ảnh sân bóng: {formData.images.length}/3
                    </p>
                    {formData.images.length < 3 && (
                      <p className="text-sm text-red-500 font-medium">
                        ⚠️ Cần thêm {3 - formData.images.length} ảnh nữa
                      </p>
                    )}
                    {formData.images.length === 3 && (
                      <p className="text-sm text-green-600 font-medium">
                        ✅ Đã đủ 3 ảnh
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {formData.images.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Field image ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 right-2 h-6 w-6 p-0"
                          onClick={() => removeImage(index)}
                        >
                          ×
                        </Button>
                        <p className="text-xs text-center mt-1 font-medium text-gray-600">
                          Ảnh {index + 1}
                        </p>
                      </div>
                    ))}
                    {/* Show placeholder boxes for remaining slots */}
                    {Array.from({ length: 3 - formData.images.length }).map((_, index) => (
                      <div key={`placeholder-${index}`} className="relative">
                        <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                          <div className="text-center">
                            <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                            <p className="text-xs text-gray-400">Ảnh {formData.images.length + index + 1}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Hình ảnh chất lượng cao sẽ giúp tăng lượt đặt sân của khách hàng. Bắt buộc phải có đúng 3 ảnh.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>          {/* Tab 3: Thông tin chi tiết (Documents) */}
          <TabsContent value="documents" className="space-y-6">
            {/* Thông báo quan trọng */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                  !
                </div>
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">Giấy tờ bắt buộc</h3>
                  <p className="text-sm text-blue-800 mb-2">
                    Để tạo sân bóng thành công, bạn cần upload đầy đủ:
                  </p>
                  <ul className="text-sm text-blue-800 space-y-1">                    <li className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                        formData.identityCard || (licenseData?.has_identity_card_front && licenseData?.identity_card_image) ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                      }`}>
                        {formData.identityCard || (licenseData?.has_identity_card_front && licenseData?.identity_card_image) ? '✓' : '○'}
                      </span>
                      Ảnh mặt trước CCCD/CMND (bắt buộc)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                        formData.identityCardBack || (licenseData?.has_identity_card_back && licenseData?.identity_card_back_image) ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                      }`}>
                        {formData.identityCardBack || (licenseData?.has_identity_card_back && licenseData?.identity_card_back_image) ? '✓' : '○'}
                      </span>
                      Ảnh mặt sau CCCD/CMND (bắt buộc)
                    </li><li className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                        formData.businessLicense || (licenseData?.has_business_license && licenseData?.business_license_image) ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                      }`}>
                        {formData.businessLicense || (licenseData?.has_business_license && licenseData?.business_license_image) ? '✓' : '○'}
                      </span>
                      Giấy phép kinh doanh (bắt buộc)
                    </li>
                  </ul>
                </div>
              </div>
            </div>            <Card>
              <CardHeader>
                <CardTitle>Hình ảnh giấy phép kinh doanh *</CardTitle>
                <p className="text-sm text-gray-600">Giấy phép kinh doanh là bắt buộc để xác thực tính hợp pháp của doanh nghiệp.</p>
              </CardHeader>
              <CardContent>
                {isLoadingLicense ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-sm text-gray-500">Đang kiểm tra giấy phép hiện có...</p>
                  </div>
                ) : licenseData?.has_business_license && licenseData.business_license_image ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          ✓
                        </div>
                        <div>
                          <h3 className="font-medium text-green-900">Giấy phép kinh doanh đã có sẵn</h3>
                          <p className="text-sm text-green-700">
                            Cập nhật lần cuối: {new Date(licenseData.last_updated).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                          <img
                            src={licenseData.business_license_image}
                            alt="Business License"
                            className="w-full h-48 object-cover rounded-lg border-2 border-green-200"
                          />
                          <div className="absolute bottom-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                            Giấy phép hiện tại
                          </div>
                        </div>
                        
                        <div className="flex flex-col justify-center space-y-3">
                          <p className="text-sm text-green-700">
                            ✅ Giấy phép kinh doanh đã được xác minh và có thể sử dụng để tạo sân bóng.
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            className="border-green-300 text-green-700 hover:bg-green-50"
                            onClick={() => {
                              // Show upload form to replace existing license
                              setLicenseData(prev => prev ? { ...prev, business_license_image: undefined } : null);
                            }}
                          >
                            Cập nhật giấy phép mới
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        dragActive.businessLicense ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                      }`}
                      onDragEnter={(e) => handleDrag(e, 'businessLicense')}
                      onDragLeave={(e) => handleDrag(e, 'businessLicense')}
                      onDragOver={(e) => handleDrag(e, 'businessLicense')}
                      onDrop={(e) => handleDrop(e, 'businessLicense')}
                    >
                      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-4" />
                      <p className="font-medium mb-2">Kéo thả hình ảnh vào đây hoặc click để chọn</p>
                      <p className="text-sm text-gray-500 mb-4">
                        Hỗ trợ JPG, JPEG, PNG, GIF (Bắt buộc upload, mỗi tệp không quá 5MB)
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="business-license"
                        onChange={(e) => handleFileSelect(e.target.files, 'businessLicense')}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('business-license')?.click()}
                      >
                        Thêm hình ảnh
                      </Button>
                    </div>

                    {formData.businessLicense && (
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="relative">
                          <img
                            src={URL.createObjectURL(formData.businessLicense)}
                            alt="Business License"
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-2 right-2 h-6 w-6 p-0"
                            onClick={() => setFormData(prev => ({ ...prev, businessLicense: null }))}
                          >
                            ×
                          </Button>
                        </div>
                        <div className="bg-gray-100 rounded-lg flex items-center justify-center">
                          <div className="text-center">
                            <Image className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Thêm hình ảnh</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <p className="text-sm text-gray-500 mt-3">
                      Giấy phép kinh doanh bắt buộc phải có để xác thực tính hợp pháp của doanh nghiệp.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card><Card>
              <CardHeader>
                <CardTitle>Hình ảnh CCCD/CMND</CardTitle>
                <p className="text-sm text-gray-600">Upload cả mặt trước và mặt sau của CCCD/CMND để xác thực tài khoản.</p>
              </CardHeader>
              <CardContent className="space-y-6">                {/* Mặt trước CCCD */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Mặt trước CCCD/CMND *</Label>
                  {isLoadingLicense ? (
                    <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                      <div className="animate-spin w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                      <p className="text-xs text-gray-500">Đang kiểm tra CCCD hiện có...</p>
                    </div>
                  ) : licenseData?.has_identity_card_front && licenseData.identity_card_image ? (
                    <div className="space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            ✓
                          </div>
                          <div>
                            <h4 className="font-medium text-green-900 text-sm">CCCD mặt trước đã có sẵn</h4>
                            <p className="text-xs text-green-700">
                              Cập nhật: {new Date(licenseData.last_updated).toLocaleDateString('vi-VN')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="relative">
                            <img
                              src={licenseData.identity_card_image}
                              alt="Identity Card Front"
                              className="w-full h-32 object-cover rounded-lg border-2 border-green-200"
                            />
                            <div className="absolute bottom-1 left-1 bg-green-600 text-white text-xs px-2 py-1 rounded">
                              Mặt trước hiện tại
                            </div>
                          </div>
                          
                          <div className="flex flex-col justify-center space-y-2">
                            <p className="text-xs text-green-700">
                              ✅ CCCD mặt trước đã được xác minh
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="border-green-300 text-green-700 hover:bg-green-50"
                              onClick={() => {
                                setLicenseData(prev => prev ? { ...prev, identity_card_image: undefined, has_identity_card_front: false } : null);
                              }}
                            >
                              Cập nhật CCCD mới
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        dragActive.identityCard ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                      }`}
                      onDragEnter={(e) => handleDrag(e, 'identityCard')}
                      onDragLeave={(e) => handleDrag(e, 'identityCard')}
                      onDragOver={(e) => handleDrag(e, 'identityCard')}
                      onDrop={(e) => handleDrop(e, 'identityCard')}
                    >
                      <Image className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                      <p className="font-medium mb-2">Upload mặt trước CCCD</p>
                      <p className="text-sm text-gray-500 mb-4">Kéo thả hoặc click để chọn file</p>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="identity-card"
                        onChange={(e) => handleFileSelect(e.target.files, 'identityCard')}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('identity-card')?.click()}
                      >
                        Chọn ảnh mặt trước
                      </Button>
                    </div>
                  )}

                  {formData.identityCard && (
                    <div className="mt-4">
                      <div className="relative w-48">
                        <img
                          src={URL.createObjectURL(formData.identityCard)}
                          alt="Identity Card Front"
                          className="w-full h-32 object-cover rounded-lg border-2 border-green-200"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 right-2 h-6 w-6 p-0"
                          onClick={() => setFormData(prev => ({ ...prev, identityCard: null }))}
                        >
                          ×
                        </Button>
                        <div className="absolute bottom-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                          Mặt trước (mới)
                        </div>
                      </div>
                    </div>
                  )}
                </div>                {/* Mặt sau CCCD */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Mặt sau CCCD/CMND *</Label>
                  {isLoadingLicense ? (
                    <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                      <div className="animate-spin w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                      <p className="text-xs text-gray-500">Đang kiểm tra CCCD hiện có...</p>
                    </div>
                  ) : licenseData?.has_identity_card_back && licenseData.identity_card_back_image ? (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            ✓
                          </div>
                          <div>
                            <h4 className="font-medium text-blue-900 text-sm">CCCD mặt sau đã có sẵn</h4>
                            <p className="text-xs text-blue-700">
                              Cập nhật: {new Date(licenseData.last_updated).toLocaleDateString('vi-VN')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="relative">
                            <img
                              src={licenseData.identity_card_back_image}
                              alt="Identity Card Back"
                              className="w-full h-32 object-cover rounded-lg border-2 border-blue-200"
                            />
                            <div className="absolute bottom-1 left-1 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                              Mặt sau hiện tại
                            </div>
                          </div>
                          
                          <div className="flex flex-col justify-center space-y-2">
                            <p className="text-xs text-blue-700">
                              ✅ CCCD mặt sau đã được xác minh
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="border-blue-300 text-blue-700 hover:bg-blue-50"
                              onClick={() => {
                                setLicenseData(prev => prev ? { ...prev, identity_card_back_image: undefined, has_identity_card_back: false } : null);
                              }}
                            >
                              Cập nhật CCCD mới
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        dragActive.identityCardBack ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                      }`}
                      onDragEnter={(e) => handleDrag(e, 'identityCardBack')}
                      onDragLeave={(e) => handleDrag(e, 'identityCardBack')}
                      onDragOver={(e) => handleDrag(e, 'identityCardBack')}
                      onDrop={(e) => handleDrop(e, 'identityCardBack')}
                    >
                      <Image className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                      <p className="font-medium mb-2">Upload mặt sau CCCD</p>
                      <p className="text-sm text-gray-500 mb-4">Kéo thả hoặc click để chọn file</p>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="identity-card-back"
                        onChange={(e) => handleFileSelect(e.target.files, 'identityCardBack')}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('identity-card-back')?.click()}
                      >
                        Chọn ảnh mặt sau
                      </Button>
                    </div>
                  )}

                  {formData.identityCardBack && (
                    <div className="mt-4">
                      <div className="relative w-48">
                        <img
                          src={URL.createObjectURL(formData.identityCardBack)}
                          alt="Identity Card Back"
                          className="w-full h-32 object-cover rounded-lg border-2 border-blue-200"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 right-2 h-6 w-6 p-0"
                          onClick={() => setFormData(prev => ({ ...prev, identityCardBack: null }))}
                        >
                          ×
                        </Button>
                        <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                          Mặt sau (mới)
                        </div>
                      </div>
                    </div>
                  )}
                </div>{/* Status hiển thị tất cả tài liệu */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">                  <div className="flex items-center justify-between text-sm mb-2">
                    <span>Tiến độ upload CCCD:</span>                    <span className="font-medium">
                      {((formData.identityCard || (licenseData?.has_identity_card_front && licenseData?.identity_card_image)) ? 1 : 0) + 
                       ((formData.identityCardBack || (licenseData?.has_identity_card_back && licenseData?.identity_card_back_image)) ? 1 : 0)}/2
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">                    <div className={`flex items-center gap-1 ${
                      formData.identityCard || (licenseData?.has_identity_card_front && licenseData?.identity_card_image) ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      <span>{formData.identityCard || (licenseData?.has_identity_card_front && licenseData?.identity_card_image) ? '✓' : '○'}</span>
                      <span>
                        {formData.identityCard 
                          ? 'Mặt trước (mới)' 
                          : (licenseData?.has_identity_card_front && licenseData?.identity_card_image)
                            ? 'Mặt trước (có sẵn)' 
                            : 'Mặt trước'
                        }
                      </span>
                    </div>
                    <div className={`flex items-center gap-1 ${
                      formData.identityCardBack || (licenseData?.has_identity_card_back && licenseData?.identity_card_back_image) ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      <span>{formData.identityCardBack || (licenseData?.has_identity_card_back && licenseData?.identity_card_back_image) ? '✓' : '○'}</span>
                      <span>
                        {formData.identityCardBack 
                          ? 'Mặt sau (mới)' 
                          : (licenseData?.has_identity_card_back && licenseData?.identity_card_back_image)
                            ? 'Mặt sau (có sẵn)' 
                            : 'Mặt sau'
                        }
                      </span>
                    </div>
                  </div>
                  <div className="border-t pt-2">                    <div className="flex items-center justify-between text-sm">
                      <span>Giấy phép kinh doanh:</span>                      <span className="font-medium">
                        {formData.businessLicense || (licenseData?.has_business_license && licenseData?.business_license_image) ? '1/1' : '0/1'}
                      </span>
                    </div>
                    <div className={`text-xs mt-1 flex items-center gap-1 ${formData.businessLicense || (licenseData?.has_business_license && licenseData?.business_license_image) ? 'text-green-600' : 'text-red-500'}`}>
                      <span>{formData.businessLicense || (licenseData?.has_business_license && licenseData?.business_license_image) ? '✓' : '✗'}</span>
                      <span>
                        {formData.businessLicense 
                          ? 'Đã upload (mới)' 
                          : (licenseData?.has_business_license && licenseData?.business_license_image)
                            ? 'Đã có sẵn' 
                            : 'Chưa upload (bắt buộc)'
                        }
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-500">
                  Hình ảnh chất lượng cao sẽ đảm bảo xác minh nhanh chóng. Vui lòng upload cả mặt trước và mặt sau.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>        <div className="mt-8 flex justify-between items-center">
          <div className="text-sm text-gray-600 max-w-md">
            {(() => {
              const errors = validateAllFields();
              if (errors.length > 0) {
                return (
                  <div className="text-red-500 font-medium">
                    <p className="mb-1">⚠️ Vui lòng hoàn thành các mục sau:</p>
                    <ul className="text-xs list-disc list-inside space-y-1">
                      {errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                );
              }              return (
                <p className="text-green-600 font-medium">
                  ✅ Đã sẵn sàng để thêm sân bóng
                </p>
              );
            })()}
          </div>
          <Button 
            onClick={() => {
              const errors = validateAllFields();
              if (errors.length > 0) {
                toast.error('Thông tin chưa đầy đủ!', {
                  description: `Vui lòng hoàn thành: ${errors.join(', ')}`
                });
                return;
              }
              handleSubmit();
            }} 
            className={`px-8 py-2 ${
              validateAllFields().length === 0 && !isSubmitting
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-gray-400 cursor-not-allowed'
            }`}
            disabled={validateAllFields().length > 0 || isSubmitting}
          >
            {isSubmitting ? 'Đang tạo sân...' : 'Thêm sân bóng'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddFieldPage;
