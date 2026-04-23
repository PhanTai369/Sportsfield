import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';

interface BookingStatus {
  bookingId: string;
  status: string;
  paymentStatus: string;
  lastUpdated: Date;
  isSubscribed: boolean;
  syncInProgress: boolean;
  error?: string;
}

interface BookingStatusUpdate {
  bookingId: string;
  status: string;
  paymentStatus: string;
  previousStatus?: string;
  previousPaymentStatus?: string;
  syncTriggeredBy?: string;
  timestamp: string;
}

interface BookingPaymentUpdate {
  bookingId: string;
  paymentStatus: string;
  amount?: number;
  paymentMethod?: string;
  timestamp: string;
}

interface BookingEvent {
  eventType: string;
  bookingId: string;
  timestamp: string;
  [key: string]: any;
}

interface BookingSyncComplete {
  bookingId: string;
  success: boolean;
  booking?: any;
  timestamp: string;
}

export const useBookingStatus = (bookingId?: string) => {
  const { socket, isConnected, subscribeToBooking, unsubscribeFromBooking, syncBookingStatus, on, off } = useSocket();
  const [bookingStatuses, setBookingStatuses] = useState<Map<string, BookingStatus>>(new Map());
  const [globalError, setGlobalError] = useState<string | null>(null);
  const subscriptionTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const activeSubscriptions = useRef<Set<string>>(new Set()); // Track active subscriptions
  const subscriptionAttempts = useRef<Map<string, { count: number; lastAttempt: number }>>(new Map()); // Circuit breaker

  // Get status for a specific booking
  const getBookingStatus = useCallback((id: string): BookingStatus | undefined => {
    return bookingStatuses.get(id);
  }, [bookingStatuses]);

  // Subscribe to a booking with retry logic and circuit breaker
  const subscribe = useCallback((id: string, retryCount: number = 0) => {
    if (!isConnected || !id) return;

    // Circuit breaker: prevent spam
    const now = Date.now();
    const attempts = subscriptionAttempts.current.get(id);
    if (attempts) {
      // If more than 10 attempts in last 30 seconds, block
      if (attempts.count > 10 && (now - attempts.lastAttempt) < 30000) {
        console.warn(`[useBookingStatus] Circuit breaker: Too many subscription attempts for ${id}, blocking for 30s`);
        return;
      }
      // Reset counter after 30 seconds
      if ((now - attempts.lastAttempt) > 30000) {
        subscriptionAttempts.current.set(id, { count: 1, lastAttempt: now });
      } else {
        subscriptionAttempts.current.set(id, { count: attempts.count + 1, lastAttempt: now });
      }
    } else {
      subscriptionAttempts.current.set(id, { count: 1, lastAttempt: now });
    }

    // Prevent duplicate subscriptions
    if (activeSubscriptions.current.has(id)) {
      console.log(`[useBookingStatus] Already subscribed to booking ${id}, skipping`);
      return;
    }

    const maxRetries = 3;
    const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff

    console.log(`[useBookingStatus] Subscribing to booking ${id}, attempt ${retryCount + 1}`);

    // Mark as active subscription
    activeSubscriptions.current.add(id);

    // Clear any existing timeout for this booking
    const existingTimeout = subscriptionTimeouts.current.get(id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Update subscription status
    setBookingStatuses(prev => {
      const newStatuses = new Map(prev);
      const current = newStatuses.get(id) || {
        bookingId: id,
        status: '',
        paymentStatus: '',
        lastUpdated: new Date(),
        isSubscribed: false,
        syncInProgress: false
      };
      newStatuses.set(id, { ...current, isSubscribed: true, error: undefined });
      return newStatuses;
    });

    // Subscribe to booking updates
    subscribeToBooking(id);

    // Set up retry timeout if subscription fails - use ref to avoid dependency
    if (retryCount < maxRetries) {
      const timeoutId = setTimeout(() => {
        // Use ref to check status without creating dependency
        if (activeSubscriptions.current.has(id)) {
          // Only retry if we're still supposed to be subscribed
          setBookingStatuses(currentStatuses => {
            const status = currentStatuses.get(id);
            if (status && !status.isSubscribed) {
              console.log(`Retrying subscription for booking ${id}, attempt ${retryCount + 1}`);
              // Remove from active first to allow retry
              activeSubscriptions.current.delete(id);
              subscribe(id, retryCount + 1);
            }
            return currentStatuses;
          });
        }
      }, retryDelay);

      subscriptionTimeouts.current.set(id, timeoutId);
    }
  }, [isConnected, subscribeToBooking]); // Remove bookingStatuses from deps

  // Unsubscribe from a booking
  const unsubscribe = useCallback((id: string) => {
    if (!id) return;

    console.log(`[useBookingStatus] Unsubscribing from booking ${id}`);

    // Remove from active subscriptions
    activeSubscriptions.current.delete(id);

    // Clear any retry timeout
    const existingTimeout = subscriptionTimeouts.current.get(id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      subscriptionTimeouts.current.delete(id);
    }

    // Update subscription status
    setBookingStatuses(prev => {
      const newStatuses = new Map(prev);
      const current = newStatuses.get(id);
      if (current) {
        newStatuses.set(id, { ...current, isSubscribed: false });
      }
      return newStatuses;
    });

    // Unsubscribe from booking updates
    unsubscribeFromBooking(id);
  }, [unsubscribeFromBooking]);

  // Manually sync booking status
  const syncStatus = useCallback((id: string) => {
    if (!isConnected || !id) return;

    // Set sync in progress
    setBookingStatuses(prev => {
      const newStatuses = new Map(prev);
      const current = newStatuses.get(id) || {
        bookingId: id,
        status: '',
        paymentStatus: '',
        lastUpdated: new Date(),
        isSubscribed: false,
        syncInProgress: false
      };
      newStatuses.set(id, { ...current, syncInProgress: true, error: undefined });
      return newStatuses;
    });

    // Trigger sync
    syncBookingStatus(id);
  }, [isConnected, syncBookingStatus]);

  // Handle booking status updates
  useEffect(() => {
    if (!socket) return;

    const handleBookingStatusUpdate = (data: BookingStatusUpdate) => {
      setBookingStatuses(prev => {
        const newStatuses = new Map(prev);
        const current = newStatuses.get(data.bookingId) || {
          bookingId: data.bookingId,
          status: '',
          paymentStatus: '',
          lastUpdated: new Date(),
          isSubscribed: false,
          syncInProgress: false
        };

        newStatuses.set(data.bookingId, {
          ...current,
          status: data.status,
          paymentStatus: data.paymentStatus,
          lastUpdated: new Date(data.timestamp),
          error: undefined
        });

        return newStatuses;
      });
    };

    const handleBookingPaymentUpdate = (data: BookingPaymentUpdate) => {
      setBookingStatuses(prev => {
        const newStatuses = new Map(prev);
        const current = newStatuses.get(data.bookingId);
        if (current) {
          newStatuses.set(data.bookingId, {
            ...current,
            paymentStatus: data.paymentStatus,
            lastUpdated: new Date(data.timestamp),
            error: undefined
          });
        }
        return newStatuses;
      });
    };

    const handleBookingEvent = (data: BookingEvent) => {
      // Handle general booking events (confirmations, cancellations, etc.)
      setBookingStatuses(prev => {
        const newStatuses = new Map(prev);
        const current = newStatuses.get(data.bookingId);
        if (current) {
          newStatuses.set(data.bookingId, {
            ...current,
            lastUpdated: new Date(data.timestamp),
            error: undefined
          });
        }
        return newStatuses;
      });
    };

    const handleBookingSubscriptionSuccess = (data: { bookingId: string; status: string; paymentStatus: string }) => {
      setBookingStatuses(prev => {
        const newStatuses = new Map(prev);
        const current = newStatuses.get(data.bookingId) || {
          bookingId: data.bookingId,
          status: '',
          paymentStatus: '',
          lastUpdated: new Date(),
          isSubscribed: false,
          syncInProgress: false
        };

        newStatuses.set(data.bookingId, {
          ...current,
          status: data.status,
          paymentStatus: data.paymentStatus,
          isSubscribed: true,
          lastUpdated: new Date(),
          error: undefined
        });

        return newStatuses;
      });

      // Clear retry timeout since subscription was successful
      const existingTimeout = subscriptionTimeouts.current.get(data.bookingId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        subscriptionTimeouts.current.delete(data.bookingId);
      }
    };

    const handleBookingUnsubscriptionSuccess = (data: { bookingId: string }) => {
      setBookingStatuses(prev => {
        const newStatuses = new Map(prev);
        const current = newStatuses.get(data.bookingId);
        if (current) {
          newStatuses.set(data.bookingId, {
            ...current,
            isSubscribed: false
          });
        }
        return newStatuses;
      });
    };

    const handleBookingSyncComplete = (data: BookingSyncComplete) => {
      setBookingStatuses(prev => {
        const newStatuses = new Map(prev);
        const current = newStatuses.get(data.bookingId);
        if (current) {
          newStatuses.set(data.bookingId, {
            ...current,
            syncInProgress: false,
            status: data.booking?.status || current.status,
            paymentStatus: data.booking?.payment_status || current.paymentStatus,
            lastUpdated: new Date(data.timestamp),
            error: data.success ? undefined : 'Sync failed'
          });
        }
        return newStatuses;
      });
    };

    const handleError = (error: any) => {
      console.error('Booking socket error:', error);
      setGlobalError(error.message || 'Socket error occurred');
      
      // If it's a booking-related error, update the specific booking status
      if (error.type === 'BOOKING_ERROR' && error.bookingId) {
        setBookingStatuses(prev => {
          const newStatuses = new Map(prev);
          const current = newStatuses.get(error.bookingId);
          if (current) {
            newStatuses.set(error.bookingId, {
              ...current,
              error: error.message,
              syncInProgress: false
            });
          }
          return newStatuses;
        });
      }
    };

    // Register event listeners
    on('booking_status_update', handleBookingStatusUpdate);
    on('booking_payment_update', handleBookingPaymentUpdate);
    on('booking_event', handleBookingEvent);
    on('booking_subscription_success', handleBookingSubscriptionSuccess);
    on('booking_unsubscription_success', handleBookingUnsubscriptionSuccess);
    on('booking_sync_complete', handleBookingSyncComplete);
    on('error', handleError);

    return () => {
      // Cleanup event listeners
      off('booking_status_update', handleBookingStatusUpdate);
      off('booking_payment_update', handleBookingPaymentUpdate);
      off('booking_event', handleBookingEvent);
      off('booking_subscription_success', handleBookingSubscriptionSuccess);
      off('booking_unsubscription_success', handleBookingUnsubscriptionSuccess);
      off('booking_sync_complete', handleBookingSyncComplete);
      off('error', handleError);
    };
  }, [socket, on, off]);

  // Auto-subscribe to provided booking ID with debouncing - DISABLED to prevent conflicts
  useEffect(() => {
   
  }, [bookingId, isConnected]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      subscriptionTimeouts.current.forEach(timeout => clearTimeout(timeout));
      subscriptionTimeouts.current.clear();
      activeSubscriptions.current.clear(); // Clear active subscriptions
      subscriptionAttempts.current.clear(); // Clear circuit breaker data
    };
  }, []);

  return {
    // State
    bookingStatuses: Array.from(bookingStatuses.values()),
    isConnected,
    globalError,
    
    // Single booking helpers
    currentBookingStatus: bookingId ? getBookingStatus(bookingId) : undefined,
    
    // Actions
    subscribe,
    unsubscribe,
    syncStatus,
    getBookingStatus,
    
    // Utility
    clearError: () => setGlobalError(null),
    hasActiveSubscriptions: bookingStatuses.size > 0
  };
};
