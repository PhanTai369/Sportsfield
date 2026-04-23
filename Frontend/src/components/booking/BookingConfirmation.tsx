import { CheckCircle, Calendar, Clock, MapPin, User, Mail, Download, Home, MessageSquare, Loader2, RefreshCw, Wifi, WifiOff, History } from 'lucide-react';
import { Button } from '../ui/button';
import { CustomerInfo } from './CustomerInfo';
import { formatTimeRange, parseSlotId, getSubfieldDetailsEnhanced, getFieldTypeDisplay } from '../../utils/slotFormatter';
import { useState, useEffect, useRef } from 'react';
import { paymentService } from '../../services/payment.service';
import { useBookingStatus } from '../../hooks/useBookingStatus';
import { useSocket } from '../../hooks/useSocket';
// Import centralized utilities
import { formatCurrencyValue } from '../../utils/shared/currencyUtils';
import { PaymentSyncService } from '../../utils/shared/paymentSyncService';
import { generateBookingReceiptPDF } from '../../utils/pdfGeneratorHTML';
import { showToast } from '../../utils/toast';

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

interface BookingConfirmationProps {
  selectedDate: number;
  selectedSlots: string[];
  totalAmount: number;
  customerInfo: CustomerInfo;
  fieldData: FieldData;
  bookingId: string;
  onNewBooking: () => void;
  onGoHome: () => void;
  paymentStatus?: string; // Add payment status prop
  onBookingUpdate?: (updatedBooking: any) => void; // Callback for booking updates
}

