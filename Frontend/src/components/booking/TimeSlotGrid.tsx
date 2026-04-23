import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '../ui/button';
import { RefreshCw, Info, AlertTriangle, Loader2, Check, Clock } from 'lucide-react';
import axios from 'axios';
import { timeslotService } from '../../services/timeslotService';
import { API_BASE_URL } from '../../config/api';

// Countdown Timer Component
const CountdownTimer = ({ expiresAt, onExpire }: { expiresAt: string; onExpire: () => void }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiryTime = new Date(expiresAt).getTime();
      const difference = expiryTime - now;
      
      if (difference <= 0) {
        onExpire();
        return 0;
      }
      
      return Math.floor(difference / 1000); // Convert to seconds
    };

    const updateTimer = () => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (timeLeft <= 0) return null;

  return (
    <div className="flex items-center gap-1 text-xs">
      <Clock className="h-3 w-3" />
      <span>{formatTime(timeLeft)}</span>
    </div>
  );
};

interface TimeSlotGridProps {
  selectedSlots: string[];
  onSlotSelect: (fieldId: string, time: string) => void;
  fieldId: string;
  selectedDate: number;
  refreshTrigger: number;
}

export function TimeSlotGrid({ selectedSlots, onSlotSelect, fieldId, selectedDate, refreshTrigger }: TimeSlotGridProps) {
  const [showPrices, setShowPrices] = useState(false);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [maintenanceSlots, setMaintenanceSlots] = useState<string[]>([]);
  const [paymentPendingSlots, setPaymentPendingSlots] = useState<{[key: string]: {expiresAt: string}}>({});
  const [loading, setLoading] = useState(false);
  const [subfields, setSubfields] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [pricingRules, setPricingRules] = useState<any[]>([]);

  // Real-time current time - updates every minute
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  // Load pricing rules when fieldId changes - DEPRECATED: Now loaded via fetchAvailability
  const loadPricingRules = useCallback(async () => {
    if (!fieldId) return;
    
    try {
      console.log('Loading pricing rules for field:', fieldId);
      const response = await axios.get(`${API_BASE_URL}/pricing-rules/field/${fieldId}`);
      if (response.data.success) {
        console.log('Loaded pricing rules:', response.data.data);
        setPricingRules(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading pricing rules:', error);
      setPricingRules([]);
    }
  }, [fieldId]);

  // REMOVED: Separate pricing rules loading to avoid race conditions
  // useEffect(() => {
  //   loadPricingRules();
  // }, [loadPricingRules]);

  // Calculate price with peak hour multiplier
  const calculatePriceWithPeakHour = useCallback((basePrice: number, timeSlot: string): number => {
    if (pricingRules.length === 0) return basePrice;

    const hour = parseInt(timeSlot.split(':')[0]);
    const applicableRule = pricingRules.find(
      rule => hour >= rule.from_hour && hour < rule.to_hour
    );

    const multiplier = applicableRule ? applicableRule.multiplier : 1.0;
    const finalPrice = Math.round(basePrice * multiplier);
    
    // Debug log for price calculation
    if (applicableRule) {
      console.log(`Price calculation for ${timeSlot}: base=${basePrice}, multiplier=${multiplier}, final=${finalPrice}`);
    }
    
    return finalPrice;
  }, [pricingRules]);

  // Check if time slot is in peak hour
  const isInPeakHour = useCallback((timeSlot: string): boolean => {
    if (pricingRules.length === 0) return false;

    const hour = parseInt(timeSlot.split(':')[0]);
    const applicableRule = pricingRules.find(
      rule => hour >= rule.from_hour && hour < rule.to_hour
    );

    return !!applicableRule && applicableRule.multiplier > 1.0;
  }, [pricingRules]);

  // Get peak hour multiplier for display
  const getPeakHourMultiplier = useCallback((timeSlot: string): number => {
    if (pricingRules.length === 0) return 1.0;

    const hour = parseInt(timeSlot.split(':')[0]);
    const applicableRule = pricingRules.find(
      rule => hour >= rule.from_hour && hour < rule.to_hour
    );

    return applicableRule ? applicableRule.multiplier : 1.0;
  }, [pricingRules]);

  // Generate time slots based on current time for today
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    const now = currentTime; // Use state currentTime for real-time updates
    const today = new Date().getDate();
    const isToday = selectedDate === today;
    
    // Start at 6:00 and end at 22:00
    let startHour = 5;
    const endHour = 22;
    
    if (isToday) {
      // For today, only show slots that haven't started yet
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // If current time is past the start of a slot, don't show it
      // E.g., if it's 16:36, slot 16:00-17:00 has already started, so don't show it
      // Show slots from 17:00 onwards
      startHour = Math.max(6, currentHour + 1);
      
      // Debug logging
      console.log(`Current time: ${currentHour}:${currentMinute.toString().padStart(2, '0')}, Start hour: ${startHour}`);
      
      // If all slots for today have passed, return empty array
      if (startHour > endHour) {
        return [];
      }
    }
    
    for (let hour = startHour; hour <= endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    
    console.log('Generated time slots:', slots);
    return slots;
  }, [selectedDate, currentTime]);

  const fields = [
    { id: "5A", name: "Sân 5A", players: "5 người", price: 300000 },
    { id: "5B", name: "Sân 5B", players: "5 người", price: 300000 },
    { id: "7A", name: "Sân 7A", players: "7 người", price: 400000 },
    { id: "7B", name: "Sân 7B", players: "7 người", price: 400000 },
    { id: "5C", name: "Sân 5C", players: "5 người", price: 300000 },
    { id: "5D", name: "Sân 5D", players: "5 người", price: 300000 },
  ];

  // Load subfields from API
  const fetchSubfields = useCallback(async () => {
    try {
      if (fieldId) {
        const response = await timeslotService.getSubFields(fieldId);
        console.log('Subfields API Response:', response);
        
        const mappedSubfields = response.map((subfield: any) => ({
          id: subfield.id,
          name: subfield.name,
          players: getPlayersFromFieldType(subfield.fieldType),
          price: getPriceFromFieldType(subfield.fieldType)
        }));
        
        console.log('Mapped subfields:', mappedSubfields);
        setSubfields(mappedSubfields);
      }
    } catch (error) {
      console.error('Error fetching subfields:', error);
      setError('Không thể tải thông tin sân. Sử dụng dữ liệu mặc định.');
      // Fallback to hardcoded fields if API fails
      setSubfields(fields);
    }
  }, [fieldId]);

  // Load subfields when fieldId changes
  useEffect(() => {
    fetchSubfields();
  }, [fetchSubfields]);

  const getPlayersFromFieldType = (fieldType: string) => {
    switch (fieldType) {
      case '5vs5': return '5 người';
      case '7vs7': return '7 người'; 
      default: return '5 người';
    }
  };

  const getPriceFromFieldType = (fieldType: string) => {
    switch (fieldType) {
      case '5vs5': return 300000;
      case '7vs7': return 400000;
      default: return 300000;
    }
  };

  // Global debounce timeout reference outside of state to avoid re-render issues
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const debouncedFetchAvailability = useCallback(async (isRefresh = false, delay = 300) => {
    if (!fieldId || !selectedDate) return;
    
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    
    // Set new timeout for debouncing
    debounceTimeoutRef.current = setTimeout(async () => {
      debounceTimeoutRef.current = null;
      
      // Validate fieldId format (should be UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(fieldId)) {
        console.error('Invalid field ID format:', fieldId);
        setError(`ID sân không hợp lệ: "${fieldId}". Vui lòng chọn sân từ danh sách.`);
        return;
      }
      
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);
        
        console.log('Fetching availability for field:', fieldId, 'date:', selectedDate);
        
        const today = new Date();
        const targetDate = new Date(today.getFullYear(), today.getMonth(), selectedDate);
        // Fix timezone issue by using local date string instead of ISO
        const year = targetDate.getFullYear();
        const month = String(targetDate.getMonth() + 1).padStart(2, '0');
        const day = String(targetDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        const response = await axios.get(`${API_BASE_URL}/bookings/field/${fieldId}/availability-with-pricing?date=${dateStr}`);
        
        if (response.data.success) {
          const responseData = response.data.data;
          const unavailableSlots = responseData.unavailableSlots || [];
          
          // PRIORITY 1: Always use pricing rules from availability API (single source of truth)
          if (responseData.field?.pricingRules) {
            console.log('Setting pricing rules from availability API:', responseData.field.pricingRules);
            setPricingRules(responseData.field.pricingRules);
          } else {
            console.log('No pricing rules in availability response, clearing rules');
            setPricingRules([]);
          }
          
          // Update subfields with price from field data
          if (responseData.subfields && responseData.field?.price_per_hour) {
            const mappedSubfields = responseData.subfields.map((subfield: any) => ({
              id: subfield.id,
              name: subfield.name,
              players: getPlayersFromFieldType(subfield.field_type),
              price: responseData.field.price_per_hour // Use price from API
            }));
            setSubfields(mappedSubfields);
          }
        
        console.log('API Response - unavailableSlots:', unavailableSlots);
        
        // Separate booked, maintenance and payment pending slots
        const bookedSlotIds: string[] = [];
        const maintenanceSlotIds: string[] = [];
        const paymentPendingSlotIds: {[key: string]: {expiresAt: string}} = {};
        
        unavailableSlots.forEach((slot: any) => {
          // Convert time format from "09:00:00" to "09:00"
          const timeFormatted = slot.start_time.substring(0, 5);
          // Use sub_field_id from API response
          const slotId = `${slot.sub_field_id}-${timeFormatted}`;
          
          if (slot.display_status === 'maintenance') {
            maintenanceSlotIds.push(slotId);
            console.log('Creating maintenance slot ID:', slotId, 'from slot:', slot);
          } else if (slot.display_status === 'payment_pending') {
            paymentPendingSlotIds[slotId] = {
              expiresAt: slot.payment_expires_at || new Date(Date.now() + 10 * 60 * 1000).toISOString()
            };
            console.log('Creating payment pending slot ID:', slotId, 'expires at:', paymentPendingSlotIds[slotId].expiresAt);
          } else {
            bookedSlotIds.push(slotId);
            console.log('Creating booked slot ID:', slotId, 'from slot:', slot);
          }
        });
        
        console.log('Final bookedSlotIds:', bookedSlotIds);
        console.log('Final maintenanceSlotIds:', maintenanceSlotIds);
        console.log('Final paymentPendingSlotIds:', paymentPendingSlotIds);
        setBookedSlots(bookedSlotIds);
        setMaintenanceSlots(maintenanceSlotIds);
        setPaymentPendingSlots(paymentPendingSlotIds);
        setLastRefresh(new Date());
      }
    } catch (error: any) {
      console.error('Error fetching availability:', error);
      
      // More specific error handling
      if (error.response?.status === 400 && error.response?.data?.error?.includes('uuid')) {
        setError(`ID sân không đúng định dạng: "${fieldId}". Vui lòng truy cập từ danh sách sân.`);
      } else {
        setError('Không thể tải trạng thái đặt sân. Vui lòng thử lại.');
      }
      // On error, keep existing booked slots to avoid confusion
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    }, delay);
  }, [fieldId, selectedDate]);

  // Remove the wrapper function to avoid dependency issues
  // Use debouncedFetchAvailability directly in useEffects

  // Fetch availability data from API - only when fieldId or selectedDate changes
  useEffect(() => {
    if (fieldId && selectedDate) {
      // Use the debounced version directly without dependencies on the function
      debouncedFetchAvailability(false, 0);
    }
  }, [fieldId, selectedDate]); // Only depend on actual data changes

  // DISABLED: Auto-refresh to prevent excessive API calls
  // useEffect(() => {
  //   if (!fieldId || !selectedDate) return;
  //   
  //   const interval = setInterval(() => {
  //     if (document.visibilityState === 'visible') {
  //       debouncedFetchAvailability(true, 2000); // Increase delay to 2 seconds
  //     }
  //   }, 30000);

  //   return () => clearInterval(interval);
  // }, [fieldId, selectedDate, debouncedFetchAvailability]); // Only depend on actual data, not the function

  // Refresh when trigger changes - use debounced version
  useEffect(() => {
    if (refreshTrigger > 0 && fieldId && selectedDate) {
      debouncedFetchAvailability(true, 200); // Use debounced version with 200ms delay
    }
  }, [refreshTrigger, fieldId, selectedDate]); // Only depend on actual data changes, not the function

  const getSlotStatus = useCallback((fieldId: string, time: string): "available" | "booked" | "selected" | "maintenance" | "payment_pending" => {
    const slotId = `${fieldId}-${time}`;
    
    if (selectedSlots.includes(slotId)) {
      console.log('Slot is SELECTED:', slotId);
      return "selected";
    }
    if (maintenanceSlots.includes(slotId)) {
      console.log('Slot is MAINTENANCE:', slotId);
      return "maintenance";
    }
    if (paymentPendingSlots[slotId]) {
      console.log('Slot is PAYMENT_PENDING:', slotId);
      return "payment_pending";
    }
    if (bookedSlots.includes(slotId)) {
      console.log('Slot is BOOKED:', slotId);
      return "booked";
    }
    console.log('Slot is AVAILABLE:', slotId);
    return "available";
  }, [bookedSlots, selectedSlots, maintenanceSlots, paymentPendingSlots]);

  const handleSlotClick = useCallback((fieldId: string, time: string) => {
    const slotId = `${fieldId}-${time}`;
    if (bookedSlots.includes(slotId) || maintenanceSlots.includes(slotId) || paymentPendingSlots[slotId]) return;

    onSlotSelect(fieldId, time);
  }, [bookedSlots, maintenanceSlots, paymentPendingSlots, onSlotSelect]);
  
  const formatPrice = (price: number): string => {
    return price.toLocaleString('vi-VN');
  };

  const handleFieldToggle = (fieldId: string) => {
    setSelectedField(selectedField === fieldId ? null : fieldId);
  };

  const handleManualRefresh = () => {
    debouncedFetchAvailability(true, 100); // Use short delay for manual refresh
  };

  // Handle payment pending expiration
  const handlePaymentExpire = useCallback((fieldId: string, time: string) => {
    const slotId = `${fieldId}-${time}`;
    setPaymentPendingSlots(prev => {
      const updated = { ...prev };
      delete updated[slotId];
      return updated;
    });
    
    // Trigger refresh to get updated availability - use debounced version
    debouncedFetchAvailability(true, 500);
  }, []); // Remove the dependency to prevent re-creation

  // Calculate total price for selected slots with peak hour pricing
  const totalPrice = useMemo(() => {
    // Use API subfields if available, otherwise fallback to hardcoded (with warning)
    const fieldsToUse = subfields.length > 0 ? subfields : fields;
    
    if (subfields.length === 0) {
      console.warn('Using hardcoded field data - prices may not be accurate. Subfields from API:', subfields);
    }
    
    const total = selectedSlots.reduce((total, slotId) => {
      const [fieldId, time] = slotId.split('-');
      const field = fieldsToUse.find(f => f.id === fieldId);
      if (!field) {
        console.warn('Field not found for slot:', slotId, 'Available fields:', fieldsToUse);
        return total;
      }
      
      const basePrice = field.price || 0;
      const finalPrice = calculatePriceWithPeakHour(basePrice, time);
      console.log(`Price calculation: slot=${slotId}, base=${basePrice}, final=${finalPrice}`);
      return total + finalPrice;
    }, 0);
    
    return total;
  }, [selectedSlots, subfields, calculatePriceWithPeakHour]);

  // Validate pricing consistency (for debugging)
  const validatePricingConsistency = useCallback(() => {
    if (process.env.NODE_ENV !== 'development') return;
    
    console.group('Pricing Validation');
    console.log('Current pricing rules:', pricingRules);
    console.log('Current subfields:', subfields);
    
    // Check if pricing rules are properly loaded
    if (fieldId && pricingRules.length === 0) {
      console.warn('⚠️ No pricing rules loaded for field:', fieldId);
    }
    
    // Check for price calculation consistency
    selectedSlots.forEach(slotId => {
      const [fieldIdFromSlot, time] = slotId.split('-');
      const field = subfields.find(f => f.id === fieldIdFromSlot);
      if (field) {
        const basePrice = field.price;
        const calculatedPrice = calculatePriceWithPeakHour(basePrice, time);
        console.log(`Slot ${slotId}: base=${basePrice}, calculated=${calculatedPrice}`);
      }
    });
    
    console.groupEnd();
  }, [fieldId, pricingRules, subfields, selectedSlots, calculatePriceWithPeakHour]);

  // Run validation when pricing data changes
  useEffect(() => {
    validatePricingConsistency();
  }, [validatePricingConsistency]);

  // Socket listeners for real-time updates
  useEffect(() => {
    // Check if socket.io is available in browser environment
    if (typeof window !== 'undefined' && (window as any).io) {
      const socket = (window as any).io();
      
      // Listen for booking expired events
      socket.on('booking_expired', (data: any) => {
        console.log('Booking expired:', data);
        
        // Show notification
        if (data.fieldId === fieldId) {
          // Refresh availability to remove expired slots - use debounced version
          debouncedFetchAvailability(true, 1000); // 1 second delay for socket events
          
          // Optional: Show toast notification
          try {
            const { toast } = require('sonner');
            toast.info('Một slot vừa được giải phóng do hết thời gian thanh toán');
          } catch (e) {
            console.log('Toast notification not available');
          }
        }
      });
      
      // Listen for booking status updates
      socket.on('booking_status_update', (data: any) => {
        console.log('Booking status updated:', data);
        
        if (data.fieldId === fieldId) {
          // Refresh availability - use debounced version
          debouncedFetchAvailability(true, 800);
        }
      });
      
      return () => {
        socket.off('booking_expired');
        socket.off('booking_status_update');
        socket.disconnect();
      };
    }
  }, [fieldId]); // Only depend on fieldId, not the function

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    };
  }, []);

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-green-600 font-medium border-l-4 border-green-500 pl-3">
          Chọn sân và giờ
          {selectedSlots.length > 0 && (
            <span className="ml-2 text-sm text-gray-600">
              ({selectedSlots.length} slot - {formatPrice(totalPrice)}đ)
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="text-green-600 flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Cập nhật
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPrices(!showPrices)}
            className="text-green-600 flex items-center gap-1"
          >
            <Info className="h-4 w-4" />
            {showPrices ? "Ẩn giá" : "Hiển thị giá"}
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <span className="text-sm text-yellow-800">{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
          <span className="text-sm text-blue-800">Đang tải trạng thái sân...</span>
        </div>
      )}

      {/* Last refresh time */}
      <div className="text-xs text-gray-500 mb-3">
        Cập nhật lần cuối: {lastRefresh.toLocaleTimeString()}
        {refreshing && <span className="ml-2 text-blue-600">Đang cập nhật...</span>}
        {/* Debug info for pricing rules */}
        {process.env.NODE_ENV === 'development' && (
          <span className="ml-4 text-purple-600">
            Pricing rules: {pricingRules.length} rules loaded
            {pricingRules.length > 0 && ` (${pricingRules.map(r => `${r.from_hour}-${r.to_hour}:${r.multiplier}x`).join(', ')})`}
          </span>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="p-3 text-left text-sm font-medium text-gray-900 w-40">Sân</th>
                {timeSlots.map((time) => (
                  <th key={time} className="p-2 text-center text-xs font-medium text-gray-700 min-w-[60px]">
                    {time}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(subfields.length > 0 ? subfields : fields).map((field) => (
                <tr key={field.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3">
                    <div className="text-sm font-medium text-gray-900">{field.name}</div>
                    <div className="text-xs text-gray-500">{field.players}</div>                        {showPrices && (
                          <div className="text-xs font-semibold mt-1">
                            <div className="text-green-600">
                              {formatPrice(field.price)}đ/h
                            </div>
                            {/* Show peak hour rates if available */}
                            {pricingRules.length > 0 && (
                              <div className="text-xs text-orange-600 mt-1">
                                Giờ cao điểm: {formatPrice(calculatePriceWithPeakHour(field.price, '21:00'))}đ/h
                              </div>
                            )}
                            {/* Debug: Show if pricing rules are missing */}
                            {pricingRules.length === 0 && process.env.NODE_ENV === 'development' && (
                              <div className="text-xs text-red-500 mt-1">
                                No pricing rules loaded
                              </div>
                            )}
                          </div>
                        )}
                  </td>
                  {timeSlots.map((time) => {
                    const status = getSlotStatus(field.id, time);
                    const basePrice = field.price;
                    const finalPrice = calculatePriceWithPeakHour(basePrice, time);
                    const isPeakHour = isInPeakHour(time);
                    const multiplier = getPeakHourMultiplier(time);
                    
                    return (
                      <td key={time} className="p-1 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleSlotClick(field.id, time)}
                          disabled={status === "booked" || status === "maintenance" || status === "payment_pending"}
                          className={`w-full h-9 rounded text-xs font-medium transition-colors relative ${
                            status === "booked"
                              ? "bg-red-100 text-red-500 border border-red-200 cursor-not-allowed"
                              : status === "maintenance"
                                ? "bg-gray-100 text-gray-500 border border-gray-300 cursor-not-allowed"
                                : status === "payment_pending"
                                  ? "bg-orange-100 text-orange-800 border border-orange-300 cursor-not-allowed"
                                  : status === "selected"
                                    ? "bg-blue-500 text-white"
                                    : isPeakHour
                                      ? "bg-orange-50 border border-orange-300 hover:bg-orange-100 text-orange-800"
                                      : "bg-white border border-gray-200 hover:bg-green-50 hover:border-green-300"
                          }`}
                          title={
                            status === "maintenance" 
                              ? "Đang bảo trì"
                              : status === "payment_pending"
                                ? "Slot này đang chờ thanh toán từ người dùng khác"
                                : isPeakHour 
                                  ? `Giờ cao điểm - ${formatPrice(finalPrice)}đ (${multiplier}x)` 
                                  : `${formatPrice(finalPrice)}đ`
                          }
                        >
                          {status === "booked" 
                            ? "Đã đặt" 
                            : status === "maintenance"
                              ? "Bảo trì"
                              : status === "payment_pending"
                                ? (
                                  <div className="flex flex-col items-center">
                                    <span className="text-xs">Chờ TT</span>
                                    {paymentPendingSlots[`${field.id}-${time}`] && (
                                      <CountdownTimer 
                                        expiresAt={paymentPendingSlots[`${field.id}-${time}`].expiresAt}
                                        onExpire={() => handlePaymentExpire(field.id, time)}
                                      />
                                    )}
                                  </div>
                                )
                                : status === "selected" 
                                  ? <Check className="h-4 w-4 mx-auto" /> 
                                  : (
                                    <div className="flex flex-col items-center">
                                      {showPrices && (
                                        <div className={`text-xs font-semibold ${isPeakHour ? 'text-orange-600' : 'text-green-600'}`}>
                                          {formatPrice(finalPrice)}đ
                                        </div>
                                      )}
                                    </div>
                                  )
                          }
                          {isPeakHour && !showPrices && (
                            <div className="absolute top-0 right-0 w-2 h-2 bg-orange-500 rounded-full"></div>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center space-x-6 mt-4">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-white border border-gray-200 rounded"></div>
          <span className="text-sm text-gray-700">Còn trống</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className="text-sm text-gray-700">Đã chọn</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
          <span className="text-sm text-gray-700">Đã đặt</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded"></div>
          <span className="text-sm text-gray-700">Chờ thanh toán</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
          <span className="text-sm text-gray-700">Bảo trì</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-orange-50 border border-orange-300 rounded"></div>
          <span className="text-sm text-gray-700">Giờ cao điểm</span>
        </div>
      </div>
    </div>
  );
}
