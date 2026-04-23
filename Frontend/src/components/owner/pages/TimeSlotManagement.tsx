import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { TimeSlot, ContextMenu, TooltipInfo } from "../../../types/timeSlot";
import PeakHourModal from "../components/PeakHourModal";
import MaintenanceModal from "../modals/MaintenanceModal";
import AdvancedMaintenanceModal, { MaintenanceData } from "../modals/AdvancedMaintenanceModal";
import OwnerBookingModal, { OwnerBookingData } from "../modals/OwnerBookingModal";
import MaintenanceBookingConfirmDialog from "../../dialogs/MaintenanceBookingConfirmDialog";
import EnhancedMaintenanceConfirmDialog from "../../dialogs/EnhancedMaintenanceConfirmDialog";
import MaintenanceDialogManager from "../../dialogs/MaintenanceDialogManager";
import ConfirmDialog from "../../ui/ConfirmDialog";
import { useMaintenanceDialog } from "../../../hooks/useMaintenanceDialog";
import { useConfirmDialog } from "../../../hooks/useConfirmDialog";

import {
  formatTimeSlot,
  formatDateWithDay,
  formatBookingDate,
  formatTimeSlotPrice,
  formatBookingStatus,
  getPaymentStatusBadge,
  TIME_SLOT_CONSTANTS,
} from "../../../utils/timeSlotFormatters";
import { getFieldColorName } from "../../../utils/statusUtils";
import {
  timeslotService,
  SubFieldInfo,
} from "../../../services/timeslotService";
import "./TimeSlotManagement.css";
import "./TimeSlotManagementEnhanced.css";

