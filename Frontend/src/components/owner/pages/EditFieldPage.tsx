import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Upload, ArrowLeft, MapPin, DollarSign, FileText, Users, Image } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Label } from '../../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import fieldService, { UserLicense, Field } from '../../../services/fieldService';
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
}

const EditFieldPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: fieldId } = useParams<{ id: string }>();

  // Helper function để kiểm tra validation tổng thể
  const validateAllFields = () => {
    const errors = [];
    
    // Kiểm tra thông tin cơ bản
    if (!formData.name) errors.push('Tên sân');
    if (!formData.district) errors.push('Quận/huyện');
    if (!formData.ward) errors.push('Phường/xã');
    if (!formData.address) errors.push('Địa chỉ');
    if (!formData.price) errors.push('Giá thuê');
    if (!formData.description) errors.push('Mô tả');
    
    // Kiểm tra hình ảnh sân bóng (có thể sử dụng ảnh cũ hoặc upload mới)
    if (formData.images.length === 0 && !originalField?.images1) {
      errors.push('Hình ảnh sân bóng (cần ít nhất 1 ảnh)');
    }

    return errors;
  };

  // Helper functions for display
  const getDisplayDistrictName = (value: string) => {
    const districtMap: { [key: string]: string } = {
      'haichau': 'Hải Châu',
      'thanhkhe': 'Thanh Khê',
      'sontra': 'Sơn Trà',
      'nguhanhson': 'Ngũ Hành Sơn',
      'camle': 'Cẩm Lệ',
      'lienchieuq': 'Liên Chiểu',
      'hoavang': 'Hòa Vang',
      'hoangsa': 'Hoàng Sa'
    };
    return districtMap[value] || value;
  };

  const getDisplayWardName = (value: string) => {
    const wardMap: { [key: string]: string } = {
      'thuanthanh': 'Thuận Thành',
      'thuanphuoc': 'Thuận Phước',
      'thaach': 'Thạch Thang',
      'haichau1': 'Phường Hải Châu 1',
      'haichau2': 'Phường Hải Châu 2',
      'phicat': 'Phường Phước Ninh',
      'anhai': 'Phường An Hải Bắc',
      'manhthien': 'Phường Mân Thái',
      'hoakhanh': 'Phường Hòa Khánh Bắc',
      'hoakhanhn': 'Phường Hòa Khánh Nam',
      'thansan': 'Phường Thạnh An',
      'xuannhanh': 'Phường Xuân Phú',
      'khuehac': 'Phường Khuê Trung',
      'thanhkhe': 'Phường Thanh Khê Tây',
      'thanhkheo': 'Phường Thanh Khê Đông'
    };
    return wardMap[value] || value;
  };

  const [formData, setFormData] = useState<FieldFormData>({
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
    identityCardBack: null
  });

  const [dragActive, setDragActive] = useState({
    images: false,
    businessLicense: false,
    identityCard: false,
    identityCardBack: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [licenseData, setLicenseData] = useState<UserLicense | null>(null);
  const [isLoadingLicense, setIsLoadingLicense] = useState(true);
  const [originalField, setOriginalField] = useState<Field | null>(null);

  // Fetch field data and license data when component mounts
  useEffect(() => {
    const loadFieldData = async () => {
      if (!fieldId) {
        toast.error('ID sân bóng không hợp lệ');
        navigate('/owner/pitches');
        return;
      }

      try {
        setIsLoading(true);
        
        // Load field data
        const fieldData = await fieldService.getFieldForEdit(fieldId);
        setOriginalField(fieldData);
        
        // Populate form with existing data
        setFormData({
          name: fieldData.name || '',
          city: fieldData.location?.city || 'Đà Nẵng',
          district: fieldData.location?.district || '',
          ward: fieldData.location?.ward || '',
          address: fieldData.location?.address_text || '',
          fieldType: fieldData.SubFields?.[0]?.field_type || '5vs5',
          subFieldCount: fieldData.SubFields?.length.toString() || '1',
          price: fieldData.price_per_hour?.toString() || '',
          description: fieldData.description || '',
          images: [], // Start with empty array, existing images will be shown separately
          businessLicense: null,
          identityCard: null,
          identityCardBack: null
        });

        // Load license data
        const licenseResponse = await fieldService.getUserLicense();
        setLicenseData(licenseResponse.license);
        
      } catch (error) {
        console.error('Error loading field data:', error);
        toast.error('Không thể tải thông tin sân bóng');
        navigate('/owner/pitches');
      } finally {
        setIsLoading(false);
        setIsLoadingLicense(false);
      }
    };

    loadFieldData();
  }, [fieldId, navigate]);

  const handleInputChange = (field: keyof FieldFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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
      } else {
        const imageFile = files.find(file => file.type.startsWith('image/'));
        if (imageFile) {
          setFormData(prev => ({
            ...prev,
            [type]: imageFile
          }));
        }
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
        alert(`Chỉ thêm được ${availableSlots} ảnh. ${imageFiles.length - availableSlots} ảnh còn lại đã bị bỏ qua.`);
      }
    } else {
      const imageFile = fileArray.find(file => file.type.startsWith('image/'));
      if (imageFile) {
        setFormData(prev => ({
          ...prev,
          [type]: imageFile
        }));
      }
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // Show loading toast
      const loadingToast = toast.loading('Đang cập nhật sân bóng...', {
        description: 'Đang upload ảnh lên S3 và cập nhật thông tin sân bóng'
      });

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

      // Add new images if any (only upload new ones)
      formData.images.forEach((image, index) => {
        formDataToSend.append(`image${index + 1}`, image);
      });

      // Add business documents if uploaded
      if (formData.businessLicense) {
        formDataToSend.append('business_license_image', formData.businessLicense);
      }
      if (formData.identityCard) {
        formDataToSend.append('identity_card_image', formData.identityCard);
      }
      if (formData.identityCardBack) {
        formDataToSend.append('identity_card_back_image', formData.identityCardBack);
      }

      // Call fieldService to submit update
      await fieldService.updateFieldWithFiles(fieldId!, formDataToSend);
      
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      // Show success toast
      toast.success('Cập nhật sân bóng thành công!', {
        description: 'Sân bóng đã được cập nhật và đang chờ xét duyệt lại từ quản trị viên'
      });

      // Navigate back to pitches list
      navigate('/owner/pitches');
      
    } catch (error) {
      console.error('Error updating field:', error);
      toast.error('Có lỗi xảy ra khi cập nhật sân bóng!', {
        description: error instanceof Error ? error.message : 'Vui lòng thử lại sau'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải thông tin sân bóng...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          {/* Back button with navigation */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-2"
            onClick={() => navigate('/owner/pitches')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Chỉnh sửa sân bóng</h1>
          {originalField && (
            <span className="text-sm text-gray-500">({originalField.name})</span>
          )}
        </div>

        {/* Warning about re-approval */}
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
              !
            </div>
            <div>
              <h3 className="font-medium text-yellow-900 mb-1">Lưu ý quan trọng</h3>
              <p className="text-sm text-yellow-800">
                Khi bạn cập nhật thông tin sân bóng, sân sẽ cần được xét duyệt lại bởi quản trị viên. 
                Trong thời gian chờ duyệt, sân sẽ có trạng thái "Chờ duyệt" và có thể không hiển thị với khách hàng.
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="basic-info" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
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
                <p className="text-sm text-gray-600">Cập nhật thông tin cơ bản của sân bóng.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                        <SelectItem value="haichau">Hải Châu</SelectItem>
                        <SelectItem value="thanhkhe">Thanh Khê</SelectItem>
                        <SelectItem value="sontra">Sơn Trà</SelectItem>
                        <SelectItem value="nguhanhson">Ngũ Hành Sơn</SelectItem>
                        <SelectItem value="lienchieuq">Liên Chiểu</SelectItem>
                        <SelectItem value="camle">Cẩm Lệ</SelectItem>
                        <SelectItem value="hoavang">Hòa Vang</SelectItem>
                        <SelectItem value="hoangsa">Hoàng Sa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="ward">Phường/Xã</Label>
                    <Select value={formData.ward} onValueChange={(value) => handleInputChange('ward', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn phường/xã" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="thuanthanh">Thuận Thành</SelectItem>
                        <SelectItem value="thuanphuoc">Thuận Phước</SelectItem>
                        <SelectItem value="thaach">Thạch Thang</SelectItem>
                        <SelectItem value="haichau1">Hải Châu 1</SelectItem>
                        <SelectItem value="haichau2">Hải Châu 2</SelectItem>
                        <SelectItem value="phicat">Phước Ninh</SelectItem>
                        <SelectItem value="anhai">An Hải Bắc</SelectItem>
                        <SelectItem value="manhthien">Mân Thái</SelectItem>
                        <SelectItem value="hoakhanh">Hòa Khánh Bắc</SelectItem>
                        <SelectItem value="hoakhanhn">Hòa Khánh Nam</SelectItem>
                        <SelectItem value="thansan">Thạnh An</SelectItem>
                        <SelectItem value="xuannhanh">Xuân Phú</SelectItem>
                        <SelectItem value="khuehac">Khuê Trung</SelectItem>
                        <SelectItem value="thanhkhe">Thanh Khê Tây</SelectItem>
                        <SelectItem value="thanhkheo">Thanh Khê Đông</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
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
                  </p>
                  {formData.address && formData.district && formData.ward && (
                    <div className="mt-2 p-2 bg-blue-50 rounded border">
                      <p className="text-xs text-blue-700 font-medium">Xem trước địa chỉ đầy đủ:</p>
                      <p className="text-sm text-blue-800">
                        {formData.address}, {getDisplayWardName(formData.ward)}, {getDisplayDistrictName(formData.district)}, {formData.city}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                        <SelectValue placeholder="Chọn số lượng" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num} sân</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="price">Giá thuê (VNĐ/giờ)</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="500000"
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
                <p className="text-sm text-gray-600">Cập nhật hình ảnh của sân bóng.</p>
              </CardHeader>
              <CardContent>
                {/* Show existing images */}
                {originalField && (originalField.images1 || originalField.images2 || originalField.images3) && (
                  <div className="mb-6">
                    <Label className="text-sm font-medium mb-2 block">Hình ảnh hiện tại</Label>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      {originalField.images1 && (
                        <div className="relative">
                          <img
                            src={originalField.images1}
                            alt="Current image 1"
                            className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                          />
                          <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                            Ảnh 1 (hiện tại)
                          </div>
                        </div>
                      )}
                      {originalField.images2 && (
                        <div className="relative">
                          <img
                            src={originalField.images2}
                            alt="Current image 2"
                            className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                          />
                          <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                            Ảnh 2 (hiện tại)
                          </div>
                        </div>
                      )}
                      {originalField.images3 && (
                        <div className="relative">
                          <img
                            src={originalField.images3}
                            alt="Current image 3"
                            className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                          />
                          <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                            Ảnh 3 (hiện tại)
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Nếu bạn upload ảnh mới bên dưới, những ảnh mới sẽ thay thế ảnh hiện tại.
                    </p>
                  </div>
                )}

                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive.images ? 'border-blue-400 bg-blue-50' : 
                    formData.images.length >= 3 ? 'border-gray-200 bg-gray-50' : 'border-gray-300'
                  } ${formData.images.length >= 3 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onDragEnter={(e) => formData.images.length < 3 && handleDrag(e, 'images')}
                  onDragLeave={(e) => formData.images.length < 3 && handleDrag(e, 'images')}
                  onDragOver={(e) => formData.images.length < 3 && handleDrag(e, 'images')}
                  onDrop={(e) => formData.images.length < 3 && handleDrop(e, 'images')}
                >
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-4" />
                  <p className="font-medium mb-2">Upload ảnh mới (tùy chọn)</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Kéo thả hình ảnh vào đây hoặc click để chọn
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
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
                </div>

                {/* Show new uploaded images */}
                {formData.images.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium">
                        Ảnh mới sẽ upload: {formData.images.length}/3
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {formData.images.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(image)}
                            alt={`New image ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border-2 border-green-200"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-2 right-2 h-6 w-6 p-0"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                images: prev.images.filter((_, i) => i !== index)
                              }));
                            }}
                          >
                            ×
                          </Button>
                          <div className="absolute bottom-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                            Ảnh mới {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Giấy phép (similar to AddFieldPage) */}
          <TabsContent value="documents" className="space-y-6">
            {/* Similar structure to AddFieldPage for documents */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                  !
                </div>
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">Cập nhật giấy tờ (tùy chọn)</h3>
                  <p className="text-sm text-blue-800">
                    Bạn có thể cập nhật giấy phép kinh doanh và CCCD/CMND nếu cần. 
                    Nếu không upload mới, hệ thống sẽ sử dụng giấy tờ hiện tại.
                  </p>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Cập nhật giấy tờ</CardTitle>
                <p className="text-sm text-gray-600">Upload giấy tờ mới nếu cần cập nhật.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm text-gray-600">
                  Các giấy tờ hiện tại sẽ được giữ nguyên nếu bạn không upload mới.
                </p>

                {/* Business License Section */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Giấy phép kinh doanh mới (tùy chọn)</Label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      dragActive.businessLicense ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                    }`}
                    onDragEnter={(e) => handleDrag(e, 'businessLicense')}
                    onDragLeave={(e) => handleDrag(e, 'businessLicense')}
                    onDragOver={(e) => handleDrag(e, 'businessLicense')}
                    onDrop={(e) => handleDrop(e, 'businessLicense')}
                  >
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                    <p className="font-medium mb-2">Upload giấy phép kinh doanh mới</p>
                    <p className="text-sm text-gray-500 mb-4">Kéo thả hoặc click để chọn file</p>
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
                    <div className="mt-4">
                      <div className="relative w-48">
                        <img
                          src={URL.createObjectURL(formData.businessLicense)}
                          alt="New Business License"
                          className="w-full h-32 object-cover rounded-lg border-2 border-green-200"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 right-2 h-6 w-6 p-0"
                          onClick={() => setFormData(prev => ({ ...prev, businessLicense: null }))}
                        >
                          ×
                        </Button>
                        <div className="absolute bottom-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                          Giấy phép mới
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Identity Card Front Section */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">CCCD/CMND mặt trước mới (tùy chọn)</Label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      dragActive.identityCard ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                    }`}
                    onDragEnter={(e) => handleDrag(e, 'identityCard')}
                    onDragLeave={(e) => handleDrag(e, 'identityCard')}
                    onDragOver={(e) => handleDrag(e, 'identityCard')}
                    onDrop={(e) => handleDrop(e, 'identityCard')}
                  >
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                    <p className="font-medium mb-2">Upload CCCD mặt trước mới</p>
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
                      onClick={() => document.getElementById('identity-card')?.click()}
                    >
                      Chọn ảnh mặt trước
                    </Button>
                  </div>

                  {formData.identityCard && (
                    <div className="mt-4">
                      <div className="relative w-48">
                        <img
                          src={URL.createObjectURL(formData.identityCard)}
                          alt="New Identity Card Front"
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
                          Mặt trước mới
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Identity Card Back Section */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">CCCD/CMND mặt sau mới (tùy chọn)</Label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      dragActive.identityCardBack ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                    }`}
                    onDragEnter={(e) => handleDrag(e, 'identityCardBack')}
                    onDragLeave={(e) => handleDrag(e, 'identityCardBack')}
                    onDragOver={(e) => handleDrag(e, 'identityCardBack')}
                    onDrop={(e) => handleDrop(e, 'identityCardBack')}
                  >
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                    <p className="font-medium mb-2">Upload CCCD mặt sau mới</p>
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
                      onClick={() => document.getElementById('identity-card-back')?.click()}
                    >
                      Chọn ảnh mặt sau
                    </Button>
                  </div>

                  {formData.identityCardBack && (
                    <div className="mt-4">
                      <div className="relative w-48">
                        <img
                          src={URL.createObjectURL(formData.identityCardBack)}
                          alt="New Identity Card Back"
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
                          Mặt sau mới
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex justify-between items-center">
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
              }

              return (
                <p className="text-green-600 font-medium">
                  ✅ Đã sẵn sàng để cập nhật sân bóng
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
            {isSubmitting ? 'Đang cập nhật...' : 'Cập nhật sân bóng'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditFieldPage;
