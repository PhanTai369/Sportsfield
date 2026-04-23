import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { BookingSteps } from './BookingSteps';
import { BookingModule } from './BookingModule';
import { BookingReview } from './BookingReview';
import { BookingConfirmation } from './BookingConfirmation';
import { PerformanceMonitor } from './PerformanceMonitor';
import { parseSlotId } from '../../utils/slotFormatter';
import { paymentService } from '../../services/payment.service';
import { showToast } from '../../utils/toast';
import Navbar from '../home/navbar';
import Footer from '../home/footer';
import { API_BASE_URL } from '../../config/api';

// Define CustomerInfo interface locally since we still need it for other components
export interface CustomerInfo {
  fullName: string;
  email: string;
  note?: string;
}

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

interface Promotion {
  id: string;
  title: string;
  discount_percent: number;
  valid_from: string;
  valid_to: string;
  field_id: string;
  field: {
    id: string;
    name: string;
    price_per_hour: number;
  };
}

interface BookingProps {
  showConfirmation?: boolean;
}

const Booking: React.FC<BookingProps> = ({ showConfirmation = false }) => {
  const { fieldId } = useParams<{ fieldId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<number>(showConfirmation ? 4 : 1);
  const [selectedDate, setSelectedDate] = useState<number>(new Date().getDate());
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [originalAmount, setOriginalAmount] = useState<number>(0);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [bookingId, setBookingId] = useState<string>(searchParams.get('booking_id') || '');
  const [fieldData, setFieldData] = useState<FieldData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [bookingData, setBookingData] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0); // Add refresh trigger state

  // State for pricing rules
  const [pricingRules, setPricingRules] = useState<any[]>([]);

  // Load field data and user data when component mounts
  useEffect(() => {
    const fetchFieldData = async () => {
      // Skip field data fetch if we're in confirmation mode - field data will come from booking details
      if (showConfirmation) {
        setLoading(false); // Set loading to false since we're not fetching field data here
        return;
      }
      
      if (!fieldId) {
        setError('Không tìm thấy ID sân bóng. Vui lòng chọn sân từ danh sách.');
        setLoading(false);
        return;
      }
      
      // Validate fieldId format (should be UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(fieldId)) {
        console.error('Invalid field ID format:', fieldId);
        setError(`ID sân không hợp lệ: "${fieldId}". Vui lòng truy cập từ danh sách sân.`);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        console.log('Fetching field data for ID:', fieldId);
        const response = await axios.get(`${API_BASE_URL}/fields/${fieldId}`);
        
        if (response.data.success) {
          const fieldData = response.data.data;
          // Convert price_per_hour from string to number if needed
          if (typeof fieldData.price_per_hour === 'string') {
            fieldData.price_per_hour = parseFloat(fieldData.price_per_hour);
          }
          setFieldData(fieldData);
        } else {
          console.error('API returned success:false');
          setError('Không thể tải thông tin sân bóng');
        }
      } catch (err: any) {
        console.error('Error fetching field:', err);
        console.error('Error details:', {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data
        });
        setError('Không thể tải thông tin sân bóng');
      } finally {
        setLoading(false);
      }
    };

    fetchFieldData();
  }, [fieldId, showConfirmation]);

  // Load booking data from session if showing confirmation
  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!showConfirmation) {
        return;
      }
      
      // Check for session_id or booking_id parameter
      const sessionId = searchParams.get('session_id');
      const bookingIdParam = searchParams.get('booking_id');
      
      if (!sessionId && !bookingIdParam) {
        setError("Không tìm thấy mã đặt sân hoặc mã phiên thanh toán để hiển thị xác nhận.");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        let bookingDetails;
        
        // If we have session_id, use that to get booking details
        if (sessionId) {
          console.log('Fetching booking details by session ID:', sessionId);
          try {
            bookingDetails = await paymentService.getBookingBySessionId(sessionId);
            if (bookingDetails && bookingDetails.id) {
              setBookingId(bookingDetails.id);
            }
          } catch (sessionError) {
            console.error('Error fetching booking by session ID:', sessionError);
            // Fall back to booking ID if session ID fails
            if (bookingIdParam) {
              console.log('Falling back to booking ID:', bookingIdParam);
              bookingDetails = await paymentService.getBookingById(bookingIdParam);
              setBookingId(bookingIdParam);
            }
          }
        }
        // If we don't have session_id or it failed, use booking_id
        else if (bookingIdParam) {
          console.log('Fetching booking details by booking ID:', bookingIdParam);
          bookingDetails = await paymentService.getBookingById(bookingIdParam);
          setBookingId(bookingIdParam);
        }
        
        console.log('Booking details fetched:', bookingDetails);
        console.log('Booking details type:', typeof bookingDetails);
        console.log('Booking details keys:', bookingDetails ? Object.keys(bookingDetails) : 'null');

        if (!bookingDetails) {
          console.error('Booking details is null/undefined');
          setError('Không thể tìm thấy thông tin đặt sân');
          return;
        }

        setBookingData(bookingDetails);

        const slots: string[] = [];
        if (bookingDetails.timeSlots && Array.isArray(bookingDetails.timeSlots)) {
          bookingDetails.timeSlots.forEach((slot: any) => {
            const startTime = slot.startTime?.substring(0, 5);
            const subfieldId = slot.sub_field_id || bookingDetails.field?.id;
            if (startTime && subfieldId) {
              slots.push(`${subfieldId}-${startTime}`);
            }
          });
        }
        setSelectedSlots(slots);

        if (bookingDetails.totalAmount) {
          setTotalAmount(parseFloat(bookingDetails.totalAmount.toString()));
        }
        setBookingId(bookingDetails.id);

        if (bookingDetails.bookingDate) {
          const bookingDateParts = bookingDetails.bookingDate.split('-');
          if (bookingDateParts.length === 3) {
            setSelectedDate(parseInt(bookingDateParts[2]));
          }
        }

        if (bookingDetails.customerInfo) {
          setCustomerInfo({
            fullName: bookingDetails.customerInfo.name,
            email: bookingDetails.customerInfo.email,
            note: bookingDetails.customerInfo.notes,
          });
        }

        if (bookingDetails.field) {
          console.log('Field data found:', bookingDetails.field);
          console.log('Field data keys:', Object.keys(bookingDetails.field));
          
          // Now that backend returns complete field data, we can safely map it
          const fieldFromBooking = bookingDetails.field;
          console.log('Field location:', fieldFromBooking.location);
          console.log('Field owner:', fieldFromBooking.owner);
          
          const mappedFieldData: FieldData = {
            id: fieldFromBooking.id,
            name: fieldFromBooking.name,
            description: fieldFromBooking.description,
            price_per_hour: fieldFromBooking.price_per_hour,
            images1: fieldFromBooking.images1,
            location: {
              address_text: fieldFromBooking.location?.address_text || '',
              city: fieldFromBooking.location?.city || '',
              district: fieldFromBooking.location?.district || '',
              ward: fieldFromBooking.location?.ward || '',
            },
            owner: {
              id: fieldFromBooking.owner?.id || '',
              name: fieldFromBooking.owner?.name || '',
            },
            subfields: fieldFromBooking.subfields || [],
          };
          console.log('Mapped field data:', mappedFieldData);
          setFieldData(mappedFieldData);
        } else {
          console.warn('Field data (bookingDetails.field) is missing from getBookingById response.');
          console.log('Available booking details keys:', Object.keys(bookingDetails));
          
          // Try to extract field data from other sources if main field object is missing
          let fallbackFieldData = null;
          
          // Check if field data exists in a different structure
          if (bookingDetails.fieldName || bookingDetails.fieldId) {
            console.log('Attempting to create fallback field data from available booking info');
            fallbackFieldData = {
              id: bookingDetails.fieldId || bookingId, // Use booking ID as fallback
              name: bookingDetails.fieldName || 'Sân bóng',
              description: bookingDetails.fieldDescription || '',
              price_per_hour: bookingDetails.pricePerHour || 0,
              images1: bookingDetails.fieldImage || '',
              location: {
                address_text: bookingDetails.fieldLocation || '',
                city: bookingDetails.city || '',
                district: bookingDetails.district || '',
                ward: bookingDetails.ward || '',
              },
              owner: {
                id: bookingDetails.ownerId || '',
                name: bookingDetails.ownerName || '',
              },
              subfields: bookingDetails.subfields || [],
            };
            
            console.log('Created fallback field data:', fallbackFieldData);
            setFieldData(fallbackFieldData);
          } else {
            console.warn('Cannot create complete fallback field data - using minimal data');
            console.log('Available booking details:', bookingDetails);
            
            // Create a basic field data with what we have to allow the page to function
            fallbackFieldData = {
              id: bookingId, // Use booking ID as field ID fallback
              name: 'Sân bóng',
              description: '',
              price_per_hour: totalAmount && selectedSlots.length > 0 ? Math.round(totalAmount / selectedSlots.length) : 0,
              images1: '',
              location: {
                address_text: '',
                city: '',
                district: '',
                ward: '',
              },
              owner: {
                id: '',
                name: '',
              },
              subfields: [],
            };
            
            console.log('Created basic field data to prevent page failure:', fallbackFieldData);
            setFieldData(fallbackFieldData);
          }
        }
      } catch (err: any) {
        console.error('Error fetching booking details for confirmation:', err);
        setError('Lỗi tải thông tin đặt sân.');
      } finally {
        setLoading(false);
      }
    };

    if (showConfirmation) {
      fetchBookingDetails();
    }
  }, [showConfirmation, bookingId, searchParams]);

  // Trigger refresh when returning from payment or when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && currentStep === 1) {
        console.log('Page became visible - triggering TimeSlotGrid refresh');
        setRefreshTrigger(prev => prev + 1);
      }
    };

    const handleWindowFocus = () => {
      if (currentStep === 1) {
        console.log('Window focused - triggering TimeSlotGrid refresh');
        setRefreshTrigger(prev => prev + 1);
      }
    };

    // Check URL parameters for payment return indicators
    const hasPaymentParams = searchParams.get('session_id') || 
                            searchParams.get('payment_intent') || 
                            searchParams.get('booking_id');
    
    if (hasPaymentParams && currentStep === 1) {
      console.log('Detected return from payment - triggering immediate refresh');
      setRefreshTrigger(prev => prev + 1);
    }

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [currentStep, searchParams]);

  // Load user data for auto-fill customer info
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        console.log('Fetching user data...');
        // Get token from localStorage
        const token = localStorage.getItem('token');
        
        // Use the token in the Authorization header if available
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        const response = await axios.get(`${API_BASE_URL}/auth/me`, {
          withCredentials: true,
          headers
        });
        
        if (response.data && response.data.success && response.data.user) {
          const user = response.data.user;
          setUserData(user);
          
          console.log('User data fetched successfully:', user);
          
          // Auto-populate customer info from user data
          const customerInfoFromAPI = {
            fullName: user.name || '',
            email: user.email || '',
            note: ''
          };
          
          setCustomerInfo(customerInfoFromAPI);
          
          // Save in localStorage for persistence
          localStorage.setItem('currentUserInfo', JSON.stringify({
            fullName: user.name || '',
            email: user.email || '',
          }));
          
          return; // Exit early if API call succeeds
        } else {
          console.log('User data response not successful or empty');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
      
      // If we get here, API call failed or returned invalid data - try localStorage
      tryLoadFromLocalStorage();
    };

    const tryLoadFromLocalStorage = () => {
      // Try to get from localStorage first
      const savedInfo = localStorage.getItem('currentUserInfo');
      if (savedInfo) {
        try {
          const parsedInfo = JSON.parse(savedInfo);
          console.log('Using saved user info from localStorage:', parsedInfo);
          
          // Validate the data before using it
          const fullName = parsedInfo.fullName || '';
          const email = parsedInfo.email || '';
          
          // Only use localStorage data if it appears valid
          if (fullName.trim().length >= 2 && email.includes('@')) {
            setCustomerInfo({
              fullName,
              email,
              note: ''
            });
            return; // Exit early if we found valid data
          } else {
            console.log('Saved user info is incomplete, initializing empty');
          }
        } catch (e) {
          console.error('Error parsing saved user info:', e);
        }
      }
      
      // If we get here, localStorage data was invalid or not found
      initializeEmptyCustomerInfo();
    };

    const initializeEmptyCustomerInfo = () => {
      console.log('Initializing empty customer info');
      // If user not logged in, set empty customer info
      setCustomerInfo({
        fullName: '',
        email: '',
        note: ''
      });
    };

    fetchUserData();
  }, []);
  
  // Field prices for calculation - fixed to work with subfield UUIDs
  const getFieldPrice = (subFieldId: string): number => {
    // First priority: use the field's price_per_hour if available
    if (fieldData?.price_per_hour) {
      return fieldData.price_per_hour;
    }
    
    // Second priority: find the subfield and get price based on field_type
    if (fieldData?.subfields) {
      const subfield = fieldData.subfields.find(sf => sf.id === subFieldId);
      if (subfield) {        // Map field_type to prices
        const pricesByType: Record<string, number> = {
          '5vs5': 300000,   // 5-a-side football
          '7vs7': 400000,  // 7-a-side football  
        };
        return pricesByType[subfield.field_type] || 300000;
      }
    }
    
    // Fallback: default price
    return 300000;
  };

  // Load pricing rules when fieldData changes
  useEffect(() => {
    const loadPricingRules = async () => {
      if (!fieldData?.id) return;
      
      try {
        const response = await axios.get(`${API_BASE_URL}/pricing-rules/field/${fieldData.id}`);
        if (response.data.success) {
          setPricingRules(response.data.data || []);
        }
      } catch (error) {
        console.error('Error loading pricing rules:', error);
        setPricingRules([]);
      }
    };

    loadPricingRules();
  }, [fieldData?.id]);

  // Calculate price with peak hour multiplier
  const calculatePriceWithPeakHour = (basePrice: number, timeSlot: string): number => {
    if (pricingRules.length === 0) return basePrice;

    const hour = parseInt(timeSlot.split(':')[0]);
    const applicableRule = pricingRules.find(
      rule => hour >= rule.from_hour && hour < rule.to_hour
    );

    const multiplier = applicableRule ? applicableRule.multiplier : 1.0;
    return Math.round(basePrice * multiplier);
  };

  // Calculate total amount with promotion discount
  const calculateTotalWithPromotion = (originalTotal: number, promotion: Promotion | null): number => {
    if (!promotion) return originalTotal;
    const discountAmount = originalTotal * (promotion.discount_percent / 100);
    return Math.round(originalTotal - discountAmount);
  };

  // Recalculate total amount when promotion changes
  useEffect(() => {
    if (originalAmount > 0) {
      const newTotal = calculateTotalWithPromotion(originalAmount, selectedPromotion);
      setTotalAmount(newTotal);
    }
  }, [selectedPromotion, originalAmount]);

  // Handle promotion selection
  const handlePromotionChange = (promotion: Promotion | null) => {
    setSelectedPromotion(promotion);
  };

  const handleDateSelect = (date: number) => {
    setSelectedDate(date);
  };

  const handleSlotSelect = (fieldId: string, time: string) => {
    const slotId = `${fieldId}-${time}`;
    const baseFieldPrice = getFieldPrice(fieldId); // fieldId is actually subFieldId (UUID)
    const finalPrice = calculatePriceWithPeakHour(baseFieldPrice, time);
    
    if (selectedSlots.includes(slotId)) {
      // Remove slot
      setSelectedSlots(selectedSlots.filter(slot => slot !== slotId));
      const newOriginalAmount = originalAmount - finalPrice;
      setOriginalAmount(newOriginalAmount);
      const newTotalAmount = calculateTotalWithPromotion(newOriginalAmount, selectedPromotion);
      setTotalAmount(newTotalAmount);
    } else {
      // Add slot
      setSelectedSlots([...selectedSlots, slotId]);
      const newOriginalAmount = originalAmount + finalPrice;
      setOriginalAmount(newOriginalAmount);
      const newTotalAmount = calculateTotalWithPromotion(newOriginalAmount, selectedPromotion);
      setTotalAmount(newTotalAmount);
    }
  };

  const handleContinue = () => {
    if (currentStep === 1 && selectedSlots.length > 0) {
      // Skip customer info step, go directly to review
      setCurrentStep(2);
    }
  };

  const handleReviewContinue = async () => {
    // Go directly to Stripe Checkout without going through the StripePayment component
    if (!customerInfo || !fieldData) return;

    try {
      setLoading(true);
      
      // Transform the selected slots to the format expected by the API
      const timeSlots = selectedSlots.map(slotId => {
        const { subfieldId, timeString } = parseSlotId(slotId);
        
        console.log('🔧 DEBUG: Processing slot:', slotId);
        console.log('🔧 DEBUG: Parsed subfieldId:', subfieldId);
        console.log('🔧 DEBUG: Parsed timeString:', timeString);
        
        if (!subfieldId || !timeString) {
          console.error('❌ Invalid slot ID format:', slotId, { subfieldId, timeString });
          throw new Error(`Invalid slot ID format: ${slotId}`);
        }
        
        // Validate time string format
        const timeRegex = /^\d{1,2}:\d{2}$/;
        if (!timeRegex.test(timeString)) {
          console.error('❌ Invalid time format:', timeString);
          throw new Error(`Invalid time format: ${timeString}`);
        }
        
        // Calculate end time (add 1 hour to start time)
        const [hours, minutes] = timeString.split(':').map(Number);
        const endHours = (hours + 1) % 24;
        const end_time = `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        
        console.log('🔧 DEBUG: Calculated end_time:', end_time);
        
        const timeSlot = {
          sub_field_id: subfieldId,
          start_time: timeString,
          end_time
        };
        
        console.log('🔧 DEBUG: Final timeSlot:', timeSlot);
        
        return timeSlot;
      });
      
      console.log('🔧 DEBUG: All processed timeSlots:', timeSlots);

      // Get current month and year for booking date
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const bookingDate = `${year}-${(month + 1).toString().padStart(2, '0')}-${selectedDate.toString().padStart(2, '0')}`;

      const bookingPaymentData = {
        fieldId: fieldData.id,
        subFieldIds: Array.from(new Set(timeSlots.map(slot => slot.sub_field_id))),
        bookingDate,
        timeSlots,
        totalAmount,
        customerInfo: {
          name: customerInfo.fullName || '',
          email: customerInfo.email || '',
          notes: customerInfo.note || ''
        },
        currency: 'vnd',
        return_url: `${window.location.origin}/booking/confirmation`,
        cancel_url: `${window.location.origin}/payment/cancel`
      };

      // Validate customer info before sending
      if (!bookingPaymentData.customerInfo.name || !bookingPaymentData.customerInfo.email) {
        throw new Error('Vui lòng nhập đầy đủ thông tin khách hàng');
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingPaymentData.customerInfo.email)) {
        throw new Error('Email không hợp lệ');
      }

      console.log('📤 Sending booking request:', bookingPaymentData);
      console.log('🔍 DEBUG - Detailed validation:');
      console.log('  - fieldId:', bookingPaymentData.fieldId, 'type:', typeof bookingPaymentData.fieldId);
      console.log('  - subFieldIds:', bookingPaymentData.subFieldIds, 'length:', bookingPaymentData.subFieldIds.length);
      
      // Validate subFieldIds
      bookingPaymentData.subFieldIds.forEach((id, index) => {
        console.log(`    [${index}] ${id} - type: ${typeof id}, length: ${id.length}`);
      });
      
      console.log('  - bookingDate:', bookingPaymentData.bookingDate, 'type:', typeof bookingPaymentData.bookingDate);
      console.log('  - timeSlots:', bookingPaymentData.timeSlots, 'length:', bookingPaymentData.timeSlots.length);
      
      // Validate timeSlots 
      bookingPaymentData.timeSlots.forEach((slot, index) => {
        console.log(`    [${index}] sub_field_id: ${slot.sub_field_id}, start: ${slot.start_time}, end: ${slot.end_time}`);
      });
      
      console.log('  - totalAmount:', bookingPaymentData.totalAmount, 'type:', typeof bookingPaymentData.totalAmount);
      console.log('  - customerInfo:', bookingPaymentData.customerInfo);
      console.log('  - return_url:', bookingPaymentData.return_url);
      console.log('  - cancel_url:', bookingPaymentData.cancel_url);

      const result = await paymentService.createBookingWithPayment(bookingPaymentData);
      
      console.log('✅ Booking API response:', result);
      
      setBookingId(result.booking_id);
      
      // Hiển thị thông báo cảnh báo qua toast
      showToast.warning('Sân chưa được đặt!', 'Vui lòng hoàn tất thanh toán để khóa thời gian...');
      
      // Auto redirect to Stripe Checkout after successful booking creation
      console.log('🔄 Auto redirecting to Stripe Checkout:', result.checkout_url);
      setTimeout(() => {
        window.location.href = result.checkout_url;
      }, 1500);
      
    } catch (err: any) {
      console.error('❌ Error creating booking and payment:', err);
      
      // Handle different error types with more specific messaging
      let errorMessage = err.message || 'Đã có lỗi xảy ra khi tạo booking.';
      let shouldRefresh = false;
      
      if (err.response?.status === 409) {
        const responseMessage = err.response?.data?.message || '';
        
        if (responseMessage.includes('cùng lúc') || responseMessage.includes('race condition') || responseMessage.includes('Database prevented')) {
          errorMessage = '⚠️ Một người dùng khác vừa đặt khung giờ này cùng lúc với bạn. Vui lòng chọn khung giờ khác.';
          shouldRefresh = true;
        } else if (responseMessage.includes('already booked') || responseMessage.includes('đã được đặt')) {
          errorMessage = '❌ Khung giờ bạn chọn đã được đặt. Vui lòng chọn khung giờ khác.';
          shouldRefresh = true;
        } else if (responseMessage.includes('already in progress') || responseMessage.includes('đang được xử lý')) {
          errorMessage = '🔄 Đã có một giao dịch đang được xử lý cho khung giờ này. Vui lòng đợi hoặc chọn khung giờ khác.';
        } else if (responseMessage.includes('Hệ thống đang xử lý nhiều yêu cầu')) {
          errorMessage = '🔄 Hệ thống đang xử lý nhiều yêu cầu đồng thời. Vui lòng thử lại sau vài giây.';
        } else {
          errorMessage = `❌ ${responseMessage}`;
          shouldRefresh = true;
        }
      } else if (err.response?.status === 400) {
        errorMessage = '❌ Dữ liệu đặt sân không hợp lệ. Vui lòng kiểm tra lại thông tin.';
      } else if (err.response?.status === 401) {
        errorMessage = '🔐 Bạn cần đăng nhập để đặt sân.';
      } else if (err.response?.status >= 500) {
        errorMessage = '🛠️ Lỗi hệ thống. Vui lòng thử lại sau.';
      }
      
      // Show error message with better styling
      const errorDialog = document.createElement('div');
      errorDialog.innerHTML = `
        <div style="position: fixed; top: 20px; left: 50%; transform: translateX(-50%); 
                    background: #fee2e2; color: #dc2626; padding: 20px; border-radius: 12px; 
                    box-shadow: 0 10px 25px rgba(0,0,0,0.1); z-index: 9999; text-align: center;
                    border: 2px solid #f87171; max-width: 500px; font-family: system-ui;">
          <p style="margin: 0; font-weight: 500; font-size: 16px; line-height: 1.5;">${errorMessage}</p>
          ${shouldRefresh ? '<p style="margin: 10px 0 0 0; font-size: 14px; color: #7f1d1d;">Danh sách sân sẽ được cập nhật...</p>' : ''}
        </div>
      `;
      document.body.appendChild(errorDialog);
      
      // Auto remove error message after 5 seconds
      setTimeout(() => {
        if (errorDialog && errorDialog.parentNode) {
          errorDialog.parentNode.removeChild(errorDialog);
        }
      }, 5000);
      
      // If this was a conflict, refresh the time slot grid to show updated availability
      if (shouldRefresh) {
        console.log('🔄 Refreshing time slot grid due to booking conflict');
        setRefreshTrigger(prev => prev + 1);
      }
      
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (bookingIdFromPayment: string) => {
    // Set the booking ID received from payment
    setBookingId(bookingIdFromPayment);
    
    // Go to confirmation step
    setCurrentStep(4);
  };

  const handleNewBooking = () => {
    // Reset all state
    setCurrentStep(1);
    setSelectedDate(new Date().getDate());
    setSelectedSlots([]);
    setTotalAmount(0);
    setOriginalAmount(0);
    setSelectedPromotion(null);
    setCustomerInfo(null);
    setBookingId('');
    setBookingData(null);
    
    // Trigger refresh of TimeSlotGrid to show updated availability
    console.log('New booking initiated - triggering TimeSlotGrid refresh');
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCustomerInfoUpdate = (updatedCustomerInfo: CustomerInfo) => {
    setCustomerInfo(updatedCustomerInfo);
    
    // Save to localStorage for persistence
    localStorage.setItem('currentUserInfo', JSON.stringify({
      fullName: updatedCustomerInfo.fullName,
      email: updatedCustomerInfo.email,
    }));
  };

  const handleGoHome = () => {
    navigate('/');
  };

  // Handle booking updates from sync operations
  const handleBookingUpdate = (updatedBooking: any) => {
    console.log('Booking updated:', updatedBooking);
    setBookingData(updatedBooking);
    
    // Update other states if needed
    if (updatedBooking.totalAmount) {
      setTotalAmount(parseFloat(updatedBooking.totalAmount.toString()));
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <BookingModule
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            selectedSlots={selectedSlots}
            onSlotSelect={handleSlotSelect}
            totalAmount={totalAmount}
            originalAmount={originalAmount}
            onContinue={handleContinue}
            fieldId={fieldId}
            fieldData={fieldData}
            refreshTrigger={refreshTrigger}
            selectedPromotion={selectedPromotion}
            onPromotionChange={handlePromotionChange}
          />
        );
      case 2:
        return customerInfo && fieldData ? (
          <BookingReview
            selectedDate={selectedDate}
            selectedSlots={selectedSlots}
            totalAmount={totalAmount}
            customerInfo={customerInfo}
            fieldData={fieldData}
            onContinue={handleReviewContinue}
            onBack={handleBack}
            onCustomerInfoUpdate={handleCustomerInfoUpdate}
          />
        ) : null;
      // We no longer need case 3 as we bypass StripePayment
      // This will be kept for backward compatibility but won't be used
      case 3:
        return (
          <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Đang xử lý thanh toán...</h3>
              <p className="text-gray-600 text-center">Vui lòng chờ trong giây lát.</p>
            </div>
          </div>
        );
      case 4:
        // Show loading state while fetching booking details for confirmation
        if (showConfirmation && loading) {
          return (
            <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
              <div className="flex flex-col items-center justify-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Đang tải thông tin đặt sân...</h3>
                <p className="text-gray-600 text-center">Vui lòng chờ trong giây lát.</p>
              </div>
            </div>
          );
        }
        
        // Always render BookingConfirmation, let it handle missing data internally
        return (
          <BookingConfirmation
            selectedDate={selectedDate}
            selectedSlots={selectedSlots}
            totalAmount={totalAmount}
            customerInfo={customerInfo}
            fieldData={fieldData}
            bookingId={bookingId}
            onNewBooking={handleNewBooking}
            onGoHome={handleGoHome}
            paymentStatus={bookingData?.paymentStatus}
            onBookingUpdate={handleBookingUpdate}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Handle loading state */}
      {loading && (
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-24">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            <p className="mt-4 text-gray-600">Đang tải thông tin sân bóng...</p>
          </div>
        </div>
      )}

      {/* Handle error state */}
      {error && (
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-24">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <div className="text-red-600 mb-4">
                <i className="fas fa-exclamation-triangle text-3xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">Có lỗi xảy ra</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <button 
                onClick={() => navigate('/')}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
              >
                Quay về trang chủ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content - only show when data is loaded */}
      {!loading && !error && fieldData && (
        <>
          {/* Field info header */}
          <div className="bg-white border-b shadow-sm">
            <div className="container mx-auto px-4 py-6">
              <div className="flex items-start gap-4">
                <img 
                  src={fieldData.images1 || "https://via.placeholder.com/120x80"}
                  alt={fieldData.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h1 className="text-xl font-bold text-gray-900">{fieldData.name}</h1>
                  <p className="text-gray-600 text-sm mt-1">
                    {fieldData.location.address_text}, {fieldData.location.district}, {fieldData.location.city}
                  </p>
                  <p className="text-green-600 font-semibold mt-2">
                    {fieldData.price_per_hour?.toLocaleString('vi-VN')}đ/giờ
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Booking process */}
          <div className="container mx-auto px-4 py-8">
            {currentStep < 5 && <BookingSteps currentStep={currentStep} />}
            
            {/* Main content */}
            <div className="max-w-5xl mx-auto">
              {renderCurrentStep()}
            </div>
          </div>
        </>
      )}
      
      <Footer />
      <PerformanceMonitor />
    </div>
  );
};

export default Booking;