const TimeSlotManagement: React.FC = (): JSX.Element => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [subFields, setSubFields] = useState<SubFieldInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [maintenanceState, setMaintenanceState] = useState<{
    pendingOperations: Map<
      string,
      {
        type: "set" | "cancel";
        retryCount: number;
        lastAttempt: number;
      }
    >;
  }>({
    pendingOperations: new Map(),
  });
  const [contextMenu, setContextMenu] = useState<ContextMenu>({
    visible: false,
    x: 0,
    y: 0,
    timeSlot: null,
  });
  const [tooltipInfo, setTooltipInfo] = useState<TooltipInfo>({
    visible: false,
    x: 0,
    y: 0,
    timeSlot: null,
    time: "",
    field: "",
  });
  const [apiStatus, setApiStatus] = useState<
    "idle" | "loading" | "error" | "success"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [apiCache, setApiCache] = useState<Map<string, any>>(new Map());
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [fieldPriceCache, setFieldPriceCache] = useState<
    Map<
      string,
      {
        price: number;
        timestamp: number;
      }
    >
  >(new Map());
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Optimistic loading states
  const [isDateChanging, setIsDateChanging] = useState<boolean>(false);
  const [prefetchCache, setPrefetchCache] = useState<Map<string, any>>(
    new Map()
  );
  // Peak Hour Modal state
  const [peakHourModalOpen, setPeakHourModalOpen] = useState(false);

  // Maintenance Modal state
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [advancedMaintenanceModalOpen, setAdvancedMaintenanceModalOpen] = useState(false);
  const [selectedTimeSlotForMaintenance, setSelectedTimeSlotForMaintenance] =
    useState<{
      slotId?: string;
      time: string;
      endTime: string;
      fieldId: string;
      fieldName: string;
      date: string;
      currentStatus: "available" | "maintenance" | "past";
    } | null>(null);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [ongoingMaintenanceOps, setOngoingMaintenanceOps] = useState<
    Set<string>
  >(new Set());
  const [maintenanceOperationInProgress, setMaintenanceOperationInProgress] =
    useState(false);

  // Owner Booking Modal state
  const [ownerBookingModalOpen, setOwnerBookingModalOpen] = useState(false);
  const [selectedTimeSlotForOwnerBooking, setSelectedTimeSlotForOwnerBooking] =
    useState<{
      time: string;
      endTime: string;
      fieldId: string;
      fieldName: string;
      date: string;
    } | null>(null);
  const [ownerBookingLoading, setOwnerBookingLoading] = useState(false);

  // Enhanced maintenance booking confirm dialog state
  const maintenanceDialog = useMaintenanceDialog();
  const confirmDialog = useConfirmDialog();

  // Pricing rules state - now loaded from FieldPricingRule
  const [pricingRules, setPricingRules] = useState<any[]>([]);
  const [loadingPricingRules, setLoadingPricingRules] = useState(false);

  // Helper function to show confirm dialog - now using hook
  const showConfirmDialog = (
    title: string,
    message: string,
    onConfirm: () => void,
    options: {
      confirmText?: string;
      cancelText?: string;
      type?: 'warning' | 'danger' | 'info';
    } = {}
  ) => {
    confirmDialog.showDialog(title, message, onConfirm, options);
  };

  const { pitchId } = useParams<{ pitchId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  // Get pitch name from location state or use default
  const pitchName = location.state?.pitchName || `Sân ${pitchId}`;

  // Generate time slots dynamically from constants
  const generateHourSlots = () => {
    const slots = [];
    const startHour = parseInt(
      TIME_SLOT_CONSTANTS.DISPLAY_HOURS.START.split(":")[0]
    );
    const endHour = parseInt(
      TIME_SLOT_CONSTANTS.DISPLAY_HOURS.END.split(":")[0]
    );

    for (let hour = startHour; hour <= endHour; hour++) {
      slots.push({ time: `${hour.toString().padStart(2, "0")}:00` });
    }
    return slots;
  };

  const hourSlots = generateHourSlots();

  // API response parser helper
  const parseApiResponse = (response: any): any[] => {
    // Handle different response formats with priority order
    if (Array.isArray(response)) {
      return response;
    }

    if (response?.success && Array.isArray(response?.data?.unavailableSlots)) {
      return response.data.unavailableSlots;
    }

    if (Array.isArray(response?.data?.unavailableSlots)) {
      return response.data.unavailableSlots;
    }

    if (Array.isArray(response?.unavailableSlots)) {
      return response.unavailableSlots;
    }

    console.warn("Unexpected API response format:", response);
    return [];
  };

  // Add loading lock to prevent concurrent loads
  const loadingLockRef = useRef(false);
  
  // Enhanced loadBookedSlots with loading lock
  const loadBookedSlots = useCallback(
    async (
      targetDate?: Date,
      isPrefetch = false,
      useOptimisticCache = true
    ) => {
      // Skip loading if required data is missing
      if (!pitchId || selectedFields.length === 0) {
        console.log("⚠️ Missing required data:", { pitchId, selectedFields });
        return;
      }

      // Prevent concurrent loads
      if (loadingLockRef.current && !isPrefetch) {
        console.log("⚠️ Loading already in progress, skipping...");
        return;
      }

      if (!isPrefetch) {
        loadingLockRef.current = true;
        setIsLoading(true);
      }

      try {
        // Skip loading if maintenance operation is in progress
        if (maintenanceOperationInProgress && !isPrefetch) {
          console.log("⚠️ Maintenance in progress, skipping load...");
          return;
        }

        const currentTime = Date.now();
        // CRITICAL FIX: Use current state value instead of closure
        const dateToLoad = targetDate || new Date(currentDate.getTime());
        const dateStr = timeslotService.formatDateForAPI(dateToLoad);
        const sortedFields = [...selectedFields].sort();
        const cacheKey = `${pitchId}-${dateStr}-${sortedFields.join(",")}`;

        // Check both main cache and prefetch cache
        const cachedData =
          apiCache.get(cacheKey) ||
          (useOptimisticCache ? prefetchCache.get(cacheKey) : null);
        if (cachedData && currentTime - cachedData.timestamp < 60000) {
          // Extended cache to 1 minute
          if (!isPrefetch) {
            setTimeSlots(cachedData.data);
            setApiStatus("success");
            setIsDateChanging(false);
          }
          return cachedData.data;
        }

        // Reduced debounce for better responsiveness
        if (!isPrefetch && currentTime - lastLoadTime < 1000) {
          // Reduced from 3s to 1s
          return;
        }

        if (!isPrefetch) {
          setLastLoadTime(currentTime);
          setIsLoading(true);
          setApiStatus("loading");
          setError(null);
        }

        console.log("🔄 Making API call:", { 
          pitchId, 
          dateStr, 
          selectedFields: sortedFields.join(","),
          apiUrl: `${import.meta.env.VITE_API_URL || 'https://football-field-booking-backend.onrender.com/api'}/bookings/field/${pitchId}/availability?date=${dateStr}`
        });

        const response = await timeslotService.getBookingAvailability(
          pitchId,
          dateStr
        );

        console.log("✅ API Response received:", response);
        setRetryCount(0);
        const bookingData = parseApiResponse(response);

        if (!bookingData || bookingData.length === 0) {
          const emptyResult: TimeSlot[] = [];
          if (!isPrefetch) {
            setTimeSlots(emptyResult);
            setApiStatus("success");
            setIsDateChanging(false);
          }

          // Cache empty result
          const cacheToUpdate = isPrefetch ? prefetchCache : apiCache;
          const setCacheFunc = isPrefetch ? setPrefetchCache : setApiCache;
          setCacheFunc(
            (prev) =>
              new Map(
                prev.set(cacheKey, {
                  data: emptyResult,
                  timestamp: Date.now(),
                })
              )
          );

          return emptyResult;
        }

        // Process booking data (same as before)
        const bookedSlots: TimeSlot[] = bookingData
          .filter((booking: any) => {
            const startTime = formatTimeSlot(
              booking.start_time || booking.startTime || ""
            );
            return (
              startTime >= TIME_SLOT_CONSTANTS.DISPLAY_HOURS.START &&
              startTime <= TIME_SLOT_CONSTANTS.DISPLAY_HOURS.END
            );
          })
          .map((booking: any) => {
            let fieldId =
              booking.sub_field_id || booking.subFieldId || booking.field;
            const fieldName = booking.subfield_name || booking.subfieldName;

            if (!fieldId && fieldName) {
              const matchingSubField = subFields.find(
                (sf) => sf.name === fieldName
              );
              if (matchingSubField) {
                fieldId = matchingSubField.id;
              }
            }
            const basePrice = booking.base_price || booking.basePrice;
            const finalPrice = booking.final_price || booking.finalPrice;
            const peakHourMultiplier =
              booking.peak_hour_multiplier || booking.peakHourMultiplier || 1.0; // Determine the correct status based on database status field
            let slotStatus: "booked" | "maintenance" | "available" = "booked";

            // Check for maintenance status first (from database status field)
            if (booking.status === "maintenance") {
              slotStatus = "maintenance";
            } else if (booking.booking_id || booking.bookingId) {
              // Only set as booked if there's actually a booking
              slotStatus = "booked";
            } else {
              slotStatus = "available";
            }

            // Skip "available" slots without booking IDs from the time slots array
            // These are empty slots that should be handled by UI logic, not API data
            if (
              slotStatus === "available" &&
              !(booking.booking_id || booking.bookingId)
            ) {
              return null; // Skip this slot
            }

            const slot = {
              id: booking.booking_id || booking.bookingId || booking.id,
              field: fieldId,
              fieldName: fieldName,
              startTime: formatTimeSlot(
                booking.start_time || booking.startTime || ""
              ),
              endTime: formatTimeSlot(
                booking.end_time || booking.endTime || ""
              ),
              time: formatTimeSlot(
                booking.start_time || booking.startTime || ""
              ),
              price: formatTimeSlotPrice(
                booking.final_price || booking.finalPrice || 0
              ),
              basePrice,
              finalPrice,
              peakHourMultiplier,
              status: slotStatus,
              // Add maintenance specific fields
              maintenanceReason: booking.maintenance_reason || null,
              maintenanceUntil: booking.maintenance_until || null,
              customerName:
                // For owner bookings, prioritize customer_info over user data
                booking.is_owner_booking
                  ? (booking.customer_info
                      ? typeof booking.customer_info === "string"
                        ? JSON.parse(booking.customer_info).name || JSON.parse(booking.customer_info).fullName
                        : booking.customer_info.name || booking.customer_info.fullName
                      : null) || "Khách hàng"
                  : booking.customer_name || "Khách hàng",
              customerPhone:
                // For owner bookings, prioritize customer_info over user data
                booking.is_owner_booking
                  ? (booking.customer_info
                      ? typeof booking.customer_info === "string"
                        ? JSON.parse(booking.customer_info).phone
                        : booking.customer_info.phone
                      : null) || ""
                  : booking.customer_phone || "",
              bookingDate: booking.booking_date || booking.bookingDate,
              paymentStatus:
                booking.payment_status || booking.paymentStatus || "pending",
              bookingStatus: booking.booking_status || "confirmed",
              description:
                slotStatus === "maintenance"
                  ? `🔧 Bảo trì${
                      booking.maintenance_reason
                        ? ": " + booking.maintenance_reason
                        : ""
                    }`
                  : formatBookingStatus(
                      booking.payment_status || booking.paymentStatus,
                      booking.booking_status
                    ),
            };
            return slot;
          })
          .filter(Boolean); // Remove null slots (skipped available slots)

        // Handle missing fields auto-addition (only for main load, not prefetch)
        if (!isPrefetch) {
          const bookingFieldIds = new Set(
            bookedSlots.map((slot) => slot.field).filter(Boolean)
          );
          const missingFieldIds = Array.from(bookingFieldIds).filter(
            (fieldId) => !selectedFields.includes(fieldId)
          );
          if (missingFieldIds.length > 0) {
            const newFields = [
              ...new Set([...selectedFields, ...missingFieldIds]),
            ];
            setSelectedFields(newFields);
            const filteredSlots = bookedSlots.filter((slot) =>
              newFields.includes(slot.field)
            );
            setTimeSlots(filteredSlots);
          } else {
            setTimeSlots(bookedSlots);
          }

          setApiStatus("success");
          setIsDateChanging(false);
        }

        // Cache the result
        const cacheToUpdate = isPrefetch ? prefetchCache : apiCache;
        const setCacheFunc = isPrefetch ? setPrefetchCache : setApiCache;
        setCacheFunc(
          (prev) =>
            new Map(
              prev.set(cacheKey, {
                data: bookedSlots,
                timestamp: Date.now(),
              })
            )
        );

        if (!isPrefetch && bookedSlots.length > 0) {
          // Separate actual bookings from maintenance slots for better toast messaging
          const actualBookings = bookedSlots.filter(
            (slot) => slot.status === "booked"
          );
          const maintenanceSlots = bookedSlots.filter(
            (slot) => slot.status === "maintenance"
          );

          if (actualBookings.length > 0 && maintenanceSlots.length > 0) {
            toast.success(
              `Đã tải ${actualBookings.length} booking và ${maintenanceSlots.length} slot bảo trì`
            );
          } else if (actualBookings.length > 0) {
            toast.success(`Đã tải ${actualBookings.length} booking thành công`);
          } else if (maintenanceSlots.length > 0) {
            toast.success(`Đã tải ${maintenanceSlots.length} slot bảo trì`);
          }
        }

        return bookedSlots;
      } catch (error) {
        console.error(
          `Error loading ${isPrefetch ? "prefetch " : ""}booked slots:`,
          error
        );

        if (!isPrefetch) {
          const handleError = (
            errorType: string,
            message: string,
            shouldRetry: boolean = false
          ) => {
            setTimeSlots([]);
            setApiStatus("error");
            setError(message);
            setIsDateChanging(false);

            if (shouldRetry && retryCount < 3) {
              const newRetryCount = retryCount + 1;
              setRetryCount(newRetryCount);
              const retryDelay = Math.pow(2, newRetryCount) * 1000;

              setTimeout(() => {
                loadBookedSlots(targetDate, false, useOptimisticCache);
              }, retryDelay);

              toast.error(`${message} Đang thử lại... (${newRetryCount}/3)`);
            } else {
              toast.error(message);
            }
          };

          const errorResponse = (error as any)?.response;
          const errorMessage = (error as any)?.message || "";
          
          console.log("🔍 Error details:", {
            message: errorMessage,
            status: errorResponse?.status,
            code: (error as any)?.code,
            isNetworkError: !errorResponse && errorMessage.includes('Network Error'),
            isCorsError: errorMessage.includes('CORS') || errorMessage.includes('Access-Control'),
            isTimeoutError: (error as any)?.code === 'ECONNABORTED' || errorMessage.includes('timeout')
          });

          if (!errorResponse && (errorMessage.includes('Network Error') || errorMessage.includes('CORS'))) {
            handleError(
              "CORS_ERROR",
              "Lỗi kết nối - Kiểm tra backend server đang chạy",
              true
            );
          } else if ((error as any)?.code === 'ECONNABORTED' || errorMessage.includes('timeout')) {
            handleError(
              "TIMEOUT_ERROR", 
              "Server phản hồi chậm, đang thử lại...",
              true
            );
          } else if (errorResponse?.status === 404) {
            handleError("NOT_FOUND", "API endpoint không tìm thấy");
          } else if (errorResponse?.status >= 500) {
            handleError(
              "SERVER_ERROR",
              "Lỗi server - vui lòng thử lại sau",
              true
            );
          } else if (
            errorResponse?.status === 401 ||
            errorResponse?.status === 403
          ) {
            handleError("AUTH_ERROR", "Không có quyền truy cập");
          } else {
            handleError(
              "NETWORK_ERROR",
              "Không thể tải thông tin đặt sân",
              true
            );
          }
        }
        return [];
      } finally {
        if (!isPrefetch) {
          loadingLockRef.current = false;
          setIsLoading(false);
        }
      }
    },
    [
      pitchId,
      currentDate,
      selectedFields,
      apiCache,
      prefetchCache,
      retryCount,
      lastLoadTime,
      subFields,
      maintenanceOperationInProgress,
    ]
  );

  const memoizedSelectedFields = useMemo(
    () => [...selectedFields].sort().join(","),
    [selectedFields]
  );
  // Enhanced prefetching function - FIXED closure trap and date dependencies
  const prefetchAdjacentDates = useCallback(async (targetDate?: Date) => {
    if (!pitchId || selectedFields.length === 0) return;

    // Clear any existing prefetch timeout
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
    }

    // Prefetch after a short delay to not block current loading
    prefetchTimeoutRef.current = setTimeout(async () => {
      // Use passed targetDate or current date at execution time (not closure time)
      const baseDate = targetDate || new Date(currentDate.getTime());
      const yesterday = new Date(baseDate);
      yesterday.setDate(yesterday.getDate() - 1);

      const tomorrow = new Date(baseDate);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const baseDateStr = timeslotService.formatDateForAPI(baseDate);

      // Prefetch both adjacent days silently
      try {
        await Promise.all([
          loadBookedSlots(yesterday, true, false),
          loadBookedSlots(tomorrow, true, false),
        ]);       
        console.log("✅ Prefetch completed successfully for:", baseDateStr);
      } catch (error) {
        console.log("⚠️ Prefetch failed (non-critical) for:", baseDateStr, error);
      }
    }, 2000);
  }, [pitchId, memoizedSelectedFields, loadBookedSlots]); // Remove currentDate dependency to prevent closure trap

  // Enhanced useEffect with prefetching - FIXED to prevent infinite loops and closure traps
  useEffect(() => {
    console.log("🔄 useEffect triggered:", { 
      pitchId: !!pitchId, 
      subFieldsLength: subFields.length, 
      selectedFieldsLength: selectedFields.length,
      selectedFields: selectedFields.slice(0, 2), // Only log first 2 to avoid spam
      currentDateStr: timeslotService.formatDateForAPI(currentDate)
    });

    if (pitchId && subFields.length > 0 && selectedFields.length > 0) {
      // Add loading state check to prevent duplicate calls
      if (isLoading) {
        console.log("⚠️ Already loading, skipping useEffect call");
        return;
      }

      // Store current date for this execution cycle to prevent closure issues
      const executionDate = new Date(currentDate.getTime());
      
      // Reduced debounce for main load
      const timer = setTimeout(() => {
        console.log("⏰ Executing delayed loadBookedSlots for:", timeslotService.formatDateForAPI(executionDate));
        // Pass the execution date to ensure consistency
        loadBookedSlots(executionDate).then(() => {
          // Trigger prefetching after main load with the same date
          prefetchAdjacentDates(executionDate);
        });
      }, 300); // Reduced from 1000ms to 300ms

      return () => {
        console.log("🧹 Clearing useEffect timer");
        clearTimeout(timer);
      };
    }
  }, [
    pitchId,
    currentDate.getTime(), // Use getTime() instead of currentDate object to prevent unnecessary re-renders
    memoizedSelectedFields, // Use memoized version instead of selectedFields.join(",")
    subFields.length, // Add subFields.length as dependency since we check it
    // Remove loadBookedSlots and prefetchAdjacentDates from dependencies to prevent infinite loops
  ]);

  // Load SubFields for the current Field - FIXED to prevent loops
  const loadSubFields = useCallback(async () => {
    if (!pitchId) return;
    
    console.log("🏗️ Loading subfields for pitchId:", pitchId);
    
    try {
      const subFieldsData = await timeslotService.getSubFields(pitchId);
      setSubFields(subFieldsData);

      // Auto-select all sub fields ONLY if selectedFields is empty
      if (selectedFields.length === 0) {
        console.log("📌 Auto-selecting all subfields");
        const fieldIds = subFieldsData.map((sf) => sf.id);
        setSelectedFields(fieldIds);
      } else {
        console.log("📌 Keeping existing selectedFields");
      }
    } catch (error) {
      console.error("Error loading sub fields:", error);
      toast.error("Không thể tải danh sách sân con");
    }
  }, [pitchId]); // Remove selectedFields from dependency to prevent loops

  // Load pricing rules for the field
  const loadPricingRules = useCallback(async () => {
    if (!pitchId) return;

    setLoadingPricingRules(true);
    try {
      const response = await timeslotService.getPricingRules(pitchId);
      const rules = Array.isArray(response) ? response : response?.data || [];
      setPricingRules(rules);
    } catch (error) {
      console.error("Error loading pricing rules:", error);
      setPricingRules([]);
    } finally {
      setLoadingPricingRules(false);
    }
  }, [pitchId]); // Enhanced auto-refresh state
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [autoRefreshInterval] = useState(300000); // 5 minutes
  const [nextRefreshTime, setNextRefreshTime] = useState<Date | null>(null);
  const [lastUserInteraction, setLastUserInteraction] = useState<number>(Date.now());
  const mountedRef = useRef(true); // Add mounted ref to track component lifecycle

  // Load SubFields on component mount and setup enhanced auto-refresh
  useEffect(() => {
    mountedRef.current = true; // Set mounted flag
    loadSubFields();

    // Enhanced auto-refresh setup with better controls
    const setupAutoRefresh = () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }

      if (!autoRefreshEnabled || !mountedRef.current) {
        setNextRefreshTime(null);
        return;
      }

      // Calculate next refresh time
      const nextRefresh = new Date(Date.now() + autoRefreshInterval);
      setNextRefreshTime(nextRefresh);

      autoRefreshRef.current = setInterval(() => {
        if (
          mountedRef.current && // Check if component is still mounted
          !document.hidden &&
          pitchId &&
          selectedFields.length > 0 &&
          autoRefreshEnabled &&
          !maintenanceLoading &&
          ongoingMaintenanceOps.size === 0
        ) {
          const timeSinceLastLoad = Date.now() - lastLoadTime;
          const timeSinceLastInteraction = Date.now() - lastUserInteraction;

          // Only auto-refresh if:
          // 1. It's been more than 30 seconds since last load
          // 2. User hasn't interacted in last 30 seconds
          if (timeSinceLastLoad > 30000 && timeSinceLastInteraction > 30000) {
            // CRITICAL FIX: Pass current date at execution time to avoid closure trap
            const currentRefreshDate = new Date();
            loadBookedSlots(currentRefreshDate);
            const nextRefresh = new Date(Date.now() + autoRefreshInterval);
            setNextRefreshTime(nextRefresh);
          }
        }
      }, autoRefreshInterval);
    };

    setupAutoRefresh();

    // Enhanced cleanup
    return () => {
      mountedRef.current = false; // Set mounted flag to false
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
    };
  }, [loadSubFields, pitchId, autoRefreshEnabled, autoRefreshInterval]);

  // Track user interactions
  useEffect(() => {
    const handleUserInteraction = () => {
      setLastUserInteraction(Date.now());
    };

    // Track mouse movements and clicks
    document.addEventListener("mousemove", handleUserInteraction);
    document.addEventListener("click", handleUserInteraction);
    document.addEventListener("keydown", handleUserInteraction);
    document.addEventListener("scroll", handleUserInteraction);

    return () => {
      document.removeEventListener("mousemove", handleUserInteraction);
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
      document.removeEventListener("scroll", handleUserInteraction);
    };
  }, []);

  // Load pricing rules on component mount
  useEffect(() => {
    loadPricingRules();
  }, [loadPricingRules]);

  // Helper function to get field price from backend
  // Helper functions for price handling
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat("vi-VN").format(price) + " ₫";
  };
  // Get base price for a field
  const getFieldPrice = useCallback(
    (fieldId: string): number => {
      const now = Date.now();
      const cachedData = fieldPriceCache.get(fieldId);

      // Use cache if available and not expired (5 minutes)
      if (cachedData && now - cachedData.timestamp < 300000) {
        return cachedData.price;
      }

      const subField = subFields.find((sf) => sf.id === fieldId);
      const price = subField?.pricePerHour || 300000; // Default price

      // Update cache
      setFieldPriceCache((prev) =>
        new Map(prev).set(fieldId, {
          price,
          timestamp: now,
        })
      );

      return price;
    },
    [subFields, fieldPriceCache]
  );
  // Peak hour settings state (will be fetched from API later)
  const [peakHourSettings, setPeakHourSettings] = useState({
    startTime: "17:00",
    endTime: "22:00",
    multiplier: 1.0,
    isEnabled: false,
  });
  // Helper function to check if time is in peak hour based on pricing rules
  const isInPeakHour = useCallback(
    (currentTime: string): boolean => {
      if (pricingRules.length === 0) return false;

      // Parse hour from time slot (e.g., "14:00" -> 14)
      const hour = parseInt(currentTime.split(":")[0]);

      // Check if this hour falls within any pricing rule range
      const applicableRule = pricingRules.find(
        (rule) => hour >= rule.from_hour && hour < rule.to_hour
      );

      return !!applicableRule && applicableRule.multiplier > 1.0;
    },
    [pricingRules]
  );

  // Get peak hour multiplier for a time slot based on pricing rules
  const getPeakHourMultiplier = useCallback(
    (timeSlot: string): number => {
      if (pricingRules.length === 0) return 1.0;

      // Parse hour from time slot (e.g., "14:00" -> 14)
      const hour = parseInt(timeSlot.split(":")[0]);

      const applicableRule = pricingRules.find(
        (rule) => hour >= rule.from_hour && hour < rule.to_hour
      );

      return applicableRule ? applicableRule.multiplier : 1.0;
    },
    [pricingRules]
  ); // Get slot price with improved peak hour logic
  const getSlotPrice = useCallback(
    (timeSlot: TimeSlot | null, fieldId: string, time?: string): string => {
      // For existing slots with valid price data
      if (timeSlot) {
        if (
          timeSlot.status === "available" &&
          (!timeSlot.finalPrice || timeSlot.finalPrice <= 0) &&
          (!timeSlot.basePrice || timeSlot.basePrice <= 0)
        ) {
          // Fall through to calculate as empty slot
        } else {
          // Use finalPrice from API if available
          if (timeSlot.finalPrice && timeSlot.finalPrice > 0) {
            return formatPrice(timeSlot.finalPrice);
          }

          // Calculate from basePrice and multiplier
          if (timeSlot.basePrice && timeSlot.basePrice > 0) {
            const multiplier = time ? getPeakHourMultiplier(time) : 1.0;
            return formatPrice(Math.round(timeSlot.basePrice * multiplier));
          }

          // Use legacy price field if valid
          if (
            timeSlot.price &&
            timeSlot.price !== "0 ₫" &&
            timeSlot.price !== "₫"
          ) {
            return timeSlot.price;
          }
        }
      }

      // For empty slots or invalid price data - use cached field price
      const basePrice = getFieldPrice(fieldId);
      if (time) {
        const multiplier = getPeakHourMultiplier(time);
        return formatPrice(Math.round(basePrice * multiplier));
      }

      return formatPrice(basePrice);
    },
    [getPeakHourMultiplier, getFieldPrice, formatPrice]
  );

  // Get price color for UI indication
  const getPriceColor = useCallback(
    (timeSlot: TimeSlot | null, time?: string): string => {
      if (timeSlot) {
        // Show different colors based on peak hour multiplier
        const multiplier = timeSlot.peakHourMultiplier || 1.0;
        if (multiplier > 1.0) return "text-orange-600 font-semibold"; // Peak hour
        return "text-gray-600"; // Normal
      }

      // For empty slots
      if (time && isInPeakHour(time)) {
        return "text-orange-600 font-semibold"; // Peak hour pricing
      }

      return "text-gray-500"; // Normal pricing
    },
    [isInPeakHour]
  );

  // Helper function to get next time slot
  const getNextTimeSlot = (currentTime: string) => {
    const currentIndex = hourSlots.findIndex(
      (slot) => slot.time === currentTime
    );
    if (currentIndex !== -1 && currentIndex < hourSlots.length - 1) {
      return hourSlots[currentIndex + 1].time;
    }

    // For the last slot (22:00), the end time should be 23:00
    if (currentTime === "22:00") {
      return "23:00";
    }

    // Default end time for any other case
    return "23:00";
  };

  // Helper functions
  const getBookingByTimeAndField = (time: string, fieldId: string) => {
    // Simple and reliable matching
    const foundSlot = timeSlots.find((slot) => {
      if (slot.startTime !== time) return false;

      // Direct field ID match (most reliable)
      if (slot.field === fieldId) return true;

      // Fallback: match by subfield name if field ID is missing
      const subField = subFields.find((sf) => sf.id === fieldId);
      if (subField && slot.fieldName === subField.name) return true;

      return false;
    });

    // If no existing slot found, create a virtual slot with proper status
    if (!foundSlot) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const slotDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
      
      let status: "available" | "past" = "available";
      let isPast = false;
      
      // CRITICAL FIX: Only mark as past if it's TODAY AND the time has passed
      // For past dates, NEVER mark as past to avoid layout issues with "Đã qua" card
      if (slotDate.getTime() === today.getTime()) {
        // Only for today, check if time has passed
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const slotHour = parseInt(time.split(':')[0]);
        const slotMinute = parseInt(time.split(':')[1]);
        
        const currentTotalMinutes = currentHour * 60 + currentMinute;
        const slotTotalMinutes = slotHour * 60 + slotMinute;
        
        if (slotTotalMinutes < currentTotalMinutes) {
          status = "past";
          isPast = true;
        }
      }
      // For past dates (not today), always keep as "available" - NEVER set to "past"
      // This prevents the "Đã qua" card from showing on old dates
      
      // Return virtual slot for empty time slots
      return {
        time,
        startTime: time,
        field: fieldId,
        fieldName: getSubFieldName(fieldId),
        status,
        isPast,
        isVirtual: true, // Flag to identify virtual slots
        id: `virtual-${fieldId}-${time}`,
        price: "0", // String to match TimeSlot interface
        basePrice: 0,
        finalPrice: 0,
        peakHourMultiplier: 1.0,
        maintenanceReason: null,
        maintenanceUntil: null,
        customerName: null,
        customerPhone: null,
        paymentStatus: undefined,
        endTime: getNextTimeSlot(time)
      } as TimeSlot;
    }

    return foundSlot;
  };
  const getSubFieldName = (fieldId: string): string => {
    const subField = subFields.find((sf) => sf.id === fieldId);
    return subField ? subField.name : fieldId;
  };

  // Context menu handlers
  const handleContextMenu = (
    event: React.MouseEvent,
    timeSlot: TimeSlot | null
  ) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      timeSlot,
    });
  };

  const hideContextMenu = () => {
    setContextMenu({
      visible: false,
      x: 0,
      y: 0,
      timeSlot: null,
    });
  };

  // Owner booking handlers
  const handleOwnerBookingClick = useCallback(
    (time: string, fieldId: string) => {
      // Check if time slot is in the past
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const slotDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        
      // Check if date is in the past
      if (slotDate < today) {
        toast.error("Không thể đặt sân cho ngày đã qua");
        return;
      }
      
      // If it's today, check if the time slot has passed
      if (slotDate.getTime() === today.getTime()) {
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const slotHour = parseInt(time.split(':')[0]);
        const slotMinute = parseInt(time.split(':')[1]);
        
        const currentTotalMinutes = currentHour * 60 + currentMinute;
        const slotTotalMinutes = slotHour * 60 + slotMinute;
        
        if (slotTotalMinutes < currentTotalMinutes) {
          toast.error("Không thể đặt sân cho khung giờ đã qua");
          return;
        }
      }

      const existingSlot = getBookingByTimeAndField(time, fieldId);
      
      // Only allow booking on available slots
      if (existingSlot && existingSlot.status !== "available") {
        toast.error("Khung giờ này đã được đặt hoặc đang bảo trì");
        return;
      }

      const subField = subFields.find((sf) => sf.id === fieldId);
      if (!subField) {
        toast.error("Không tìm thấy thông tin sân");
        return;
      }

      const endTime = getNextTimeSlot(time);
      
      // Prepare data for owner booking modal
      const bookingData = {
        time,
        endTime,
        fieldId,
        fieldName: subField.name,
        date: timeslotService.formatDateForAPI(currentDate),
      };

      setSelectedTimeSlotForOwnerBooking(bookingData);
      setOwnerBookingModalOpen(true);
    },
    [currentDate, getBookingByTimeAndField, subFields, getNextTimeSlot]
  );

  // Handle owner booking confirm
  const handleOwnerBookingConfirm = useCallback(
    async (bookingData: OwnerBookingData) => {
      if (!pitchId) {
        toast.error("Không tìm thấy thông tin sân");
        return;
      }

      setOwnerBookingLoading(true);
      setMaintenanceOperationInProgress(true);

      try {
        console.log("🏃‍♂️ Creating owner booking:", bookingData);

        // Prepare booking payload
        const bookingPayload = {
          fieldId: pitchId,
          subFieldIds: [bookingData.fieldId],
          bookingDate: bookingData.date,
          timeSlots: [
            {
              sub_field_id: bookingData.fieldId,
              start_time: bookingData.time,
              end_time: bookingData.endTime,
            },
          ],
          customerInfo: {
            name: bookingData.customerName,
            phone: bookingData.customerPhone,
            email: bookingData.customerEmail,
          },
          notes: bookingData.notes || "",
          paymentMethod: bookingData.paymentMethod || "cash",
          totalAmount: Math.round(bookingData.totalAmount), // Đảm bảo là số nguyên
          isPaidInFull: bookingData.isPaidInFull === true,
          depositAmount: bookingData.isPaidInFull ? Math.round(bookingData.totalAmount) : Math.round(bookingData.depositAmount || 0),
          // Flag to indicate this is owner booking
          isOwnerBooking: true,
        };

        // Call API to create owner booking
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://football-field-booking-backend.onrender.com/api'}/bookings/owner-booking`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(bookingPayload),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error("❌ Server error details:", result);
          throw new Error(result.message || result.error || 'Có lỗi xảy ra khi tạo booking');
        }

        console.log("✅ Owner booking created successfully:", result);

        // Clear caches to force refresh
        setApiCache(new Map());
        setPrefetchCache(new Map());

        // Reload data
        await loadBookedSlots();

        toast.success("Tạo booking hộ khách hàng thành công!");
        setOwnerBookingModalOpen(false);
        setSelectedTimeSlotForOwnerBooking(null);

      } catch (error: any) {
        console.error("❌ Error creating owner booking:", error);
        toast.error(error.message || "Có lỗi xảy ra khi tạo booking");
      } finally {
        setOwnerBookingLoading(false);
        setMaintenanceOperationInProgress(false);
      }
    },
    [pitchId, loadBookedSlots, setApiCache, setPrefetchCache]
  );
  // Enhanced manual refresh with debounce and loading lock
  const manualRefresh = useCallback(
    async () => {
      if (loadingLockRef.current) {
        toast.info("Đang tải dữ liệu, vui lòng đợi...");
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastLoadTime < 1500) {
        toast.info("Vui lòng đợi trước khi làm mới lại");
        return;
      }

      // Only clear current date cache, keep prefetch cache
      const currentDateStr = timeslotService.formatDateForAPI(currentDate);
      const sortedFields = [...selectedFields].sort();
      const currentCacheKey = `${pitchId}-${currentDateStr}-${sortedFields.join(",")}`;

      setApiCache((prev) => {
        const newCache = new Map(prev);
        newCache.delete(currentCacheKey);
        return newCache;
      });

      setRetryCount(0);
      toast.info("Đang làm mới dữ liệu...");
      await loadBookedSlots();
    },
    [loadBookedSlots, lastLoadTime, currentDate, selectedFields, pitchId]
  );

  // Optimized navigation with smart caching - FIXED date consistency
  const navigateDate = useCallback(
    (days: number) => {
      setIsDateChanging(true);
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + days);
      
      console.log("📅 Navigating from", timeslotService.formatDateForAPI(currentDate), "to", timeslotService.formatDateForAPI(newDate));
      
      setCurrentDate(newDate);

      // Don't clear all cache - keep relevant entries
      const newDateStr = timeslotService.formatDateForAPI(newDate);
      const sortedFields = [...selectedFields].sort();
      const newCacheKey = `${pitchId}-${newDateStr}-${sortedFields.join(",")}`;

      // Check if we have prefetched data for this date
      const prefetchedData = prefetchCache.get(newCacheKey);
      if (prefetchedData && Date.now() - prefetchedData.timestamp < 120000) {
        // 2 minutes cache
        console.log("✅ Using prefetched data for:", newDateStr);
        // Use prefetched data immediately for instant response
        setTimeSlots(prefetchedData.data);
        setApiStatus("success");
        setIsDateChanging(false);
        // Move from prefetch cache to main cache
        setApiCache((prev) => new Map(prev.set(newCacheKey, prefetchedData)));
        setPrefetchCache((prev) => {
          const newPrefetch = new Map(prev);
          newPrefetch.delete(newCacheKey);
          return newPrefetch;
        });
        
        // Trigger prefetch for the new date's adjacent dates
        setTimeout(() => {
          prefetchAdjacentDates(newDate);
        }, 1000);
      } else {
        console.log("⚠️ No prefetched data for:", newDateStr, "- will load fresh");
        // Reset loading states but don't clear cache completely
        setRetryCount(0);
      }
    },
    [currentDate, selectedFields, pitchId, prefetchCache, prefetchAdjacentDates]
  );

  const goToToday = useCallback(() => {
    setIsDateChanging(true);
    const today = new Date();
    const todayStr = timeslotService.formatDateForAPI(today);
    const currentStr = timeslotService.formatDateForAPI(currentDate);
    
    console.log("🏠 Going to today:", todayStr, "from:", currentStr);
    setCurrentDate(today);

    // Check for today's cached data
    const todayDateStr = timeslotService.formatDateForAPI(today);
    const sortedFields = [...selectedFields].sort();
    const todayCacheKey = `${pitchId}-${todayDateStr}-${sortedFields.join(
      ","
    )}`;

    const cachedToday =
      apiCache.get(todayCacheKey) || prefetchCache.get(todayCacheKey);
    if (cachedToday && Date.now() - cachedToday.timestamp < 120000) {
      console.log("✅ Using cached data for today:", todayStr);
      setTimeSlots(cachedToday.data);
      setApiStatus("success");
      setIsDateChanging(false);
      
      // Trigger prefetch for today's adjacent dates
      setTimeout(() => {
        prefetchAdjacentDates(today);
      }, 1000);
    } else {
      console.log("⚠️ No cached data for today:", todayStr, "- will load fresh");
      setRetryCount(0);
    }
  }, [selectedFields, pitchId, apiCache, prefetchCache, currentDate, prefetchAdjacentDates]);

  const handleBack = () => {
    navigate("/owner/pitches");
  };

  // Field selection helper
  const toggleFieldSelection = useCallback((field: string) => {
    setIsFieldSelectionUpdating(true);
    setSelectedFields((prev) => {
      const newFields = prev.includes(field) 
        ? prev.filter((f) => f !== field) 
        : [...prev, field];
      
      // Batch update after a short delay to prevent multiple refreshes
      setTimeout(() => {
        setIsFieldSelectionUpdating(false);
      }, 100);
      
      return newFields;
    });
  }, []);

  // Calculate statistics with proper slot counting including virtual slots
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentDateNormalized = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  const isToday = currentDateNormalized.getTime() === today.getTime();
  
  // Generate all possible slots for all selected fields
  const allPossibleSlots = hourSlots.flatMap(slot => 
    selectedFields.map(field => ({
      time: slot.time,
      field,
      slot: getBookingByTimeAndField(slot.time, field)
    }))
  );
  
  // Count by status including virtual slots with proper past logic
  const statusCounts = allPossibleSlots.reduce((counts, {slot}) => {
    let status = slot?.status || 'available';
    
    // For non-today dates, never count any slots as "past" - treat them as available
    if (!isToday) {
      if (status === 'past') {
        status = 'available';
      }
      // For past dates, if slot is available, keep it as available
      if (status === 'available' && slot?.isVirtual) {
        status = 'available';
      }
    } else {
      // Only for today, properly determine past status
      if (status === 'available' || status === 'past') {
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const slotHour = parseInt(slot?.time.split(':')[0] || '0');
        const slotMinute = parseInt(slot?.time.split(':')[1] || '0');
        
        const currentTotalMinutes = currentHour * 60 + currentMinute;
        const slotTotalMinutes = slotHour * 60 + slotMinute;
        
        if (slotTotalMinutes < currentTotalMinutes) {
          status = 'past';
        } else {
          status = 'available';
        }
      }
    }
    
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);
  
  const totalSlotsForDisplay = allPossibleSlots.length;
  const bookedSlots = statusCounts.booked || 0;
  const maintenanceSlots = statusCounts.maintenance || 0;
  // Critical fix: Only count past slots for TODAY, always 0 for other dates
  const pastSlots = isToday ? (statusCounts.past || 0) : 0;
  const availableSlots = statusCounts.available || 0;
  
  // For display: past dates show total excluding actual past time
  const displayAvailableSlots = isToday ? availableSlots : (totalSlotsForDisplay - bookedSlots - maintenanceSlots);
  const totalPossibleSlots = totalSlotsForDisplay;

  // Event handlers for tooltips and interactions
  React.useEffect(() => {
    const handleClickOutside = () => {
      hideContextMenu();
      hideTooltip();
    };
    if (contextMenu.visible || tooltipInfo.visible) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [contextMenu.visible, tooltipInfo.visible]);
  // Enhanced keyboard shortcuts with optimized navigation
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (contextMenu.visible) {
          hideContextMenu();
        } else if (tooltipInfo.visible) {
          hideTooltip();
        }
      } else if (event.key === "r" && event.ctrlKey) {
        event.preventDefault();
        manualRefresh();
      } else if (event.key === "ArrowLeft" && event.ctrlKey) {
        event.preventDefault();
        navigateDate(-1);
        toast.success("Chuyển sang ngày trước");
      } else if (event.key === "ArrowRight" && event.ctrlKey) {
        event.preventDefault();
        navigateDate(1);
        toast.success("Chuyển sang ngày sau");
      } else if (event.key === "h" && event.ctrlKey) {
        event.preventDefault();
        goToToday();
        toast.success("Về hôm nay");
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    contextMenu.visible,
    tooltipInfo.visible,
    manualRefresh,
    navigateDate,
    goToToday,
  ]);

  // Tooltip handlers - Enhanced with better positioning and interaction
  const showTooltip = (
    event: React.MouseEvent,
    timeSlot: TimeSlot | null,
    time: string,
    field: string
  ) => {
    // Prevent event bubbling
    event.preventDefault();
    event.stopPropagation();

    // Toggle tooltip if clicking on the same slot
    if (
      tooltipInfo.visible &&
      tooltipInfo.time === time &&
      tooltipInfo.field === field &&
      (tooltipInfo.timeSlot?.id === timeSlot?.id ||
        (!tooltipInfo.timeSlot && !timeSlot))
    ) {
      hideTooltip();
      return;
    }

    // Calculate better positioning to avoid overflow
    const rect = (event.target as Element).getBoundingClientRect();
    const x = Math.min(event.clientX, window.innerWidth - 320);
    const y = Math.max(Math.min(event.clientY, window.innerHeight - 200), 50);

    setTooltipInfo({
      visible: true,
      x: x,
      y: y,
      timeSlot,
      time,
      field,
    });
  };

  const hideTooltip = () => {
    setTooltipInfo({
      visible: false,
      x: 0,
      y: 0,
      timeSlot: null,
      time: "",
      field: "",
    });
  };

  // Helper function to get next time slot
  // Refresh time slots after peak hour update
  const refreshTimeSlots = useCallback(async () => {
    // Clear cache first
    setApiCache(new Map());

    // Reload data
    await loadBookedSlots();
  }, [loadBookedSlots]);
  // Maintenance handlers
  const handleTimeSlotClick = useCallback(
    (time: string, fieldId: string) => {
      // Check if time slot is in the past - IMPROVED LOGIC
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const slotDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        
      // Check if date is in the past
      if (slotDate < today) {
        toast.error("Không thể đặt bảo trì cho ngày trong quá khứ");
        return;
      }
      
      // If it's today, check if the time slot has passed
      if (slotDate.getTime() === today.getTime()) {
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const slotHour = parseInt(time.split(':')[0]);
        const slotMinute = parseInt(time.split(':')[1]);
        
        // Convert to total minutes for precise comparison
        const currentTotalMinutes = currentHour * 60 + currentMinute;
        const slotTotalMinutes = slotHour * 60 + slotMinute;
     
        // Time slot is past if its start time is before current time
        if (slotTotalMinutes < currentTotalMinutes) {
          toast.error(`Không thể đặt bảo trì cho khung giờ đã qua (${time}). Hiện tại: ${currentHour}:${currentMinute.toString().padStart(2, '0')}`);
          return;
        }
      }

      const operationKey = `${fieldId}-${time}`;

      // Check if operation is already pending
      if (maintenanceState.pendingOperations.has(operationKey)) {
        toast.warning("Đang xử lý yêu cầu trước đó, vui lòng đợi");
        return;
      }

      const existingSlot = getBookingByTimeAndField(time, fieldId);
      
      // Don't allow maintenance operations on past slots
      if (existingSlot?.status === "past" || existingSlot?.isPast) {
        toast.error("Không thể đặt bảo trì cho khung giờ đã qua");
        return;
      }

      const subField = subFields.find((sf) => sf.id === fieldId);
      if (!subField) {
        toast.error("Không tìm thấy thông tin sân");
        return;
      }

      // NEW: Allow maintenance on booked slots with confirmation
      if (existingSlot && existingSlot.status === "booked") {
        console.log("🔍 Setting up maintenance dialog for booked slot:", {
          existingSlot,
          time,
          fieldId,
          subField: subField.name
        });
        
        // Set up MaintenanceBookingConfirmDialog data for enhanced dialog
        maintenanceDialog.openDialog({
          timeSlot: `${time} - ${getNextTimeSlot(time)}`,
          fieldName: subField.name,
          fieldId: fieldId,
          customerInfo: {
            name: existingSlot.customerName || "Khách hàng",
            email: existingSlot.bookingDate ? "Sẽ được gửi qua hệ thống" : "N/A", // Show system message instead of N/A
            phone: existingSlot.customerPhone || "N/A"
          },
          estimatedRefundAmount: typeof existingSlot.price === 'number' ? existingSlot.price : getFieldPrice(fieldId) // Add refund amount
        });
        return; // Return early to show custom dialog
      }

      const endTime = getNextTimeSlot(time);
      const currentStatus =
        existingSlot?.isPast
          ? ("past" as const)
          : existingSlot?.status === "maintenance"
          ? ("maintenance" as const)
          : ("available" as const);

      // Prepare data for maintenance modal
      const maintenanceData = {
        slotId: existingSlot?.id || null,
        time,
        endTime,
        fieldId,
        fieldName: subField.name,
        date: timeslotService.formatDateForAPI(currentDate),
        currentStatus,
      };

      setSelectedTimeSlotForMaintenance(maintenanceData);
      setMaintenanceModalOpen(true);

      // Add to pending operations
      setMaintenanceState((prev) => ({
        ...prev,
        pendingOperations: new Map(prev.pendingOperations).set(operationKey, {
          type: currentStatus === "maintenance" ? "cancel" : "set",
          retryCount: 0,
          lastAttempt: Date.now(),
        }),
      }));
    },
    [
      currentDate,
      getBookingByTimeAndField,
      subFields,
      maintenanceState.pendingOperations,
    ]
  );

  // Cleanup maintenance state
  useEffect(() => {
    const cleanup = setInterval(() => {
      setMaintenanceState((prev) => {
        const now = Date.now();
        const newPendingOps = new Map(prev.pendingOperations);

        for (const [key, op] of newPendingOps) {
          if (now - op.lastAttempt > 300000) {
            // 5 minutes timeout
            newPendingOps.delete(key);
          }
        }

        return {
          ...prev,
          pendingOperations: newPendingOps,
        };
      });
    }, 60000); // Check every minute

    return () => clearInterval(cleanup);
  }, []);

  // Clear price cache when field data changes
  useEffect(() => {
    setFieldPriceCache(new Map());
  }, [subFields]);

  const handleMaintenanceConfirm = useCallback(
    async (reason: string, estimatedCompletion?: string) => {
      if (!selectedTimeSlotForMaintenance || !pitchId) {
        toast.error("Thông tin không hợp lệ");
        return;
      }

      const isCancel =
        selectedTimeSlotForMaintenance.currentStatus === "maintenance";
      const operationKey = `${selectedTimeSlotForMaintenance.fieldId}-${selectedTimeSlotForMaintenance.time}`;
      const originalAutoRefresh = autoRefreshEnabled;

      setMaintenanceLoading(true);
      setMaintenanceOperationInProgress(true);
      setOngoingMaintenanceOps((prev) => new Set(prev).add(operationKey));
      setAutoRefreshEnabled(false);

      try {
        const API_URL =
          import.meta.env.VITE_API_URL || "https://football-field-booking-backend.onrender.com/api";

        // Check if there's a booking for this slot that needs to be cancelled
        const existingSlot = getBookingByTimeAndField(
          selectedTimeSlotForMaintenance.time, 
          selectedTimeSlotForMaintenance.fieldId
        );
        
        // 🔥 CRITICAL FIX: Check bookingStatus for payment_pending (not status)
        // status field: 'available' | 'booked' | 'maintenance' | 'past'
        // bookingStatus field: 'confirmed' | 'payment_pending' | 'cancelled'
        const isPaymentPending = existingSlot.bookingStatus === "payment_pending";
        const isBooked = existingSlot.status === "booked" && !isPaymentPending;
        
        if (existingSlot && isBooked && existingSlot.id && !isCancel) {
          // Only cancel confirmed/paid bookings - NOT payment_pending
          console.log(`🔍 MAINTENANCE DEBUG: Processing booking ${existingSlot.id}`);
          console.log(`- status: ${existingSlot.status}`);
          console.log(`- bookingStatus: ${existingSlot.bookingStatus}`);
          console.log(`- isPaymentPending: ${isPaymentPending}`);
          console.log(`- isBooked: ${isBooked}`);
          
          if (isPaymentPending) {
            console.log(`🛡️ FRONTEND PROTECTION: Blocking payment_pending booking from maintenance`);
            toast.warning("Không thể đặt bảo trì cho booking đang chờ thanh toán");
            return;
          }
          
          toast.info("Đang hủy booking và hoàn tiền cho khách hàng...");
          
          try {
            const cancelResponse = await fetch(`${API_URL}/bookings/cancel-for-maintenance`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
              body: JSON.stringify({
                bookingId: existingSlot.id,
                maintenanceReason: reason
              }),
            });

            if (!cancelResponse.ok) {
              const cancelError = await cancelResponse.json().catch(() => ({}));
              throw new Error(cancelError.message || "Không thể hủy booking");
            }

            const cancelData = await cancelResponse.json();
            if (cancelData.success) {
              toast.success("Đã hủy booking và hoàn tiền cho khách hàng");
              
              // Force refresh data after booking cancellation
              console.log("🔄 Refreshing data after booking cancellation...");
              setApiCache(new Map());
              setPrefetchCache(new Map());
              await loadBookedSlots();
              
              // Since booking cancellation already sets maintenance, we don't need to call maintenance API
              toast.success("Đã đặt bảo trì thành công sau khi hủy booking!");
              return; // Exit early since maintenance is already set
            }
          } catch (cancelError) {
            console.error("❌ Error cancelling booking:", cancelError);
            toast.error(`Lỗi hủy booking: ${cancelError.message}`);
            return; // Don't proceed with maintenance if booking cancellation fails
          }
        }

        setApiCache(new Map());
        setPrefetchCache(new Map());

        toast.info(isCancel ? "Đang hủy bảo trì..." : "Đang đặt bảo trì...");

        // Tải lại dữ liệu mới nhất trước khi thực hiện thao tác
        const freshData = await loadBookedSlots();

        if (isCancel) {
          // Sử dụng slotId từ selectedTimeSlotForMaintenance hoặc tìm trong freshData
          let slotId = selectedTimeSlotForMaintenance.slotId;

          if (!slotId) {
            // Fallback: tìm slot bảo trì trong dữ liệu mới nhất
            // Tìm tất cả slots match theo field và time
            const candidateSlots = freshData.filter((slot) => {
              const fieldMatch =
                slot.field === selectedTimeSlotForMaintenance.fieldId;
              const timeMatch =
                slot.time === selectedTimeSlotForMaintenance.time ||
                slot.startTime === selectedTimeSlotForMaintenance.time;
          
              return fieldMatch && timeMatch;
            });
            // Tìm slot có status maintenance
            const maintenanceSlot = candidateSlots.find(
              (slot) => slot.status === "maintenance"
            );

            if (!maintenanceSlot?.id) {
              // Nếu không tìm thấy, thử với bất kỳ slot nào match field/time
              const anySlot = candidateSlots[0];
              if (anySlot?.id) {
                slotId = anySlot.id;
              } else {
                // Fallback cuối cùng: gọi API để tìm slot
                try {
                  const findResponse = await fetch(
                    `${API_URL}/slots/find?subFieldId=${selectedTimeSlotForMaintenance.fieldId}&date=${selectedTimeSlotForMaintenance.date}&startTime=${selectedTimeSlotForMaintenance.time}`,
                    {
                      headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                          "token"
                        )}`,
                      },
                    }
                  );

                  if (findResponse.ok) {
                    const findData = await findResponse.json();
                    if (findData.success && findData.data?.id) {
                      slotId = findData.data.id;
                    }
                  }
                } catch (apiError) {
                  console.error("❌ Error calling find API:", apiError);
                }

                if (!slotId) {
                  console.error(
                    "❌ No matching slots found. Available slots:",
                    freshData.map((s) => ({
                      id: s.id,
                      field: s.field,
                      time: s.time || s.startTime,
                      status: s.status,
                    }))
                  );
                  throw new Error(
                    "Không tìm thấy thông tin khung giờ để hủy bảo trì"
                  );
                }
              }
            } else {
              slotId = maintenanceSlot.id;
            }
          }
          
          // Gọi API hủy bảo trì với ID của slot
          const endpoint = `${API_URL}/maintenance/timeslots/${slotId}/maintenance`;

          const response = await fetch(endpoint, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("❌ API Error:", errorData);
            throw new Error(errorData.message || `Lỗi HTTP ${response.status}`);
          }

          const responseData = await response.json();
        } else {
          // Đặt bảo trì mới
          const endpoint = `${API_URL}/maintenance/timeslots/maintenance`;
          const body = {
            subFieldIds: [selectedTimeSlotForMaintenance.fieldId],
            startDate: selectedTimeSlotForMaintenance.date,
            startTime: selectedTimeSlotForMaintenance.time,
            endTime: selectedTimeSlotForMaintenance.endTime,
            reason,
            estimatedCompletion,
          };
          
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("❌ API Error:", errorData);
            throw new Error(errorData.message || `Lỗi HTTP ${response.status}`);
          }
        }
        
        // Đợi 45 giây để backend xử lý và socket cập nhật
        await new Promise((resolve) => setTimeout(resolve, 45000));

        // Tải lại dữ liệu để xác nhận thay đổi
        await loadBookedSlots();

        toast.success(
          isCancel ? "Đã hủy bảo trì thành công!" : "Đã đặt bảo trì thành công!"
        );
      } catch (error) {
        console.error("❌ Lỗi xử lý bảo trì:", error);
        toast.error(
          `Lỗi: ${
            error instanceof Error ? error.message : "Không thể xử lý yêu cầu"
          }`
        );
        await loadBookedSlots();
      } finally {
        setMaintenanceLoading(false);
        setMaintenanceOperationInProgress(false);
        setMaintenanceModalOpen(false);
        setSelectedTimeSlotForMaintenance(null);

        setOngoingMaintenanceOps((prev) => {
          const updated = new Set(prev);
          updated.delete(operationKey);
          return updated;
        });

        setTimeout(() => {
          setAutoRefreshEnabled(originalAutoRefresh);
        }, 5000);
      }
    },
    [
      pitchId,
      selectedTimeSlotForMaintenance,
      loadBookedSlots,
      autoRefreshEnabled,
      setApiCache,
      setPrefetchCache,
      getBookingByTimeAndField,
    ]
  );

  // Enhanced manual maintenance handler with booking cancellation support
  const handleAdvancedMaintenanceConfirm = useCallback(
    async (maintenanceData: MaintenanceData) => {
      if (!pitchId) {
        toast.error("Thông tin sân không hợp lệ");
        return;
      }

      const originalAutoRefresh = autoRefreshEnabled;
      setMaintenanceOperationInProgress(true);
      setAutoRefreshEnabled(false);

      try {
        const API_URL = import.meta.env.VITE_API_URL || "https://football-field-booking-backend.onrender.com/api";
        
        // Clear cache
        setApiCache(new Map());
        setPrefetchCache(new Map());

        // 🔥 NEW: Check for existing bookings that need to be cancelled
        const affectedBookings = [];
        const pendingPaymentBookings = [];
        
        if (maintenanceData.type === 'full-day') {
          // For full-day maintenance, check all time slots
          for (const hourSlot of hourSlots) {
            for (const fieldId of maintenanceData.subFieldIds) {
              const existingSlot = getBookingByTimeAndField(hourSlot.time, fieldId);
              if (existingSlot && existingSlot.id) {
                // 🔍 CRITICAL FIX: Use correct field names per TypeScript interface  
                const isPaymentPending = existingSlot.bookingStatus === "payment_pending";
                const isBooked = existingSlot.status === "booked" && !isPaymentPending;
                
                if (isBooked) {
                  affectedBookings.push({
                    bookingId: existingSlot.id,
                    timeSlot: `${hourSlot.time} - ${getNextTimeSlot(hourSlot.time)}`,
                    fieldName: getSubFieldName(fieldId),
                    customerName: existingSlot.customerName || "Khách hàng",
                    customerPhone: existingSlot.customerPhone,
                    totalPrice: existingSlot.finalPrice || 0,
                    fieldId: fieldId,
                    time: hourSlot.time
                  });
                } else if (isPaymentPending) {
                  pendingPaymentBookings.push({
                    timeSlot: `${hourSlot.time} - ${getNextTimeSlot(hourSlot.time)}`,
                    fieldName: getSubFieldName(fieldId),
                    customerName: existingSlot.customerName || "Khách hàng",
                    fieldId: fieldId,
                    time: hourSlot.time
                  });
                }
              }
            }
          }
        } else if (maintenanceData.timeSlots) {
          // For time slot maintenance, check ALL slots within the time range
          for (const timeSlot of maintenanceData.timeSlots) {
            // Generate all hour slots between startTime and endTime
            const startHour = parseInt(timeSlot.startTime.split(':')[0]);
            const endHour = parseInt(timeSlot.endTime.split(':')[0]);
            
            for (let hour = startHour; hour < endHour; hour++) {
              const hourTime = `${hour.toString().padStart(2, '0')}:00`;
              
              for (const fieldId of maintenanceData.subFieldIds) {
                const existingSlot = getBookingByTimeAndField(hourTime, fieldId);
                
                if (existingSlot && existingSlot.id) {
                  // 🔍 CRITICAL FIX: Check bookingStatus field for payment_pending
                  const isPaymentPending = existingSlot.bookingStatus === "payment_pending";
                  const isBooked = existingSlot.status === "booked" && !isPaymentPending;
                  
                  if (isBooked) {
                    // Check if this booking is already added (avoid duplicates)
                    const isDuplicate = affectedBookings.some(b => 
                      b.bookingId === existingSlot.id && b.fieldId === fieldId
                    );
                    
                    if (!isDuplicate) {
                      affectedBookings.push({
                        bookingId: existingSlot.id,
                        timeSlot: `${hourTime} - ${getNextTimeSlot(hourTime)}`,
                        fieldName: getSubFieldName(fieldId),
                        customerName: existingSlot.customerName || "Khách hàng",
                        customerPhone: existingSlot.customerPhone,
                        totalPrice: existingSlot.finalPrice || 0,
                        fieldId: fieldId,
                        time: hourTime
                      });
                    }
                  } else if (isPaymentPending) {
                    // Check if this pending payment is already added (avoid duplicates)
                    const isDuplicate = pendingPaymentBookings.some(b => 
                      b.fieldId === fieldId && b.time === hourTime
                    );
                    
                    if (!isDuplicate) {
                      pendingPaymentBookings.push({
                        timeSlot: `${hourTime} - ${getNextTimeSlot(hourTime)}`,
                        fieldName: getSubFieldName(fieldId),
                        customerName: existingSlot.customerName || "Khách hàng",
                        fieldId: fieldId,
                        time: hourTime
                      });
                    }
                  }
                }
              }
            }
          }
        }

        // Extract the booking confirmation logic to a separate function
        const handleMaintenanceWithBookings = async () => {
          // 🔥 NEW: If there are bookings to cancel, show confirmation dialog
          if (affectedBookings.length > 0) {
            const bookingList = affectedBookings.map(booking => 
              `• ${booking.timeSlot} - ${booking.fieldName} (${booking.customerName})`
            ).join('\n');

            let confirmMessage = `Bảo trì này sẽ ảnh hưởng đến ${affectedBookings.length} booking đã đặt:

${bookingList}

Hệ thống sẽ tự động:
- Hủy các booking này
- Hoàn tiền cho khách hàng qua Stripe
- Gửi email thông báo cho khách hàng`;

            // Add note about pending payment bookings if any
            if (pendingPaymentBookings.length > 0) {
              confirmMessage += `

📝 Lưu ý: ${pendingPaymentBookings.length} booking đang chờ thanh toán sẽ được bảo vệ và không bị ảnh hưởng.`;
            }

            confirmMessage += `

Bạn có muốn tiếp tục?`;

            showConfirmDialog(
              'Xác nhận hủy booking',
              confirmMessage,
              () => {
                confirmDialog.closeDialog();
                executeMaintenance();
              },
              {
                confirmText: 'Tiếp tục',
                cancelText: 'Hủy',
                type: 'danger'
              }
            );
            return;
          }

          // If no bookings to cancel but have pending payments, show info
          if (pendingPaymentBookings.length > 0 && affectedBookings.length === 0) {
            const pendingList = pendingPaymentBookings.map(booking => 
              `• ${booking.timeSlot} - ${booking.fieldName} (${booking.customerName})`
            ).join('\n');

            const infoMessage = `Chỉ có ${pendingPaymentBookings.length} booking đang chờ thanh toán:

${pendingList}

Các booking này sẽ được bảo vệ và slot tương ứng sẽ không thể đặt bảo trì.
Bảo trì sẽ được áp dụng cho tất cả các slot còn lại.

Bạn có muốn tiếp tục?`;

            showConfirmDialog(
              'Bảo trì với slot được bảo vệ',
              infoMessage,
              () => {
                confirmDialog.closeDialog();
                executeMaintenance();
              },
              {
                confirmText: 'Tiếp tục',
                cancelText: 'Hủy',
                type: 'info'
              }
            );
            return;
          }

          // If no bookings to cancel and no pending payments, execute maintenance directly
          executeMaintenance();
        };

        // 🔥 FIXED: Show warning for pending payment bookings but don't block completely
        if (pendingPaymentBookings.length > 0) {
          const pendingList = pendingPaymentBookings.map(booking => 
            `• ${booking.timeSlot} - ${booking.fieldName} (${booking.customerName})`
          ).join('\n');

          toast.warning(`⚠️ Phát hiện ${pendingPaymentBookings.length} booking đang chờ thanh toán sẽ được bỏ qua:
${pendingList}

Các slot này sẽ không bị ảnh hưởng bởi bảo trì.`, {
            duration: 8000 // Show for 8 seconds to ensure user sees it
          });
        }

        // Continue with the maintenance logic regardless of pending payments
        handleMaintenanceWithBookings();

        // Execute the maintenance logic
        const executeMaintenance = async () => {
          try {
            // 🔥 NEW: Cancel multiple bookings at once using the new API
            if (affectedBookings.length > 0) {
              toast.info(`Đang hủy ${affectedBookings.length} booking và hoàn tiền cho khách hàng...`);
              
              const cancelResponse = await fetch(`${API_URL}/bookings/cancel-multiple-for-maintenance`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({
                  bookingIds: affectedBookings.map(b => b.bookingId),
                  maintenanceReason: maintenanceData.reason || "Bảo trì nâng cao"
                }),
              });

              if (!cancelResponse.ok) {
                const cancelError = await cancelResponse.json().catch(() => ({}));
                throw new Error(cancelError.message || "Không thể hủy booking");
              }

              const cancelData = await cancelResponse.json();
              const cancellationResults = cancelData.data?.results || [];
              
              console.log("✅ Multiple cancellation results:", cancellationResults);

              // Check cancellation results
              const successfulCancellations = cancellationResults.filter(r => r.success);
              const failedCancellations = cancellationResults.filter(r => !r.success);

              if (failedCancellations.length > 0) {
                const failedList = failedCancellations.map(f => 
                  `• ${f.timeSlot} - ${f.customerName} (${f.error || 'Lỗi không xác định'})`
                ).join('\n');
                
                const failedMessage = `Không thể hủy ${failedCancellations.length} booking:

${failedList}

Bạn có muốn tiếp tục bảo trì với các slot còn lại?`;
                
                showConfirmDialog(
                  'Một số booking không thể hủy',
                  failedMessage,
                  () => {
                    confirmDialog.closeDialog();
                    proceedWithMaintenance();
                  },
                  {
                    confirmText: 'Tiếp tục',
                    cancelText: 'Hủy',
                    type: 'warning'
                  }
                );
                return;
              }

              if (successfulCancellations.length > 0) {
                const totalRefund = successfulCancellations.reduce((sum, c) => sum + (c.refundAmount || 0), 0);
                toast.success(`Đã hủy thành công ${successfulCancellations.length} booking`, {
                  description: `Tổng tiền hoàn: ${totalRefund.toLocaleString('vi-VN')}đ`
                });
                
                // Refresh data after cancellations
                await loadBookedSlots();
              }
            }

            // Continue with maintenance execution
            proceedWithMaintenance();
          } catch (error) {
            console.error("❌ Error cancelling multiple bookings:", error);
            toast.error(`Không thể hủy booking: ${error.message}`);
          }
        };

        const proceedWithMaintenance = async () => {
          // Continue with original maintenance logic
          toast.info(
            maintenanceData.type === 'full-day' 
              ? "Đang đặt bảo trì cả ngày..." 
              : "Đang đặt bảo trì theo khung giờ..."
          );

          // Execute maintenance based on type
          if (maintenanceData.type === 'full-day') {
            const endpoint = `${API_URL}/maintenance/timeslots/maintenance/full-day`;
            const body = {
              subFieldIds: maintenanceData.subFieldIds,
              date: maintenanceData.date,
              reason: maintenanceData.reason,
              estimatedCompletion: maintenanceData.estimatedCompletion,
            };

            const response = await fetch(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
              body: JSON.stringify(body),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              console.error("❌ API Error:", errorData);
              throw new Error(errorData.message || `Lỗi HTTP ${response.status}`);
            }

            const responseData = await response.json();
            
            if (responseData.success && responseData.data?.affected === 0) {
              if (responseData.data.message) {
                toast.warning(responseData.data.message);
              } else {
                toast.warning("Không có khung giờ nào cần cập nhật bảo trì");
              }
              return;
            }
          } else if (maintenanceData.timeSlots) {
            // Time slot maintenance logic
            const endpoint = `${API_URL}/maintenance/timeslots/maintenance`;
            
            let totalAffected = 0;
            let totalSkippedMaintenance = 0;
            let allMessages = [];
            
            const requests = maintenanceData.timeSlots.map(async (timeSlot) => {
              const body = {
                subFieldIds: maintenanceData.subFieldIds,
                startDate: maintenanceData.date,
                startTime: timeSlot.startTime,
                endTime: timeSlot.endTime,
                reason: maintenanceData.reason,
                estimatedCompletion: maintenanceData.estimatedCompletion,
              };

              const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify(body),
              });

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Lỗi HTTP ${response.status}`);
              }

              const responseData = await response.json();
              
              if (responseData.success && responseData.data) {
                totalAffected += responseData.data.affected || 0;
                totalSkippedMaintenance += responseData.data.skippedMaintenance || 0;
                if (responseData.data.message) {
                  allMessages.push(responseData.data.message);
                }
              }
              
              return responseData;
            });

            await Promise.all(requests);
            
            if (totalAffected === 0) {
              if (totalSkippedMaintenance > 0) {
                toast.warning(`Không có khung giờ nào cần cập nhật. ${totalSkippedMaintenance} khung giờ đã ở trạng thái bảo trì`);
              } else {
                const backendMessage = allMessages.length > 0 ? allMessages[0] : 'Không có khung giờ nào phù hợp để đặt bảo trì';
                toast.warning(backendMessage);
              }
              return;
            }
          }

          // Wait for backend processing
          await new Promise((resolve) => setTimeout(resolve, 3000));
          await loadBookedSlots();

          // 🔥 NEW: Enhanced success message
          let successMessage = maintenanceData.type === 'full-day'
            ? "Đã đặt bảo trì cả ngày thành công!"
            : "Đã đặt bảo trì theo khung giờ thành công!";

          if (affectedBookings.length > 0) {
            successMessage += ` Đã xử lý ${affectedBookings.length} booking bị ảnh hưởng.`;
          }

          toast.success(successMessage);
        };

        // Start the maintenance process
        if (pendingPaymentBookings.length === 0) {
          handleMaintenanceWithBookings();
        }

        // Continue with original maintenance logic
        toast.info(
          maintenanceData.type === 'full-day' 
            ? "Đang đặt bảo trì cả ngày..." 
            : "Đang đặt bảo trì theo khung giờ..."
        );

        // Execute maintenance based on type
        if (maintenanceData.type === 'full-day') {
          const endpoint = `${API_URL}/maintenance/timeslots/maintenance/full-day`;
          const body = {
            subFieldIds: maintenanceData.subFieldIds,
            date: maintenanceData.date,
            reason: maintenanceData.reason,
            estimatedCompletion: maintenanceData.estimatedCompletion,
          };

          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("❌ API Error:", errorData);
            throw new Error(errorData.message || `Lỗi HTTP ${response.status}`);
          }

          const responseData = await response.json();
          
          if (responseData.success && responseData.data?.affected === 0) {
            if (responseData.data.message) {
              toast.warning(responseData.data.message);
            } else {
              toast.warning("Không có khung giờ nào cần cập nhật bảo trì");
            }
            return;
          }
        } else if (maintenanceData.timeSlots) {
          // Time slot maintenance logic
          const endpoint = `${API_URL}/maintenance/timeslots/maintenance`;
          
          let totalAffected = 0;
          let totalSkippedMaintenance = 0;
          let allMessages = [];
          
          const requests = maintenanceData.timeSlots.map(async (timeSlot) => {
            const body = {
              subFieldIds: maintenanceData.subFieldIds,
              startDate: maintenanceData.date,
              startTime: timeSlot.startTime,
              endTime: timeSlot.endTime,
              reason: maintenanceData.reason,
              estimatedCompletion: maintenanceData.estimatedCompletion,
            };

            const response = await fetch(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
              body: JSON.stringify(body),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.message || `Lỗi HTTP ${response.status}`);
            }

            const responseData = await response.json();
            
            if (responseData.success && responseData.data) {
              totalAffected += responseData.data.affected || 0;
              totalSkippedMaintenance += responseData.data.skippedMaintenance || 0;
              if (responseData.data.message) {
                allMessages.push(responseData.data.message);
              }
            }
            
            return responseData;
          });

          await Promise.all(requests);
          
          if (totalAffected === 0) {
            if (totalSkippedMaintenance > 0) {
              toast.warning(`Không có khung giờ nào cần cập nhật. ${totalSkippedMaintenance} khung giờ đã ở trạng thái bảo trì`);
            } else {
              const backendMessage = allMessages.length > 0 ? allMessages[0] : 'Không có khung giờ nào phù hợp để đặt bảo trì';
              toast.warning(backendMessage);
            }
            return;
          }
        }

        // Wait for backend processing
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await loadBookedSlots();

        // 🔥 NEW: Enhanced success message
        let successMessage = maintenanceData.type === 'full-day'
          ? "Đã đặt bảo trì cả ngày thành công!"
          : "Đã đặt bảo trì theo khung giờ thành công!";

        if (affectedBookings.length > 0) {
          successMessage += ` Đã xử lý ${affectedBookings.length} booking bị ảnh hưởng.`;
        }

        toast.success(successMessage);

      } catch (error) {
        console.error("❌ Lỗi xử lý bảo trì nâng cao:", error);
        toast.error(
          `Lỗi: ${
            error instanceof Error ? error.message : "Không thể xử lý yêu cầu"
          }`
        );
        await loadBookedSlots();
      } finally {
        setMaintenanceOperationInProgress(false);
        setAdvancedMaintenanceModalOpen(false);

        setTimeout(() => {
          setAutoRefreshEnabled(originalAutoRefresh);
        }, 5000);
      }
    },
    [
      pitchId,
      loadBookedSlots,
      autoRefreshEnabled,
      setApiCache,
      setPrefetchCache,
      hourSlots,
      getBookingByTimeAndField,
      getSubFieldName,
      getNextTimeSlot,
    ]
  );

  // Add new state at the top with other states
  const [isFieldSelectionUpdating, setIsFieldSelectionUpdating] = useState(false);

  // Modify the useEffect that watches selectedFields
  useEffect(() => {
    if (isFieldSelectionUpdating) return;

    // Use current selected date instead of today
    const currentDateStr = timeslotService.formatDateForAPI(currentDate);
    const sortedFields = [...selectedFields].sort();
    const currentCacheKey = `${pitchId}-${currentDateStr}-${sortedFields.join(",")}`;

    console.log("🔄 Field selection changed, checking cache for:", currentDateStr);

    const cachedData = apiCache.get(currentCacheKey) || prefetchCache.get(currentCacheKey);
    if (cachedData && Date.now() - cachedData.timestamp < 120000) {
      console.log("✅ Using cached data for field selection change:", currentDateStr);
      setTimeSlots(cachedData.data);
      setApiStatus("success");
      setIsDateChanging(false);
    } else {
      console.log("⚠️ No cached data for field selection, loading fresh:", currentDateStr);
      setRetryCount(0);
      loadBookedSlots(currentDate);
    }
  }, [selectedFields, pitchId, apiCache, prefetchCache, isFieldSelectionUpdating, currentDate]);

  // Enhanced cleanup for all intervals and timeouts
  useEffect(() => {
    return () => {
      // Clear auto-refresh interval
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
      
      // Clear prefetch timeout
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
        prefetchTimeoutRef.current = null;
      }
    };
  }, []);

  // Socket.IO listener for real-time maintenance updates
  useEffect(() => {
    // Only set up socket listener if we have the necessary data
    if (!pitchId || selectedFields.length === 0) return;

    // Import socket connection
    const setupSocketListener = async () => {
      try {
        // Dynamically import socket connection
        const { io } = await import('socket.io-client');
        const API_URL = import.meta.env.VITE_BACKEND_URL || "https://football-field-booking-backend.onrender.com";
        const token = localStorage.getItem("token");
        
        if (!token) {
          console.warn('No token found, skipping socket connection');
          return () => {};
        }

        console.log('Setting up socket connection to:', API_URL);
        
        const socket = io(API_URL, {
          auth: {
            token: token
          },
          transports: ['websocket', 'polling'],
          forceNew: true,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        });

        // Connection event handlers
        socket.on('connect', () => {
          console.log('✅ Socket connected successfully');
        });

        socket.on('connect_error', (error) => {
          console.error('❌ Socket connection error:', error.message);
          if (error.message.includes('Authentication error')) {
            console.warn('Token might be expired or invalid');
            // Optionally redirect to login or refresh token
          }
        });

        socket.on('disconnect', (reason) => {
          console.log('🔌 Socket disconnected:', reason);
        });

        // Listen for maintenance events
        socket.on('timeslot_maintenance_set', (data) => {
          console.log('🔧 Received maintenance event:', data);
          console.log('🔍 Current selectedFields:', selectedFields);
          console.log('🎯 Event subFieldId:', data.subFieldId);
          
          // Check if this maintenance affects our current view
          if (data.subFieldId && selectedFields.includes(data.subFieldId)) {
            console.log('🔄 Refreshing data due to maintenance update');
            toast.info("Trạng thái bảo trì đã được cập nhật", {
              description: `Sân ${data.subFieldId} đã chuyển sang chế độ bảo trì`
            });
            
            // Clear cache and refresh immediately
            setApiCache(new Map());
            setPrefetchCache(new Map());
            
            // Force immediate refresh
            setTimeout(() => {
              loadBookedSlots();
            }, 100);
          } else {
            console.log('⚠️ Maintenance event not affecting current view');
            console.log('Selected fields:', selectedFields);
            console.log('Event subFieldId:', data.subFieldId);
            
            // Still refresh if no specific field filtering
            if (selectedFields.length === 0) {
              console.log('🔄 Refreshing all data due to maintenance update');
              toast.info("Trạng thái bảo trì đã được cập nhật");
              setApiCache(new Map());
              setPrefetchCache(new Map());
              setTimeout(() => {
                loadBookedSlots();
              }, 100);
            }
          }
        });

        // Listen for booking cancellation events
        socket.on('booking_cancelled', (data) => {
          console.log('📋 Received booking cancellation event:', data);
          
          if (data.refresh_needed) {
            console.log('🔄 Refreshing data due to booking cancellation');
            toast.info("Booking đã bị hủy - đang cập nhật");
            
            // Clear cache and refresh
            setApiCache(new Map());
            setPrefetchCache(new Map());
            setTimeout(() => {
              loadBookedSlots();
            }, 100);
          }
        });

        // Cleanup function
        return () => {
          socket.off('connect');
          socket.off('connect_error');
          socket.off('disconnect');
          socket.off('timeslot_maintenance_set');
          socket.off('booking_cancelled');
          socket.disconnect();
        };
      } catch (error) {
        console.error('❌ Error setting up socket listener:', error);
        return () => {}; // Return empty cleanup function
      }
    };

    const cleanup = setupSocketListener();
    
    // Return cleanup function
    return () => {
      cleanup.then(cleanupFn => cleanupFn && cleanupFn());
    };
  }, [pitchId, selectedFields.join(','), loadBookedSlots, setApiCache, setPrefetchCache]);

  return (
    <div className="flex h-screen bg-gray-50">
     
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            Quản lý khung giờ
          </h2>
          <p className="text-sm text-gray-600">{pitchName}</p>
        </div>{" "}
        {/* Quick Actions */}
        <div className="p-4 border-b">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Thao tác nhanh
          </h3>{" "}
          <div className="space-y-2">
            {" "}
            <button
              onClick={manualRefresh}
              disabled={isLoading}
              className="w-full px-3 py-3 bg-[#1967D2] text-white rounded-lg hover:bg-[#1557B0] disabled:opacity-50 font-medium transition-all duration-200 shadow-sm hover:shadow-md"
              title="Làm mới dữ liệu booking (Ctrl+R)"
            >
              <i
                className={`fas ${
                  isLoading ? "fa-spinner fa-spin" : "fa-sync"
                } mr-2`}
              ></i>
              {isLoading ? "Đang tải..." : "Làm mới"}
            </button>
            {apiStatus === "success" && (
              <div className="text-xs text-green-600 mt-1 flex items-center">
                <i className="fas fa-check-circle mr-1"></i>
                Dữ liệu đã cập nhật
              </div>
            )}
            {apiStatus === "error" && retryCount > 0 && (
              <div className="text-xs text-orange-600 mt-1 flex items-center">
                <i className="fas fa-exclamation-triangle mr-1"></i>
                Đang thử lại... ({retryCount}/3)
              </div>
            )}
            <button
              onClick={() => navigate(`/owner/reports`)}
              className="w-full px-3 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 font-medium transition-all duration-200 shadow-sm hover:shadow-md"
              title="Xem báo cáo và quản lý booking"
            >
              <i className="fas fa-list mr-2"></i>
              Quản lý booking
            </button>{" "}
            {/* Peak Hour Settings Button */}
            <button
              onClick={() => setPeakHourModalOpen(true)}
              className="w-full px-3 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium transition-all duration-200 shadow-sm hover:shadow-md"
              title="Cài đặt giờ cao điểm và hệ số giá"
            >
              <i className="fas fa-clock mr-2"></i>
              Giờ cao điểm
            </button>
            
            <button
              onClick={() => setAdvancedMaintenanceModalOpen(true)}
              className="w-full px-3 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 font-medium transition-all duration-200 shadow-sm hover:shadow-md"
              title="Bảo trì nâng cao - theo ngày hoặc khung giờ"
            >
              <i className="fas fa-tools mr-2"></i>
              Bảo trì nâng cao
            </button>
          </div>
        </div>{" "}
        {/* Field Selection */}
        <div className="p-4 border-b">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Chọn sân</h3>
          <div className="space-y-3">
            <div className="flex items-center p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
              <input
                type="checkbox"
                id="all-fields"
                checked={selectedFields.length === subFields.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedFields(subFields.map((sf) => sf.id));
                  } else {
                    setSelectedFields([]);
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />{" "}
              <label
                htmlFor="all-fields"
                className="text-sm font-medium cursor-pointer ml-2 text-gray-900"
              >
                Tất cả sân ({subFields.length})
              </label>
            </div>{" "}
            {subFields.map((subField) => {
              const fieldBookings = timeSlots.filter(
                (slot) => slot.field === subField.id && slot.status === "booked"
              );
              const fieldMaintenanceSlots = timeSlots.filter(
                (slot) =>
                  slot.field === subField.id && slot.status === "maintenance"
              );
              
              // Calculate available slots for this field (exclude past slots for today)
              let fieldAvailableSlots = hourSlots.length;
              if (isToday) {
                const currentHour = now.getHours();
                const currentMinute = now.getMinutes();
                const currentTotalMinutes = currentHour * 60 + currentMinute;
                
                fieldAvailableSlots = hourSlots.filter(slot => {
                  const slotHour = parseInt(slot.time.split(':')[0]);
                  const slotMinute = parseInt(slot.time.split(':')[1]);
                  const slotTotalMinutes = slotHour * 60 + slotMinute;
                  return slotTotalMinutes >= currentTotalMinutes;
                }).length;
              }
              
              const totalSlots = hourSlots.length; // Total slots in a day (for display)
              const bookedSlots = fieldBookings.length;
              const maintenanceSlots = fieldMaintenanceSlots.length;
              const availableSlots = fieldAvailableSlots - bookedSlots - maintenanceSlots;
              const isSelected = selectedFields.includes(subField.id); // Define colors for each field with distinct colors
              const fieldColors = {
                a: {
                  bg: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)",
                  text: "#065f46",
                  border: "#10b981",
                  dot: "#10b981",
                }, // Green
                b: {
                  bg: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
                  text: "#1e40af",
                  border: "#3b82f6",
                  dot: "#3b82f6",
                }, // Blue
                c: {
                  bg: "linear-gradient(135deg, #e9d5ff 0%, #d8b4fe 100%)",
                  text: "#581c87",
                  border: "#8b5cf6",
                  dot: "#8b5cf6",
                }, // Purple
                d: {
                  bg: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                  text: "#92400e",
                  border: "#f59e0b",
                  dot: "#f59e0b",
                }, // Orange
                e: {
                  bg: "linear-gradient(135deg, #fecaca 0%, #fca5a5 100%)",
                  text: "#991b1b",
                  border: "#ef4444",
                  dot: "#ef4444",
                }, // Red
              };
              // Extract field letter from subField.name (A, B, C, D, E)
              // Handle cases like "A", "Sân A", "Field A", etc.
              let fieldLetter = "a"; // default
              const nameUpper = subField.name.toUpperCase();

              // Try different patterns to extract field letter
              if (/[A-E]/.test(nameUpper)) {
                const match = nameUpper.match(/([A-E])/);
                if (match) {
                  fieldLetter = match[1].toLowerCase();
                }
              }

              const fieldKey = ["a", "b", "c", "d", "e"].includes(fieldLetter)
                ? (fieldLetter as "a" | "b" | "c" | "d" | "e")
                : "a";
              const colors = fieldColors[fieldKey];

              return (
                <div
                  key={subField.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 hover:shadow-sm ${
                    isSelected
                      ? "shadow-sm"
                      : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                  }`}
                  style={
                    isSelected
                      ? {
                          background: colors.bg,
                          borderColor: colors.border,
                          color: "#1f2937", // Màu xám đậm để đảm bảo dễ đọc
                        }
                      : {}
                  }
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full shadow-sm border"
                      style={{
                        background: `linear-gradient(135deg, ${colors.dot}, ${colors.dot}dd)`,
                        borderColor: colors.border,
                        boxShadow: `0 1px 3px ${colors.dot}44`,
                      }}
                    ></div>{" "}
                    <input
                      type="checkbox"
                      id={`field-${subField.id}`}
                      checked={isSelected}
                      onChange={() => toggleFieldSelection(subField.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label
                      htmlFor={`field-${subField.id}`}
                      className={`text-sm font-medium cursor-pointer ${
                        isSelected ? "text-gray-900" : "text-gray-700"
                      }`}
                    >
                      {subField.name.startsWith("Sân ")
                        ? subField.name
                        : `Sân ${subField.name}`}
                    </label>
                  </div>{" "}
                  <div
                    className={`text-xs font-medium ${
                      isSelected ? "text-gray-800" : "text-gray-500"
                    }`}
                  >
                    {" "}
                    <div className="flex items-center space-x-1">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          isSelected
                            ? "bg-white bg-opacity-20 text-gray-900"
                            : "bg-gray-100 text-gray-700"
                        }`}
                        title="Sân trống"
                      >
                        <i className="fas fa-clock mr-1"></i>
                        {availableSlots}
                      </span>{" "}
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          isSelected
                            ? "bg-white bg-opacity-20 text-gray-900"
                            : "bg-green-100 text-green-700"
                        }`}
                        title="Đã đặt"
                      >
                        <i className="fas fa-check mr-1"></i>
                        {bookedSlots}
                      </span>
                      {maintenanceSlots > 0 && (
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            isSelected
                              ? "bg-white bg-opacity-20 text-gray-900"
                              : "bg-red-100 text-red-700"
                          }`}
                          title="Bảo trì"
                        >
                          <i className="fas fa-wrench mr-1"></i>
                          {maintenanceSlots}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Keyboard Shortcuts Help */}
        <div className="p-4 border-b bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Phím tắt</h3>{" "}
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Làm mới:</span>
              <kbd className="px-1 bg-gray-200 rounded">Ctrl+R</kbd>
            </div>
            <div className="flex justify-between">
              <span>Hôm nay:</span>
              <kbd className="px-1 bg-gray-200 rounded">Ctrl+H</kbd>
            </div>
            <div className="flex justify-between">
              <span>Ngày trước/sau:</span>
              <kbd className="px-1 bg-gray-200 rounded">Ctrl+←/→</kbd>
            </div>
          </div>
        </div>{" "}
        {/* Enhanced API Status with Date Changing Indicator */}
        {(apiStatus !== "idle" ||
          isDateChanging ||
          ongoingMaintenanceOps.size > 0) && (
          <div className="p-4 border-b space-y-2">
            {(apiStatus !== "idle" || isDateChanging) && (
              <div
                className={`text-sm px-2 py-1 rounded flex items-center `}
              >
                {isDateChanging && (
                  <>
                    <div className="animate-spin w-3 h-3 border border-orange-600 border-t-transparent rounded-full mr-2"></div>
                    Đang chuyển ngày...
                  </>
                )}
                {!isDateChanging && apiStatus === "loading" && (
                  <>
                    <div className="animate-spin w-3 h-3 border border-blue-600 border-t-transparent rounded-full mr-2"></div>
                    Đang tải...
                  </>
                )}
               
              </div>
            )}

            {/* Maintenance Operations Indicator */}
            {ongoingMaintenanceOps.size > 0 && (
              <div className="text-sm px-2 py-1 rounded flex items-center bg-yellow-100 text-yellow-800">
                <div className="animate-pulse w-3 h-3 bg-yellow-600 rounded-full mr-2"></div>
                Đang cập nhật bảo trì ({ongoingMaintenanceOps.size})
              </div>
            )}
          </div>
        )}
        {/* Quick Stats Summary */}
        
        
      </div>
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              {" "}
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all duration-200 border border-gray-300 font-medium"
                title="Quay về danh sách sân"
              >
                <i className="fas fa-arrow-left mr-2"></i> Quay lại
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">{pitchName}</h1>
                <div className="text-sm text-gray-500">
                  {formatDateWithDay(currentDate)}
                </div>
              </div>
            </div>{" "}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateDate(-1)}
                disabled={isDateChanging || isLoading}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all duration-200 border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Ngày trước"
              >
                {isDateChanging ? (
                  <div className="animate-spin w-4 h-4 border border-gray-400 border-t-transparent rounded-full"></div>
                ) : (
                  <i className="fas fa-chevron-left"></i>
                )}
              </button>
              <button
                onClick={goToToday}
                disabled={isDateChanging || isLoading}
                className="px-4 py-2 bg-[#1967D2] text-white rounded-lg hover:bg-[#1557B0] transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                title="Về ngày hôm nay"
              >
                {isDateChanging ? (
                  <div className="flex items-center">
                    <div className="animate-spin w-4 h-4 border border-white border-t-transparent rounded-full mr-2"></div>
                    Đang tải...
                  </div>
                ) : (
                  "Hôm nay"
                )}
              </button>
              <button
                onClick={() => navigateDate(1)}
                disabled={isDateChanging || isLoading}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all duration-200 border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Ngày tiếp theo"
              >
                {isDateChanging ? (
                  <div className="animate-spin w-4 h-4 border border-gray-400 border-t-transparent rounded-full"></div>
                ) : (
                  <i className="fas fa-chevron-right"></i>
                )}
              </button>
              <button
                onClick={manualRefresh}
                disabled={isLoading || isDateChanging}
                className="px-4 py-2 border border-[#5F6368] text-[#5F6368] rounded-lg hover:bg-[#5F6368] hover:text-white disabled:opacity-50 transition-all duration-200"
                title="Làm mới dữ liệu"
              >
                <i
                  className={`fas fa-sync mr-2 ${
                    isLoading ? "animate-spin" : ""
                  }`}
                ></i>{" "}
                Làm mới
              </button>
            </div>
          </div>
        </div>{" "}
        {/* Enhanced Statistics Cards - Shows available stats for selected date */}
        <div className="bg-white p-6 border-b">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-800">
              Thống kê khung giờ
            </h2>
            <div className="text-sm text-gray-500">
              {isToday ? (
                <>
                  Khả dụng: <span className="font-semibold text-gray-700">{totalPossibleSlots}</span> / 
                  Tổng: <span className="font-semibold text-gray-700">{totalSlotsForDisplay}</span> khung giờ hôm nay
                </>
              ) : (
                <>
                  Tổng: <span className="font-semibold text-gray-700">{totalSlotsForDisplay}</span> khung giờ cho ngày {formatDateWithDay(currentDate)}
                  {!isToday && (
                    <span className="text-gray-500 ml-2">
                      ({displayAvailableSlots} trống, {bookedSlots} đã đặt, {maintenanceSlots} bảo trì)
                    </span>
                  )}
                  {isToday && pastSlots > 0 && (
                    <span className="text-gray-500 ml-2">
                      ({pastSlots} đã qua, {displayAvailableSlots + bookedSlots + maintenanceSlots} hiện tại)
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
          <div className={`grid grid-cols-1 gap-6 ${isToday ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
            {/* Sân trống */}
            <div
              className="stats-card stats-card-green bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200 hover:shadow-lg transition-all duration-200"
              title={`Số khung giờ còn trống và có thể đặt cho ngày ${formatDateWithDay(currentDate)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 mr-4 shadow-sm">
                    <i className="fas fa-futbol text-lg"></i>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-700">
                      {displayAvailableSlots}
                    </div>
                    <div className="text-sm text-green-600 font-medium">
                      Sân trống
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full font-medium">
                    {totalSlotsForDisplay > 0
                      ? Math.round((displayAvailableSlots / totalSlotsForDisplay) * 100)
                      : 0}
                    %
                  </div>
                  <div className="text-xs text-green-500 mt-1">Khả dụng</div>
                </div>
              </div>
            </div>

            {/* Đã đặt */}
            <div
              className="stats-card stats-card-blue bg-gradient-to-br from-blue-50 to-sky-50 p-4 rounded-xl border border-blue-200 hover:shadow-lg transition-all duration-200"
              title={`Số khung giờ đã được khách hàng đặt cho ngày ${formatDateWithDay(currentDate)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-4 shadow-sm">
                    <i className="fas fa-calendar-check text-lg"></i>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-700">
                      {bookedSlots}
                    </div>
                    <div className="text-sm text-blue-600 font-medium">
                      Đã đặt
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full font-medium">
                    {totalSlotsForDisplay > 0
                      ? Math.round((bookedSlots / totalSlotsForDisplay) * 100)
                      : 0}
                    %
                  </div>
                  <div className="text-xs text-blue-500 mt-1">Doanh thu</div>
                </div>
              </div>
            </div>

            {/* Bảo trì */}
            <div
              className="stats-card stats-card-red bg-gradient-to-br from-red-50 to-rose-50 p-4 rounded-xl border border-red-200 hover:shadow-lg transition-all duration-200"
              title={`Số khung giờ đang trong trạng thái bảo trì cho ngày ${formatDateWithDay(currentDate)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mr-4 shadow-sm">
                    <i className="fas fa-wrench text-lg"></i>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-700">
                      {maintenanceSlots}
                    </div>
                    <div className="text-sm text-red-600 font-medium">
                      Bảo trì
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full font-medium">
                    {totalSlotsForDisplay > 0
                      ? Math.round((maintenanceSlots / totalSlotsForDisplay) * 100)
                      : 0}
                    %
                  </div>
                  <div className="text-xs text-red-500 mt-1">Tạm ngưng</div>
                </div>
              </div>
            </div>

            {/* Đã qua (chỉ hiển thị cho hôm nay) */}
            {isToday && (
              <div
                className="stats-card stats-card-gray bg-gradient-to-br from-gray-50 to-slate-50 p-4 rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-200"
                title={`Số khung giờ đã qua hôm nay`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 mr-4 shadow-sm">
                      <i className="fas fa-clock text-lg"></i>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-700">
                        {pastSlots}
                      </div>
                      <div className="text-sm text-gray-600 font-medium">
                        Đã qua
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full font-medium">
                      {totalSlotsForDisplay > 0
                        ? Math.round((pastSlots / totalSlotsForDisplay) * 100)
                        : 0}
                      %
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Không thể đặt</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Time Slots Grid */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 time-grid-container grid-lines">
            {" "}
            {/* Field Headers */}
            <div className="flex mb-4">
              <div className="w-16"></div>{" "}
              {selectedFields.map((fieldId) => {
                const subField = subFields.find((sf) => sf.id === fieldId);
                if (!subField) return null;

                // Define colors for field headers
                const fieldColors = {
                  a: {
                    bg: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)",
                    text: "#065f46",
                    border: "#10b981",
                  },
                  b: {
                    bg: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
                    text: "#1e40af",
                    border: "#3b82f6",
                  },
                  c: {
                    bg: "linear-gradient(135deg, #e9d5ff 0%, #d8b4fe 100%)",
                    text: "#7c2d12",
                    border: "#8b5cf6",
                  },
                  d: {
                    bg: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                    text: "#92400e",
                    border: "#f59e0b",
                  },
                  e: {
                    bg: "linear-gradient(135deg, #fecaca 0%, #fca5a5 100%)",
                    text: "#991b1b",
                    border: "#ef4444",
                  },
                };
                // Extract field letter from subField.name (A, B, C, D, E) - same logic as sidebar
                let fieldLetter = "a"; // default
                const nameUpper = subField.name.toUpperCase();

                // Try different patterns to extract field letter
                if (/[A-E]/.test(nameUpper)) {
                  const match = nameUpper.match(/([A-E])/);
                  if (match) {
                    fieldLetter = match[1].toLowerCase();
                  }
                }

                const fieldKey = ["a", "b", "c", "d", "e"].includes(fieldLetter)
                  ? (fieldLetter as "a" | "b" | "c" | "d" | "e")
                  : "a";
                const colors = fieldColors[fieldKey];

                // Clean field name display
                const cleanFieldName = subField.name.startsWith("Sân ")
                  ? subField.name
                  : `Sân ${subField.name}`;

                return (
                  <div key={fieldId} className="flex-1 text-center">
                    <div
                      className="inline-flex items-center justify-center px-3 py-2 rounded-full shadow-sm hover:shadow-md transition-all duration-200 border"
                      style={{
                        background: colors.bg,
                        color: colors.text,
                        borderColor: colors.border,
                      }}
                      title={`${cleanFieldName} - ${getFieldColorName(
                        fieldLetter.toUpperCase() as "A" | "B" | "C" | "D" | "E"
                      )}`}
                    >
                      <span className="text-sm font-semibold">
                        {cleanFieldName}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Time Slots Grid */}
            {hourSlots.map((slot, index) => (
              <div key={slot.time} className="relative time-slot-row">
                {/* Horizontal time divider line */}
                <div className="absolute left-0 right-0 top-1/2 h-px bg-gray-200 z-0"></div>
                <div className="flex relative z-20">
                  <div className="w-20 py-3 pr-4 text-right text-sm text-gray-600 font-medium relative time-label flex flex-col justify-center">
                    <div className="relative flex flex-col items-end">
                      <div className="text-sm font-bold text-gray-700 leading-tight">
                        {slot.time}
                      </div>
                      <div className="text-xs text-gray-400 leading-tight">
                        {getNextTimeSlot(slot.time)}
                      </div>
                      <div className="absolute -right-3 top-2 w-2 h-2 bg-gray-400 rounded-full z-30"></div>
                    </div>
                  </div>{" "}
                  {selectedFields.map((field) => {
                    const booking = getBookingByTimeAndField(slot.time, field);

                    // Use the processed slot status (including virtual slots)
                    const currentSlotStatus = booking?.status || "available";

                    // Use consistent status for all conditions with proper past date handling
                    const isMaintenance = currentSlotStatus === "maintenance";
                    const isBooked = currentSlotStatus === "booked";
                    
                    // Enhanced past slot logic - FIXED for old dates
                    let isPastTimeSlot = false;
                    if (isToday) {
                      // For today, check if time has passed
                      isPastTimeSlot = currentSlotStatus === "past" || booking?.isPast;
                    } else {
                      // CRITICAL FIX: For past dates, NEVER mark empty slots as past
                      // This prevents visual inconsistency and layout issues
                      // Past dates should show normal available/booked/maintenance slots
                      isPastTimeSlot = false;
                    }
                    
                    const isAvailable = currentSlotStatus === "available" && !isPastTimeSlot;

                    // ✅ Get accurate price with peak hour multiplier
                    const formattedPrice = getSlotPrice(
                      booking,
                      field,
                      slot.time
                    );

                    return (
                      <div key={`${slot.time}-${field}`} className="flex-1 p-1">
                        {" "}
                        <div
                          className={`h-32 rounded-lg select-none time-slot-cell transition-all duration-200 p-3 ${
                            isPastTimeSlot
                              ? "bg-gray-100 border-2 border-gray-300 opacity-50 cursor-not-allowed"
                              : isLoading || maintenanceOperationInProgress
                              ? "loading-time-slot bg-gray-100 border-2 border-gray-200 cursor-wait"
                              : isMaintenance
                              ? "time-slot-maintenance bg-red-50 border-2 border-red-400 hover:border-red-500 hover:shadow-md cursor-pointer"
                              : isBooked
                              ? "time-slot-booked bg-blue-50 border-2 border-blue-400 hover:border-blue-500 hover:shadow-md cursor-pointer"
                              : isAvailable
                              ? "time-slot-available bg-green-50 border-2 border-green-400 hover:border-green-500 hover:bg-green-100 cursor-pointer"
                              : "bg-gray-50 border-2 border-gray-300 cursor-default"
                          }`}
                          
                          title={
                            isPastTimeSlot
                              ? "Khung giờ này đã qua - Không thể đặt bảo trì"
                              : undefined
                          }
                          onContextMenu={
                            isPastTimeSlot || isLoading || maintenanceOperationInProgress
                              ? undefined
                              : (e) => handleContextMenu(e, booking)
                          }
                          onClick={
                            isPastTimeSlot || isLoading || maintenanceOperationInProgress
                              ? undefined
                              : (e) => {
                                  // Handle different click behaviors
                                  if (e.ctrlKey || e.metaKey) {
                                    // Ctrl/Cmd + Click for maintenance toggle
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleTimeSlotClick(slot.time, field);
                                  } else {
                                    // Normal click for tooltip
                                    showTooltip(e, booking, slot.time, field);
                                  }
                                }
                          }
                        >
                          {" "}
                          <div className="flex flex-col h-full justify-between">
                            {" "}
                            {isPastTimeSlot ? (
                              // Show past time slot with disabled state
                              <>
                                <div className="flex items-center justify-center">
                                  <span className="bg-gray-400 text-white text-xs font-medium px-2 py-1 rounded-full">
                                    Đã qua
                                  </span>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm font-semibold text-gray-500">
                                    {slot.time} - {getNextTimeSlot(slot.time)}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs text-gray-400">
                                    <i className="fas fa-clock mr-1"></i>
                                    Không khả dụng
                                  </div>
                                </div>
                              </>
                            ) : isMaintenance ? (
                              // Show maintenance information - PRIORITY
                              <>
                                <div className="flex items-center justify-center">
                                  <span className="bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                                    Bảo trì
                                  </span>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm font-semibold text-gray-800">
                                    {slot.time} - {getNextTimeSlot(slot.time)}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs text-gray-500">
                                    Tạm ngưng
                                  </div>
                                </div>
                              </>
                            ) : isBooked ? (
                              // Show booking information with enhanced status display
                              <>
                                {" "}
                                <div className="flex items-center justify-center">
                                  {(() => {
                                    const badgeInfo = getPaymentStatusBadge(
                                      booking?.paymentStatus,
                                      currentSlotStatus
                                    );
                                    return (
                                      <span
                                        className={`text-white text-xs font-medium px-2 py-1 rounded-full ${badgeInfo.className}`}
                                      >
                                        {badgeInfo.text}
                                      </span>
                                    );
                                  })()}
                                </div>
                                <div className="text-center">
                                  <div className="text-sm font-semibold text-gray-800">
                                    {slot.time} - {getNextTimeSlot(slot.time)}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    {booking?.fieldName ||
                                      getSubFieldName(field)}
                                  </div>{" "}
                                </div>
                                <div className="text-center">
                                  {/* <div
                                    className={`text-sm font-bold ${getPriceColor(
                                      booking,
                                      slot.time
                                    )}`}
                                  >
                                    {formattedPrice}
                                  </div> */}
                                  {booking?.peakHourMultiplier &&
                                    booking.peakHourMultiplier > 1.0 && (
                                      <div className="text-xs text-orange-600 font-medium mt-1">
                                        <i className="fas fa-clock mr-1"></i>
                                        {booking.peakHourMultiplier}x
                                      </div>
                                    )}{" "}
                                </div>
                              </>
                            ) : isAvailable ? (
                              // Show available slot with accurate pricing - including peak hour
                              <>
                                <div className="flex items-center justify-center">
                                  <span className="bg-green-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                                    Trống
                                  </span>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm font-semibold text-gray-800">
                                    {slot.time} - {getNextTimeSlot(slot.time)}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    {getSubFieldName(field)}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div
                                    className={`text-sm font-bold ${getPriceColor(
                                      null,
                                      slot.time
                                    )}`}
                                  >
                                    {formattedPrice}
                                  </div>
                                  {isInPeakHour(slot.time) && (
                                    <div className="text-xs text-orange-600 font-medium mt-1">
                                      <i className="fas fa-clock mr-1"></i>
                                      {peakHourSettings.multiplier}x
                                    </div>
                                  )}
                                </div>
                              </>
                            ) : (
                              // Fallback case for unknown status
                              <>
                                <div className="flex items-center justify-center">
                                  <span className="bg-gray-400 text-white text-xs font-medium px-2 py-1 rounded-full">
                                    Không xác định
                                  </span>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm font-semibold text-gray-500">
                                    {slot.time} - {getNextTimeSlot(slot.time)}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs text-gray-400">
                                    Trạng thái: {currentSlotStatus}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>{" "}
        {/* Enhanced Footer Legend */}
        <div className="bg-white border-t p-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-8">
              {" "}
              {/* Status Legend */}
              <div className="flex items-center space-x-4">
                <span className="text-xs font-medium text-gray-700">
                  Trạng thái:
                </span>{" "}
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-200 rounded mr-2 border border-green-400"></div>
                  <span>Sân trống</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-200 rounded mr-2 border border-blue-400"></div>
                  <span>Đã đặt</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-200 rounded mr-2 border border-red-400"></div>
                  <span>Bảo trì</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-gray-200 rounded mr-2 border border-gray-300 opacity-50"></div>
                  <span>Đã qua</span>
                </div>
              </div>
              {/* Field color legend */}
              <div className="flex items-center space-x-3 pl-4 border-l border-gray-300">
                <span className="text-xs font-medium text-gray-700">
                  Màu sân:
                </span>
                <div className="flex items-center space-x-2">
                  {[
                    { name: "A", color: "#10b981" },
                    { name: "B", color: "#3b82f6" },
                    { name: "C", color: "#8b5cf6" },
                    { name: "D", color: "#f59e0b" },
                    { name: "E", color: "#ef4444" },
                  ].map((field) => (
                    <div key={field.name} className="flex items-center">
                      <div
                        className="w-3 h-3 rounded mr-1 border shadow-sm"
                        style={{
                          background: `linear-gradient(135deg, ${field.color}, ${field.color}dd)`,
                          borderColor: field.color + "88",
                          boxShadow: `0 1px 2px ${field.color}44`,
                        }}
                      ></div>
                      <span className="text-xs">{field.name}</span>
                    </div>
                  ))}{" "}
                </div>
              </div>
            </div>
            {/* Usage Instructions */}
            <div className="text-xs text-gray-500">
              <span className="font-medium">Hướng dẫn:</span> Click để xem chi
              tiết •<kbd className="px-1 bg-gray-100 rounded mx-1">Ctrl</kbd> +
              Click để đặt/hủy bảo trì
              {/* Debug info */}
              {process.env.NODE_ENV === "development" && (
                <span className="ml-2 text-blue-500">
                  • Debug: Check console for click events
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Enhanced Tooltip */}
      {tooltipInfo.visible && (
        <div
          className="fixed bg-white border border-gray-300 rounded-lg shadow-xl p-4 z-50 max-w-xs"
          style={{ left: tooltipInfo.x, top: tooltipInfo.y }}
        >
          <button
            onClick={hideTooltip}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            <i className="fas fa-times text-xs"></i>
          </button>

          <div className="space-y-3">
            {" "}
            <div className="font-semibold text-sm border-b border-gray-200 pb-2 mb-3 flex items-center">
              <div
                className={`w-3 h-3 rounded-full mr-2 ${
                  tooltipInfo.timeSlot?.status === "booked"
                    ? "bg-blue-500"
                    : tooltipInfo.timeSlot?.status === "maintenance"
                    ? "bg-red-500"
                    : "bg-green-500"
                }`}
              ></div>
              Chi tiết khung giờ
            </div>
            <div className="space-y-2">
              <div className="text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Sân:</span>
                  <span className="font-medium">
                    {getSubFieldName(tooltipInfo.field)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Thời gian:</span>
                  <span className="font-medium">
                    {tooltipInfo.time} - {getNextTimeSlot(tooltipInfo.time)}
                  </span>
                </div>{" "}
                <div className="flex justify-between">
                  <span className="text-gray-500">Trạng thái:</span>
                  <span
                    className={`font-medium ${
                      tooltipInfo.timeSlot?.status === "booked"
                        ? "text-blue-600"
                        : tooltipInfo.timeSlot?.status === "maintenance"
                        ? "text-red-600"
                        : tooltipInfo.timeSlot?.status === "past"
                        ? "text-gray-500"
                        : "text-green-600"
                    }`}
                  >
                    {tooltipInfo.timeSlot?.status === "booked"
                      ? "Đã đặt"
                      : tooltipInfo.timeSlot?.status === "maintenance"
                      ? "Bảo trì"
                      : tooltipInfo.timeSlot?.status === "past"
                      ? "Đã qua"
                      : "Sân trống"}
                  </span>
                </div>
              </div>{" "}
              {tooltipInfo.timeSlot &&
                tooltipInfo.timeSlot.status === "booked" && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Khách hàng:</span>
                      <span className="font-medium text-blue-700">
                        {tooltipInfo.timeSlot.customerName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Số điện thoại:</span>
                      <span className="font-medium text-blue-700">
                        <a
                          href={`tel:${tooltipInfo.timeSlot.customerPhone}`}
                          className="hover:underline"
                        >
                          {tooltipInfo.timeSlot.customerPhone}
                        </a>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Trạng thái booking:</span>
                      <span
                        className={`font-medium ${
                          tooltipInfo.timeSlot.bookingStatus === "confirmed"
                            ? "text-green-600"
                            : tooltipInfo.timeSlot.bookingStatus ===
                              "payment_pending"
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {tooltipInfo.timeSlot.bookingStatus === "confirmed"
                          ? "✅ Đã xác nhận"
                          : tooltipInfo.timeSlot.bookingStatus ===
                            "payment_pending"
                          ? "⏳ Chờ thanh toán"
                          : "❌ Đã hủy"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Thanh toán:</span>
                      <span
                        className={`font-medium ${
                          tooltipInfo.timeSlot.paymentStatus === "paid"
                            ? "text-green-600"
                            : tooltipInfo.timeSlot.paymentStatus === "pending"
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {tooltipInfo.timeSlot.paymentStatus === "paid"
                          ? "💰 Đã thanh toán"
                          : tooltipInfo.timeSlot.paymentStatus === "pending"
                          ? "⏳ Chờ thanh toán"
                          : "❌ Đã hủy"}
                      </span>
                    </div>{" "}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ngày đặt:</span>
                      <span className="font-medium text-blue-600">
                        {formatBookingDate(tooltipInfo.timeSlot.bookingDate)}
                      </span>
                    </div>{" "}
                    {/* <div className="flex justify-between">
                      <span className="text-gray-600">Giá thuê:</span>
                      <span className="font-bold text-blue-600 text-base">
                        {getSlotPrice(
                          tooltipInfo.timeSlot,
                          tooltipInfo.field,
                          tooltipInfo.time
                        )}
                      </span>
                    </div> */}
                    
                  </>
                )}
              {tooltipInfo.timeSlot &&
                tooltipInfo.timeSlot.status === "maintenance" && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lý do:</span>
                      <span className="font-medium text-red-600">
                        {tooltipInfo.timeSlot.maintenanceReason ||
                          "Không có thông tin"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Hoàn thành dự kiến:</span>
                      <span className="font-medium text-red-600">
                        {tooltipInfo.timeSlot.maintenanceUntil
                          ? new Date(
                              tooltipInfo.timeSlot.maintenanceUntil
                            ).toLocaleString("vi-VN")
                          : "Chưa xác định"}
                      </span>
                    </div>
                  </>
                )}
              {tooltipInfo.timeSlot &&
                tooltipInfo.timeSlot.status === "available" && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Giá thuê:</span>
                      <span className="font-bold text-green-600 text-base">
                        {getSlotPrice(
                          tooltipInfo.timeSlot,
                          tooltipInfo.field,
                          tooltipInfo.time
                        )}
                      </span>
                    </div>
                    {tooltipInfo.timeSlot.description && (
                      <div className="text-sm text-gray-600 mt-2">
                        <div className="font-medium">Mô tả:</div>
                        <div className="italic">
                          {tooltipInfo.timeSlot.description}
                        </div>{" "}
                      </div>
                    )}
                  </>
                )}
              {!tooltipInfo.timeSlot && (
                <div className="text-sm text-gray-600 mt-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Giá thuê:</span>
                    <span className="font-bold text-green-600 text-base">
                      {getSlotPrice(null, tooltipInfo.field, tooltipInfo.time)}
                    </span>
                  </div>
                  <div className="italic mt-2">
                    Kéo thả để tạo khung giờ mới cho khoảng thời gian này
                  </div>{" "}
                </div>
              )}
            </div>
          </div>
        </div>
      )}{" "}
      {/* Peak Hour Modal */}
      <PeakHourModal
        isOpen={peakHourModalOpen}
        onClose={() => setPeakHourModalOpen(false)}
        onSave={async () => {
          await loadPricingRules(); // Reload pricing rules after save
          await loadBookedSlots(); // Reload time slots to reflect new pricing
          toast.success("Đã cập nhật cài đặt giờ cao điểm");
        }}
        subFields={subFields}
        fieldId={pitchId || ""}
        currentPricingRules={pricingRules}
      />
      {/* Maintenance Modal */}
      <MaintenanceModal
        isOpen={maintenanceModalOpen}
        onClose={() => {
          setMaintenanceModalOpen(false);
          setSelectedTimeSlotForMaintenance(null);
          setMaintenanceLoading(false);
        }}
        onConfirm={handleMaintenanceConfirm}
        timeSlot={selectedTimeSlotForMaintenance}
        currentStatus={selectedTimeSlotForMaintenance?.currentStatus}
        isLoading={maintenanceLoading}
      />
      
      {/* Advanced Maintenance Modal */}
      <AdvancedMaintenanceModal
        isOpen={advancedMaintenanceModalOpen}
        onClose={() => setAdvancedMaintenanceModalOpen(false)}
        onConfirm={handleAdvancedMaintenanceConfirm}
        subFields={subFields}
        fieldId={pitchId || ""}
        currentDate={currentDate}
        timeSlots={hourSlots.map(slot => slot.time)}
        isLoading={maintenanceOperationInProgress}
      />

      {/* Enhanced MaintenanceBookingConfirmDialog */}
      <MaintenanceDialogManager
        dialogData={maintenanceDialog.dialogData}
        useEnhancedDialog={maintenanceDialog.useEnhancedDialog}
        isLoading={maintenanceDialog.isLoading}
        onConfirm={async (reason) => {
          await maintenanceDialog.handleConfirm(reason, async (reason) => {
            if (!maintenanceDialog.dialogData) return;
            
            console.log("🔍 Processing maintenance confirmation:", {
              reason,
              dialogData: maintenanceDialog.dialogData
            });
            
            // Extract time from timeSlot string
            const timeStr = maintenanceDialog.dialogData.timeSlot.split(' - ')[0];
            
            // Get the existing slot
            const existingSlot = getBookingByTimeAndField(timeStr, maintenanceDialog.dialogData.fieldId);
            
            if (!existingSlot || !existingSlot.id) {
              throw new Error("Không tìm thấy booking để hủy");
            }
            
            // Prepare maintenance data
            const maintenanceData = {
              slotId: existingSlot.id,
              time: timeStr,
              endTime: maintenanceDialog.dialogData.timeSlot.split(' - ')[1],
              fieldId: maintenanceDialog.dialogData.fieldId,
              fieldName: maintenanceDialog.dialogData.fieldName,
              date: timeslotService.formatDateForAPI(currentDate),
              currentStatus: "available" as const,
            };
            
            // Set maintenance data and call confirm handler
            setSelectedTimeSlotForMaintenance(maintenanceData);
            await handleMaintenanceConfirm(reason);
          });
        }}
        onCancel={maintenanceDialog.closeDialog}
        onComplete={maintenanceDialog.handleComplete}
      />

      {/* Context Menu */}
      {contextMenu.visible && (
        <div 
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[200px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onMouseLeave={hideContextMenu}
        >
          {contextMenu.timeSlot && contextMenu.timeSlot.status === "available" && (
            <>
              <button
                onClick={() => {
                  if (contextMenu.timeSlot) {
                    handleOwnerBookingClick(contextMenu.timeSlot.time, contextMenu.timeSlot.field);
                  }
                  hideContextMenu();
                }}
                className="w-full px-4 py-2 text-left hover:bg-blue-50 text-blue-600 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Đặt sân hộ khách hàng
              </button>
              <div className="border-t border-gray-100 my-1"></div>
            </>
          )}
          
          <button
            onClick={() => {
              if (contextMenu.timeSlot) {
                handleTimeSlotClick(contextMenu.timeSlot.time, contextMenu.timeSlot.field);
              }
              hideContextMenu();
            }}
            className="w-full px-4 py-2 text-left hover:bg-orange-50 text-orange-600 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {contextMenu.timeSlot?.status === "maintenance" ? "Hủy bảo trì" : "Đặt bảo trì"}
          </button>
        </div>
      )}

      {/* Owner Booking Modal */}
      <OwnerBookingModal
        isOpen={ownerBookingModalOpen}
        onClose={() => {
          setOwnerBookingModalOpen(false);
          setSelectedTimeSlotForOwnerBooking(null);
        }}
        onConfirm={handleOwnerBookingConfirm}
        timeSlot={selectedTimeSlotForOwnerBooking}
        fieldPrice={selectedTimeSlotForOwnerBooking ? (() => {
          const basePrice = getFieldPrice(selectedTimeSlotForOwnerBooking.fieldId);
          const multiplier = getPeakHourMultiplier(selectedTimeSlotForOwnerBooking.time);
          return Math.round(basePrice * multiplier);
        })() : 0}
        isPeakHour={selectedTimeSlotForOwnerBooking ? isInPeakHour(selectedTimeSlotForOwnerBooking.time) : false}
        isLoading={ownerBookingLoading}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.dialog.isOpen}
        onClose={confirmDialog.closeDialog}
        onConfirm={confirmDialog.handleConfirm}
        title={confirmDialog.dialog.title}
        message={confirmDialog.dialog.message}
        confirmText={confirmDialog.dialog.confirmText}
        cancelText={confirmDialog.dialog.cancelText}
        type={confirmDialog.dialog.type}
        isLoading={confirmDialog.dialog.isLoading}
      />
    </div>
  );
};

        
export default TimeSlotManagement;
