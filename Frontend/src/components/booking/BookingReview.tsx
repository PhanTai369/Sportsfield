import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, Mail, MessageSquare, Edit } from 'lucide-react';
import { Button } from '../ui/button';
import { CustomerInfo } from './CustomerInfo';
import { formatTimeRange, parseSlotId, getSubfieldDetailsEnhanced, getFieldTypeDisplay } from '../../utils/slotFormatter';
import { formatCurrencyValue } from '../../utils/shared/currencyUtils';
import { formatDisplayDate } from '../../utils/shared/timeUtils';

interface FieldData {
  id: string;
  name: string;
  description: string;
  price_per_hour: number;
  images1: string;
  location: {
    address_text: string;
    city: string;
    district: string;
    ward: string;
  };
  owner: {
    id: string;
    name: string;
  };
  subfields: Array<{
    id: string;
    name: string;
    field_type: string;
  }>;
}

interface BookingReviewProps {
  selectedDate: number;
  selectedSlots: string[];
  totalAmount: number;
  customerInfo: CustomerInfo;
  fieldData: FieldData;
  onContinue: () => void;
  onBack: () => void;
  onCustomerInfoUpdate?: (customerInfo: CustomerInfo) => void;
}

export function BookingReview({ 
  selectedDate, 
  selectedSlots, 
  totalAmount, 
  customerInfo,
  fieldData,
  onContinue, 
  onBack,
  onCustomerInfoUpdate
}: BookingReviewProps) {
  
  // Ensure customerInfo is defined to avoid null/undefined errors
  const safeCustomerInfo = customerInfo || { fullName: '', email: '', note: '' };
  
  const [note, setNote] = useState(safeCustomerInfo.note || '');
  // Auto-open editor if customer info is missing or incomplete
  const [isEditingCustomerInfo, setIsEditingCustomerInfo] = useState(
    !safeCustomerInfo.fullName || 
    !safeCustomerInfo.email || 
    safeCustomerInfo.fullName.trim() === '' || 
    safeCustomerInfo.email.trim() === '' ||
    !safeCustomerInfo.email.includes('@')
  );
  const [editableCustomerInfo, setEditableCustomerInfo] = useState(safeCustomerInfo);
  
  const handleNoteChange = (newNote: string) => {
    setNote(newNote);
    if (onCustomerInfoUpdate) {
      const updatedCustomerInfo = { ...customerInfo, note: newNote };
      onCustomerInfoUpdate(updatedCustomerInfo);
    }
  };

  const handleCustomerInfoEdit = () => {
    setIsEditingCustomerInfo(true);
    setEditableCustomerInfo(customerInfo);
  };

  const [formErrors, setFormErrors] = useState<{fullName?: string, email?: string}>({});
  
  // Check form when component mounts
  useEffect(() => {
    // Check if customer info is complete and valid
    if (!safeCustomerInfo.fullName?.trim() || 
        !safeCustomerInfo.email?.trim() || 
        !safeCustomerInfo.email.includes('@') ||
        safeCustomerInfo.fullName.trim().length < 2) {
      setIsEditingCustomerInfo(true);
      
      // Set validation errors
      const errors: {fullName?: string, email?: string} = {};
      if (!safeCustomerInfo.fullName?.trim()) {
        errors.fullName = 'Vui lòng nhập họ tên';
      } else if (safeCustomerInfo.fullName.trim().length < 2) {
        errors.fullName = 'Họ tên phải có ít nhất 2 ký tự';
      }
      
      if (!safeCustomerInfo.email?.trim()) {
        errors.email = 'Vui lòng nhập email';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeCustomerInfo.email)) {
        errors.email = 'Email không hợp lệ';
      }
      
      setFormErrors(errors);
    }
    
    // Try to load customer info from localStorage if current data is incomplete
    if (!safeCustomerInfo.fullName?.trim() || !safeCustomerInfo.email?.trim()) {
      const savedInfo = localStorage.getItem('currentUserInfo');
      if (savedInfo) {
        try {
          const parsedInfo = JSON.parse(savedInfo);
          if (parsedInfo.fullName && parsedInfo.email) {
            setEditableCustomerInfo({
              ...safeCustomerInfo,
              fullName: parsedInfo.fullName,
              email: parsedInfo.email
            });
          }
        } catch (e) {
          console.error('Error loading saved user info:', e);
        }
      }
    }
  }, []);
  
  const validateCustomerInfo = () => {
    const errors: {fullName?: string, email?: string} = {};
    
    if (!editableCustomerInfo.fullName?.trim()) {
      errors.fullName = 'Vui lòng nhập họ tên';
    } else if (editableCustomerInfo.fullName.trim().length < 2) {
      errors.fullName = 'Họ tên phải có ít nhất 2 ký tự';
    }
    
    if (!editableCustomerInfo.email?.trim()) {
      errors.email = 'Vui lòng nhập email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editableCustomerInfo.email)) {
      errors.email = 'Email không hợp lệ';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCustomerInfoSave = () => {
    if (validateCustomerInfo()) {
      if (onCustomerInfoUpdate) {
        onCustomerInfoUpdate(editableCustomerInfo);
      }
      
      // Save to localStorage for persistence
      localStorage.setItem('currentUserInfo', JSON.stringify({
        fullName: editableCustomerInfo.fullName,
        email: editableCustomerInfo.email,
      }));
      
      setIsEditingCustomerInfo(false);
    }
  };

  const handleCustomerInfoCancel = () => {
    setEditableCustomerInfo(customerInfo);
    setIsEditingCustomerInfo(false);
  };

  const formatDate = (day: number) => {
    return formatDisplayDate(day);
  };

  // Use utility functions from slotFormatter for consistent formatting

  const getFieldSelections = () => {
    const fieldCounts: Record<string, { 
      count: number; 
      times: string[];
      timeRanges: string[];
      subfieldName: string;
      fieldType: string;
      displayType: string;
    }> = {};
    
    console.log('BookingReview - Processing selected slots:', selectedSlots);
    
    selectedSlots.forEach(slot => {
      if (!slot || typeof slot !== 'string') {
        console.warn('BookingReview - Invalid slot:', slot);
        return;
      }

      // Use utility function to parse slot ID
      const { subfieldId, timeString } = parseSlotId(slot);
      
      console.log('BookingReview - Processing slot:', { slot, subfieldId, timeString });

      // Use enhanced subfield details utility
      const subfieldDetails = getSubfieldDetailsEnhanced(subfieldId, fieldData?.subfields);
      
      if (!fieldCounts[subfieldId]) {
        fieldCounts[subfieldId] = { 
          count: 0, 
          times: [],
          timeRanges: [],
          subfieldName: subfieldDetails.name,
          fieldType: subfieldDetails.fieldType,
          displayType: getFieldTypeDisplay(subfieldDetails.fieldType)
        };
      }
      
      fieldCounts[subfieldId].count++;
      fieldCounts[subfieldId].times.push(timeString);
    });
    
    // Sort times and regenerate time ranges properly for each field
    Object.keys(fieldCounts).forEach(fieldId => {
      // Sort times chronologically
      fieldCounts[fieldId].times.sort((a, b) => {
        try {
          // Parse times for proper sorting
          const timeA = a.includes(':') ? a : `${a.substring(0, 2)}:${a.substring(2)}`;
          const timeB = b.includes(':') ? b : `${b.substring(0, 2)}:${b.substring(2)}`;
          const [hoursA, minutesA] = timeA.split(':').map(Number);
          const [hoursB, minutesB] = timeB.split(':').map(Number);
          const totalMinutesA = hoursA * 60 + minutesA;
          const totalMinutesB = hoursB * 60 + minutesB;
          return totalMinutesA - totalMinutesB;
        } catch (error) {
          console.warn('BookingReview - Error sorting times:', error, { a, b });
          return a.localeCompare(b);
        }
      });
      
      // Generate formatted time ranges using utility function
      fieldCounts[fieldId].timeRanges = fieldCounts[fieldId].times.map(time => formatTimeRange(time));
      
      console.log('BookingReview - Processed field:', fieldId, fieldCounts[fieldId]);
    });
    
    return fieldCounts;
  };

  const fieldSelections = getFieldSelections();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Xác nhận thông tin đặt sân</h2>
        <p className="text-gray-600">Vui lòng kiểm tra lại thông tin trước khi thanh toán</p>
      </div>

      <div className="space-y-6">
        {/* Booking Details */}
        <div className="bg-green-50 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Chi tiết đặt sân
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Ngày đặt:</span>
              </div>
              <p className="font-medium">{formatDate(selectedDate)}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Sân bóng:</span>
              </div>
              <p className="font-medium">{fieldData.name}</p>
              <p className="text-sm text-gray-600 mt-1">
                {fieldData.location.address_text}, {fieldData.location.district}, {fieldData.location.city}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Chi tiết sân và giờ:</span>
            </div>
            
            <div className="space-y-3">
              {Object.entries(fieldSelections).map(([fieldId, data]) => (
                <div key={fieldId} className="bg-white rounded-lg p-3 border border-green-200">
                  <div className="mb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-800">{data.subfieldName}</p>
                        <p className="text-sm text-gray-600">{data.displayType}</p>
                        <p className="text-sm text-blue-600 font-medium">{data.count} khung giờ</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Khung giờ:</p>
                    <div className="flex flex-wrap gap-1">
                      {data.timeRanges.map((timeRange, index) => (
                        <span 
                          key={index}
                          className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium"
                        >
                          {timeRange}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Total Amount */}
        <div className="bg-yellow-50 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-4 flex items-center gap-2">
            <span className="text-lg">💰</span>
            Tổng chi phí
          </h3>
          
          <div className="bg-white rounded-lg p-4 border border-yellow-200">
            <div className="flex justify-between items-center">
              <span className="text-lg text-gray-700">Tổng cộng:</span>
              <span className="text-2xl font-bold text-green-600">
                {totalAmount.toLocaleString('vi-VN')}đ
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Bao gồm tất cả phí sân và giờ cao điểm (nếu có)
            </p>
          </div>
        </div>

        {/* Customer Information */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-blue-800 flex items-center gap-2">
              <User className="w-5 h-5" />
              Thông tin khách hàng
              {customerInfo.fullName && customerInfo.email && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full ml-2">
                  Đã đăng nhập
                </span>
              )}
            </h3>
            
            {!isEditingCustomerInfo && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCustomerInfoEdit}
                className="text-blue-600 border-blue-300 hover:bg-blue-100"
              >
                <Edit className="w-4 h-4 mr-1" />
                Chỉnh sửa
              </Button>
            )}
          </div>
          
          {isEditingCustomerInfo ? (
            // Edit mode
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Họ tên *
                  </label>
                  <input
                    type="text"
                    value={editableCustomerInfo.fullName}
                    onChange={(e) => {
                      setEditableCustomerInfo({
                        ...editableCustomerInfo,
                        fullName: e.target.value
                      });
                      if (formErrors.fullName) {
                        setFormErrors({...formErrors, fullName: undefined});
                      }
                    }}
                    className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.fullName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Nhập họ tên"
                  />
                  {formErrors.fullName && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.fullName}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={editableCustomerInfo.email}
                    onChange={(e) => {
                      setEditableCustomerInfo({
                        ...editableCustomerInfo,
                        email: e.target.value
                      });
                      if (formErrors.email) {
                        setFormErrors({...formErrors, email: undefined});
                      }
                    }}
                    className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Nhập địa chỉ email"
                  />
                  {formErrors.email && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCustomerInfoCancel}
                >
                  Hủy
                </Button>
                <Button
                  size="sm"
                  onClick={handleCustomerInfoSave}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Lưu
                </Button>
              </div>
            </div>
          ) : (
            // Display mode
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Họ tên:</span>
                </div>
                <p className="font-medium text-gray-800">
                  {customerInfo.fullName || (
                    <span className="text-gray-500 italic">Chưa có thông tin</span>
                  )}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Email:</span>
                </div>
                <p className="font-medium text-gray-800">
                  {customerInfo.email || (
                    <span className="text-gray-500 italic">Chưa có thông tin</span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Note input field */}
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Ghi chú (tùy chọn):</span>
            </div>
            <textarea
              value={note}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder="Nhập ghi chú của bạn (ví dụ: yêu cầu đặc biệt, thời gian đến sân...)"
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>
        </div>

        {/* Booking Summary */}
        <div className="bg-gray-50 rounded-lg p-4 border-2 border-green-200">
          <h3 className="font-semibold text-gray-800 mb-4">Tóm tắt đặt sân</h3>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Tổng số giờ đặt:</span>
              <span>{selectedSlots.length} giờ</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tạm tính:</span>
              <span>{formatCurrencyValue(totalAmount)}đ</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Phí dịch vụ:</span>
              <span>0đ</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between text-lg font-bold text-green-600">
              <span>Tổng cộng:</span>
              <span>{formatCurrencyValue(totalAmount)}đ</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Lưu ý:</strong> Bạn cần thanh toán 100% để xác nhận đặt sân. 
              Hãy đến sân đúng giờ để tránh mất slot.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-4">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-1"
          >
            Quay lại
          </Button>
          <Button
            onClick={() => {
              // If editing, validate and save first
              if (isEditingCustomerInfo) {
                if (validateCustomerInfo() && onCustomerInfoUpdate) {
                  onCustomerInfoUpdate(editableCustomerInfo);
                  setIsEditingCustomerInfo(false);
                  // Save to localStorage for persistence
                  localStorage.setItem('currentUserInfo', JSON.stringify({
                    fullName: editableCustomerInfo.fullName,
                    email: editableCustomerInfo.email,
                  }));
                  // Wait a moment before continuing to next step
                  setTimeout(() => onContinue(), 100);
                }
              } else if (editableCustomerInfo.fullName && editableCustomerInfo.email) {
                // Verify data format before continuing
                const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editableCustomerInfo.email) && 
                               editableCustomerInfo.fullName.trim().length >= 2;
                
                if (isValid) {
                  // If not editing and has valid info, continue
                  onContinue();
                } else {
                  // If data format is invalid, show edit form with errors
                  setIsEditingCustomerInfo(true);
                  validateCustomerInfo();
                }
              } else {
                // If not editing but missing info, show edit form
                setIsEditingCustomerInfo(true);
                setFormErrors({
                  fullName: !editableCustomerInfo.fullName ? 'Vui lòng nhập họ tên' : undefined,
                  email: !editableCustomerInfo.email ? 'Vui lòng nhập email' : undefined
                });
              }
            }}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            Tiếp tục thanh toán
          </Button>
        </div>
      </div>
    </div>
  );
}