export function BookingConfirmation({ 
  selectedDate, 
  selectedSlots, 
  totalAmount, 
  customerInfo,
  fieldData,
  bookingId,
  onNewBooking,
  onGoHome,
  paymentStatus,
  onBookingUpdate
}: BookingConfirmationProps) {
  
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  // Add null checks for required data
  if (!fieldData) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Có lỗi xảy ra</h2>
          <p className="text-gray-600">Không thể tải thông tin chi tiết sân bóng</p>
          <p className="text-sm text-gray-500 mt-2">Mã đặt sân: {bookingId}</p>
          <div className="mt-6 space-y-4">
            <Button
              onClick={onGoHome}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Home className="w-4 h-4 mr-2" />
              Về trang chủ
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="ml-4"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tải lại trang
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!customerInfo) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Có lỗi xảy ra</h2>
          <p className="text-gray-600">Không thể tải thông tin khách hàng</p>
          <p className="text-sm text-gray-500 mt-2">Mã đặt sân: {bookingId}</p>
          <div className="mt-6 space-y-4">
            <Button
              onClick={onGoHome}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Home className="w-4 h-4 mr-2" />
              Về trang chủ
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="ml-4"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tải lại trang
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Check if fieldData indicates an error (from backend fallback)
  if (fieldData.id === 'error') {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="w-10 h-10 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Đặt sân thành công!</h2>
          <p className="text-gray-600">Một số thông tin chi tiết không thể tải được</p>
          <p className="text-sm text-gray-500 mt-2">Mã đặt sân: {bookingId}</p>
          
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium">
              Đặt sân thành công với mã: <span className="font-mono text-lg">{bookingId}</span>
            </p>
            <p className="text-sm text-yellow-600 mt-2">
              Thông tin chi tiết sân bóng đang được cập nhật. Vui lòng kiểm tra email xác nhận.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <Button
              onClick={onNewBooking}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Đặt sân mới
            </Button>
            <Button
              variant="outline"
              onClick={onGoHome}
              className="ml-4"
            >
              <Home className="w-4 h-4 mr-2" />
              Về trang chủ
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // Initialize WebSocket hooks
  const { isConnected: socketConnected } = useSocket();
  const { 
    bookingStatuses, 
    isConnected,
    globalError, 
    currentBookingStatus,
    subscribe,
    unsubscribe,
    syncStatus,
    getBookingStatus,
    clearError
  } = useBookingStatus(); // Don't pass bookingId to prevent auto-subscription
  
  // Use refs to store latest functions to avoid dependency issues
  const subscribeRef = useRef(subscribe);
  const unsubscribeRef = useRef(unsubscribe);
  
  // Update refs when functions change
  useEffect(() => {
    subscribeRef.current = subscribe;
    unsubscribeRef.current = unsubscribe;
  }, [subscribe, unsubscribe]);
  
  // Track current payment status
  const [currentPaymentStatus, setCurrentPaymentStatus] = useState(paymentStatus);
  
  // Get current booking status
  const bookingStatus = getBookingStatus(bookingId);
  
  // Handle real-time booking updates
  useEffect(() => {
    if (bookingStatus) {
      console.log('Real-time booking status update received:', bookingStatus);
      
      // Update payment status if it changed
      if (bookingStatus.paymentStatus && bookingStatus.paymentStatus !== currentPaymentStatus) {
        setCurrentPaymentStatus(bookingStatus.paymentStatus);
        setSyncSuccess(`Trạng thái thanh toán đã được cập nhật thành: ${getPaymentStatusDisplay(bookingStatus.paymentStatus).text}`);
        
        // Clear success message after 5 seconds
        setTimeout(() => setSyncSuccess(null), 5000);
        
        // Call the callback to update booking data in parent component
        if (onBookingUpdate) {
          onBookingUpdate({
            paymentStatus: bookingStatus.paymentStatus,
            status: bookingStatus.status,
            lastUpdated: bookingStatus.lastUpdated
          });
        }
      }
    }
  }, [bookingStatus, currentPaymentStatus, onBookingUpdate]);
  
  // Subscribe to booking updates when component mounts - ONLY ONCE
  useEffect(() => {
    if (bookingId && isConnected) {
      console.log('BookingConfirmation: Subscribing to real-time updates for booking:', bookingId);
      
      // Small delay to ensure useBookingStatus is ready and avoid racing
      const subscriptionTimer = setTimeout(() => {
        subscribeRef.current(bookingId);
      }, 200);
      
      return () => {
        clearTimeout(subscriptionTimer);
        console.log('BookingConfirmation: Unsubscribing from booking updates:', bookingId);
        unsubscribeRef.current(bookingId);
      };
    }
  }, [bookingId, isConnected]); // Remove subscribe/unsubscribe from deps to prevent loop
  
  // Update current payment status when prop changes
  useEffect(() => {
    setCurrentPaymentStatus(paymentStatus);
  }, [paymentStatus]);
  
  // Function to sync payment status with enhanced WebSocket integration
  const syncPaymentStatus = async () => {
    if (!bookingId) return null;
    
    try {
      setSyncing(true);
      setSyncError(null);
      setSyncSuccess(null);
      console.log('Syncing payment status for booking:', bookingId);
      
      // Try WebSocket sync first if connected
      if (isConnected) {
        console.log('Attempting WebSocket sync...');
        syncStatus(bookingId);
        
        // Since syncStatus doesn't return a value, we'll rely on the real-time updates
        // The booking status will be updated through the useEffect that watches bookingStatus
        console.log('WebSocket sync triggered, waiting for real-time update...');
        return null; // We'll handle the response through real-time updates
      }
      
      // Use centralized sync service instead of direct paymentService call
      console.log('Using centralized PaymentSyncService...');
      const result = await PaymentSyncService.syncBookingPaymentStatus(bookingId);
      
      if (result.success && result.booking) {
        console.log('Payment status synced successfully via centralized service:', result.booking);
        
        // Show success message if payment status changed
        if (result.booking.paymentStatus !== currentPaymentStatus) {
          setCurrentPaymentStatus(result.booking.paymentStatus);
          setSyncSuccess(`Trạng thái thanh toán đã được cập nhật thành: ${getPaymentStatusDisplay(result.booking.paymentStatus).text}`);
          
          // Clear success message after 5 seconds
          setTimeout(() => setSyncSuccess(null), 5000);
        }
        
        // Call the callback to update booking data in parent component
        if (onBookingUpdate) {
          onBookingUpdate(result.booking);
        }
        return result.booking;
      } else {
        console.log('Payment status sync completed, no changes needed');
        return null;
      }
    } catch (err: any) {
      console.error('Error syncing payment status:', err);
      setSyncError(err.message || 'Failed to sync payment status');
      return null;
    } finally {
      setSyncing(false);
    }
  };

    // Auto-sync on component mount if payment is pending - now enhanced with WebSocket
  useEffect(() => {
    if ((currentPaymentStatus === 'payment_pending' || currentPaymentStatus === 'pending') && bookingId) {
      console.log('Auto-syncing payment status on confirmation page load');
      
      // If WebSocket is connected, rely on real-time updates primarily
      if (isConnected) {
        console.log('WebSocket connected, subscribing for real-time updates');
        // Initial sync to get current status
        syncPaymentStatus();
      } else {
        console.log('WebSocket not connected, using traditional polling');
        syncPaymentStatus();
        
        // Perform multiple checks in the first few seconds to ensure status is updated quickly
        const quickChecks = [2000, 5000, 10000, 15000]; // Check after 2s, 5s, 10s, 15s
        
        quickChecks.forEach(delay => {
          setTimeout(() => {
            if (currentPaymentStatus === 'payment_pending' || currentPaymentStatus === 'pending') {
              console.log(`Quick payment sync check after ${delay/1000}s`);
              syncPaymentStatus();
            }
          }, delay);
        });
      }
    }
  }, [bookingId, currentPaymentStatus, isConnected]);

  // Periodic sync check for payment_pending status - reduced frequency when WebSocket is active
  useEffect(() => {
    if ((currentPaymentStatus !== 'payment_pending' && currentPaymentStatus !== 'pending') || !bookingId) return;

    // If WebSocket is connected, use longer intervals as backup
    const interval = isConnected ? 30000 : 10000; // 30s with WebSocket, 10s without
    
    console.log(`Setting up periodic sync check for payment_pending status (interval: ${interval/1000}s)`);
    const intervalId = setInterval(() => {
      console.log('Periodic sync check triggered');
      syncPaymentStatus();
    }, interval);

    // Cleanup interval on unmount or when payment status changes
    return () => {
      console.log('Cleaning up periodic sync check');
      clearInterval(intervalId);
    };
  }, [bookingId, currentPaymentStatus, isConnected]);

  const formatDate = (day: number) => {
    const today = new Date();
    const date = new Date(today.getFullYear(), today.getMonth(), day);
    return date.toLocaleDateString('vi-VN', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
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
    
    // Handle case where selectedSlots might be null or undefined
    if (!selectedSlots || !Array.isArray(selectedSlots)) {
      console.warn('BookingConfirmation - Invalid selectedSlots:', selectedSlots);
      return fieldCounts;
    }
    
    selectedSlots.forEach(slot => {
      // Use utility function to parse slot ID
      if (!slot || typeof slot !== 'string') {
        console.warn('BookingConfirmation - Invalid slot:', slot);
        return;
      }
      
      const { subfieldId, timeString } = parseSlotId(slot);
      
      // Use enhanced subfield details utility with better error handling
      const subfieldDetails = getSubfieldDetailsEnhanced(subfieldId, fieldData?.subfields);
      
      if (!fieldCounts[subfieldId]) {
        fieldCounts[subfieldId] = { 
          count: 0, 
          times: [],
          timeRanges: [],
          subfieldName: subfieldDetails.name || `Sân ${subfieldId}`,
          fieldType: subfieldDetails.fieldType || 'unknown',
          displayType: getFieldTypeDisplay(subfieldDetails.fieldType || 'unknown')
        };
      }
      
      fieldCounts[subfieldId].count++;
      
      // Only add valid times
      if (timeString) {
        fieldCounts[subfieldId].times.push(timeString);
        fieldCounts[subfieldId].timeRanges.push(formatTimeRange(timeString));
      } else {
        console.warn('BookingConfirmation - Invalid time for slot:', slot);
        fieldCounts[subfieldId].times.push('Thời gian không hợp lệ');
        fieldCounts[subfieldId].timeRanges.push('Thời gian không hợp lệ');
      }
    });
    
    // Sort times for each field
    Object.keys(fieldCounts).forEach(fieldId => {
      const validTimes = fieldCounts[fieldId].times.filter(time => 
        time !== 'Thời gian không hợp lệ' && time.includes(':')
      );
      const invalidTimes = fieldCounts[fieldId].times.filter(time => 
        time === 'Thời gian không hợp lệ' || !time.includes(':')
      );
      
      validTimes.sort();
      fieldCounts[fieldId].times = [...validTimes, ...invalidTimes];
      fieldCounts[fieldId].timeRanges = fieldCounts[fieldId].times.map(time => {
        if (time === 'Thời gian không hợp lệ' || !time.includes(':')) {
          return time;
        }
        return formatTimeRange(time);
      });
    });
    
    return fieldCounts;
  };

  const fieldSelections = getFieldSelections();

  const handleDownloadReceipt = async () => {
    try {
      // Prepare data for PDF generation
      const pdfData = {
        bookingId: bookingId,
        fieldName: fieldData?.name || 'Tên sân không có',
        fieldLocation: `${fieldData?.location?.address_text || ''}, ${fieldData?.location?.district || ''}, ${fieldData?.location?.city || 'Địa chỉ không có'}`.replace(/^, |, $/, ''),
        customerName: customerInfo?.fullName || 'Không có tên',
        customerEmail: customerInfo?.email || 'Không có email',
        date: formatDate(selectedDate),
        slots: Object.entries(fieldSelections).map(([subfieldId, data]) => ({
          subfieldName: data.subfieldName,
          fieldType: data.displayType,
          timeRanges: data.timeRanges,
          count: data.count
        })),
        totalAmount: totalAmount,
        paymentStatus: currentPaymentStatus || 'pending',
        bookedAt: new Date().toLocaleString('vi-VN')
      };

      // Generate and download PDF
      await generateBookingReceiptPDF(pdfData);
      
      // Show success message
      showToast.success('Hóa đơn PDF đã được tải xuống thành công!');
      
    } catch (error) {
      console.error('Error generating receipt PDF:', error);
      showToast.error('Có lỗi xảy ra khi tạo hóa đơn PDF. Vui lòng thử lại!');
    }
  };

  const handleViewBookingHistory = () => {
    // Navigate to booking history page
    // In a real app, this would use React Router
    window.location.href = '/booking-history';
  };

  // Helper function to get payment status display
  const getPaymentStatusDisplay = (status?: string) => {
    switch (status) {
      case 'pending':
        return {
          text: 'Chờ thanh toán',
          className: 'text-orange-600 font-medium'
        };
      case 'confirmed':
      case 'paid':
        return {
          text: 'Đã thanh toán',
          className: 'text-green-600 font-medium'
        };
      default:
        return {
          text: 'Đã xác nhận',
          className: 'text-green-600 font-medium'
        };
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Success Header with Connection Status */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Đặt sân thành công!</h2>
        <p className="text-gray-600">Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi</p>
        
        {/* Connection Status Indicator */}
        <div className="mt-3 flex items-center justify-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full text-xs text-green-700">
              <Wifi className="w-3 h-3" />
              <span>Cập nhật trực tiếp</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 rounded-full text-xs text-yellow-700">
              <WifiOff className="w-3 h-3" />
              <span>Kiểm tra thủ công</span>
            </div>
          )}
          {bookingStatus?.isSubscribed && (
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded-full text-xs text-blue-700">
              <span>Đang theo dõi</span>
            </div>
          )}
        </div>
        
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">
            Mã đặt sân: <span className="font-mono text-lg">{bookingId}</span>
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Booking Details */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Chi tiết đặt sân
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Ngày:</span>
              </div>
              <p className="font-medium">{formatDate(selectedDate)}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Sân bóng:</span>
              </div>
              <p className="font-medium">{fieldData?.name || 'Tên sân không có'}</p>
              <p className="text-sm text-gray-600">
                {fieldData?.location?.address_text && `${fieldData.location.address_text}, `}
                {fieldData?.location?.district && `${fieldData.location.district}, `}
                {fieldData?.location?.city || 'Địa chỉ không có'}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Sân và giờ đã đặt:</span>
            </div>
            
            <div className="space-y-3">
              {Object.entries(fieldSelections).map(([fieldId, data]) => (
                <div key={fieldId} className="bg-white rounded-lg p-3 border border-green-200">
                  <div className="mb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-800">{data.subfieldName}</p>
                        <p className="text-sm text-gray-600">{data.displayType}</p>
                        <p className="text-sm text-green-600 font-medium">{data.count} khung giờ</p>
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

        {/* Customer Information */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Thông tin liên hệ
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Họ tên:</span>
              </div>
              <p className="font-medium">{customerInfo?.fullName || "Không có thông tin"}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <Mail className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Email:</span>
              </div>
              <p className="font-medium">{customerInfo?.email || "Không có thông tin"}</p>
            </div>
            
            {customerInfo?.note && (
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Ghi chú:</span>
                </div>
                <p className="font-medium bg-white p-2 rounded border border-blue-100">{customerInfo.note}</p>
              </div>
            )}
          </div>
          
          {/* Save booking confirmation to localStorage */}
          <div className="hidden">
            {(() => {
              // Store booking confirmation data for future reference
              const bookingData = {
                id: bookingId,
                date: formatDate(selectedDate),
                fieldName: fieldData?.name || 'Tên sân không có',
                slots: selectedSlots || [],
                customerInfo: customerInfo,
                totalAmount: totalAmount
              };
              
              // Store in localStorage
              try {
                const existingBookings = localStorage.getItem('recentBookings');
                let bookingsArray = existingBookings ? JSON.parse(existingBookings) : [];
                
                // Add new booking to start of array
                bookingsArray = [bookingData, ...bookingsArray].slice(0, 5); // Keep only 5 most recent
                
                localStorage.setItem('recentBookings', JSON.stringify(bookingsArray));
              } catch (e) {
                console.error('Error saving booking to localStorage', e);
              }
              
              return null; // This is just for side effects
            })()}
          </div>
        </div>

        {/* Booking Summary */}
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-green-800">Đặt sân thành công</h3>
          </div>
          
          {/* Payment pending notification with enhanced WebSocket status */}
          {(currentPaymentStatus === 'payment_pending' || currentPaymentStatus === 'pending') && (
            <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-400 mb-4 shadow-md">
              <div className="flex items-start gap-3">
                <RefreshCw className="w-6 h-6 text-yellow-600 mt-0.5 animate-pulse" />
                <div className="flex-1">
                  <h4 className="text-yellow-800 font-medium mb-2 text-lg">Đang chờ xác nhận thanh toán</h4>
                  <p className="text-sm text-yellow-700 mb-3">
                    {isConnected 
                      ? 'Hệ thống đang theo dõi trạng thái thanh toán và sẽ tự động cập nhật khi có thay đổi.' 
                      : 'Giao dịch của bạn đang được xử lý. Hệ thống sẽ tự động cập nhật trạng thái thanh toán.'
                    }
                  </p>
                  {globalError && (
                    <p className="text-xs text-red-600 mb-2">
                      Lỗi kết nối: {globalError}
                    </p>
                  )}
                  <p className="text-xs text-yellow-600 mb-3">
                    {isConnected 
                      ? 'Nếu bạn đã thanh toán nhưng trạng thái chưa được cập nhật, vui lòng nhấn nút bên dưới để kiểm tra thủ công.'
                      : 'Nếu bạn đã thanh toán nhưng trạng thái chưa được cập nhật, vui lòng nhấn nút bên dưới.'
                    }
                  </p>
                  <Button
                    onClick={syncPaymentStatus}
                    disabled={syncing || bookingStatus?.syncInProgress}
                    size="lg"
                    className={`w-full flex items-center justify-center gap-2 ${syncing || bookingStatus?.syncInProgress ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} text-white py-3 font-medium text-base`}
                  >
                    {syncing || bookingStatus?.syncInProgress ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Đang kiểm tra...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-5 h-5" />
                        Kiểm tra trạng thái thanh toán ngay
                      </>
                    )}
                  </Button>
                  
                  {bookingStatus?.lastUpdated && (
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Lần kiểm tra cuối: {new Date(bookingStatus.lastUpdated).toLocaleString('vi-VN')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Tổng số giờ:</span>
              <span>{selectedSlots.length} giờ</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-green-600">
              <span>Tổng giá trị:</span>
              <span>{formatCurrencyValue(totalAmount)}đ</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Trạng thái:</span>
              <span className={getPaymentStatusDisplay(currentPaymentStatus).className}>
                {getPaymentStatusDisplay(currentPaymentStatus).text}
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Thời gian đặt:</span>
              <span>{new Date().toLocaleString('vi-VN')}</span>
            </div>
            
            {/* Payment status messages with enhanced WebSocket integration */}
            {currentPaymentStatus === 'payment_pending' && (
              <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700 mt-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {isConnected 
                  ? 'Đang theo dõi trạng thái thanh toán trong thời gian thực. Hệ thống sẽ tự động cập nhật khi có thay đổi.'
                  : 'Hệ thống đang xác nhận giao dịch với ngân hàng. Trạng thái thanh toán sẽ được cập nhật trong vài phút.'
                }
              </div>
            )}
            
            {currentPaymentStatus === 'paid' && (
              <div className="space-y-3 mt-2">
                <div className="flex items-center gap-2 p-3 bg-green-50 border-2 border-green-300 rounded text-sm text-green-700 shadow-sm">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Thanh toán đã được xác nhận. Cảm ơn bạn đã đặt sân!</span>
                </div>
                
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="font-medium">Email xác nhận đã được gửi</p>
                    <p className="text-xs">Bạn sẽ nhận được email xác nhận đặt sân và chủ sân cũng được thông báo về đơn đặt mới của bạn.</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* WebSocket subscription status */}
            {bookingStatus?.syncInProgress && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700 mt-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang đồng bộ trạng thái...
              </div>
            )}
            
            {/* Sync status messages */}
            {syncing && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700 mt-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {isConnected 
                  ? 'Đang đồng bộ trạng thái qua kết nối trực tiếp...'
                  : 'Đang kiểm tra trạng thái thanh toán với ngân hàng...'
                }
              </div>
            )}
            
            {/* Error display */}
            {bookingStatus?.error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 mt-2">
                Lỗi: {bookingStatus.error}
              </div>
            )}
            
            {syncSuccess && (
              <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                <CheckCircle className="w-4 h-4" />
                {syncSuccess}
              </div>
            )}
            
            {syncError && (
              <div className="p-2 bg-orange-50 border border-orange-200 rounded text-sm text-orange-700">
                Lưu ý: {syncError}. Bạn có thể thử lại sau.
              </div>
            )}
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-800 mb-2">Lưu ý quan trọng:</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Vui lòng có mặt tại sân đúng giờ đã đặt</li>
            <li>• Mang theo giấy tờ tùy thân để xác nhận</li>
            <li>• Liên hệ hotline 0123-456-789 nếu cần hỗ trợ</li>
            <li>• Thông tin chi tiết đã được gửi về email của bạn</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button
            variant="outline"
            onClick={handleDownloadReceipt}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Tải hóa đơn
          </Button>
          
          <Button
            variant="outline"
            onClick={handleViewBookingHistory}
            className="flex-1 flex items-center justify-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <History className="w-4 h-4" />
            Xem lịch sử đặt sân
          </Button>
          
          <Button
            onClick={onNewBooking}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Đặt sân mới
          </Button>
          
          <Button
            variant="outline"
            onClick={onGoHome}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Về trang chủ
          </Button>
        </div>
      </div>
    </div>
  );
}
