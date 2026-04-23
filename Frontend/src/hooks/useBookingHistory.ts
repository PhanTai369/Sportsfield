import { useState, useEffect, useCallback, useRef } from 'react';
import { Booking, BookingStatus } from '../types/booking';
import { bookingHistoryService } from '../services/bookingHistoryService';

export interface BookingHistoryFilters {
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  fieldId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface BookingHistoryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface UseBookingHistoryReturn {
  bookings: Booking[];
  pagination: BookingHistoryPagination;
  loading: boolean;
  error: string | null;
  filters: BookingHistoryFilters;
  updateFilters: (newFilters: Partial<BookingHistoryFilters>) => void;
  loadMore: () => void;
  refresh: () => void;
  hasMore: boolean;
  goToPage: (page: number) => void;
}

const INITIAL_FILTERS: BookingHistoryFilters = {
  status: 'all',
  search: '',
  sortBy: 'booking_date',
  sortOrder: 'desc'
};

const INITIAL_PAGINATION: BookingHistoryPagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false
};

export function useBookingHistory(): UseBookingHistoryReturn {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pagination, setPagination] = useState<BookingHistoryPagination>(INITIAL_PAGINATION);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<BookingHistoryFilters>(INITIAL_FILTERS);
  const [hasMore, setHasMore] = useState(false);
  
  // Refs to track if we're loading more vs initial load
  const isLoadingMore = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load bookings function
  const loadBookings = useCallback(async (
    page: number = 1,
    append: boolean = false,
    currentFilters: BookingHistoryFilters = filters
  ) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      // Prepare filters for API call
      const apiFilters = {
        ...currentFilters,
        status: currentFilters.status === 'all' ? undefined : currentFilters.status,
        search: currentFilters.search || undefined,
        startDate: currentFilters.startDate || undefined,
        endDate: currentFilters.endDate || undefined,
        fieldId: currentFilters.fieldId || undefined,
        sortBy: currentFilters.sortBy || 'booking_date',
        sortOrder: currentFilters.sortOrder || 'desc'
      };

      // Remove undefined values
      const cleanFilters = Object.fromEntries(
        Object.entries(apiFilters).filter(([_, value]) => value !== undefined)
      );

      console.log('📊 Loading bookings with filters:', cleanFilters);

      const result = await bookingHistoryService.getBookingHistory(
        page,
        pagination.limit,
        cleanFilters
      );

      console.log('📋 Bookings loaded:', result.bookings.length);
      console.log('📄 Pagination:', result.pagination);

      if (append) {
        setBookings(prev => [...prev, ...result.bookings]);
      } else {
        setBookings(result.bookings);
      }

      setPagination(result.pagination);
      setHasMore(result.pagination.hasNext);
      
      // Expose update function globally for real-time updates
      (window as any).updateBookingInHistory = (bookingId: string, updates: Partial<Booking>) => {
        setBookings(prev => prev.map(booking => 
          booking.id === bookingId ? { ...booking, ...updates } : booking
        ));
      };

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }

      console.error('❌ Error loading bookings:', err);
      setError(err.message || 'Failed to load booking history');
      
      if (!append) {
        setBookings([]);
        setPagination(INITIAL_PAGINATION);
      }
    } finally {
      setLoading(false);
      isLoadingMore.current = false;
    }
  }, [filters, pagination.limit]);

  // Update filters function
  const updateFilters = useCallback((newFilters: Partial<BookingHistoryFilters>) => {
    console.log('🔄 Updating filters:', newFilters);
    
    setFilters(prev => {
      const updated = { ...prev, ...newFilters };
      
      // Reset pagination when filters change
      setPagination(INITIAL_PAGINATION);
      
      // Load bookings with new filters
      loadBookings(1, false, updated);
      
      return updated;
    });
  }, [loadBookings]);

  // Load more function for infinite scroll
  const loadMore = useCallback(() => {
    if (loading || isLoadingMore.current || !hasMore) {
      return;
    }

    console.log('📄 Loading more bookings...');
    isLoadingMore.current = true;
    loadBookings(pagination.page + 1, true);
  }, [loading, hasMore, pagination.page, loadBookings]);

  // Refresh function
  const refresh = useCallback(() => {
    console.log('🔄 Refreshing booking history...');
    setPagination(INITIAL_PAGINATION);
    loadBookings(1, false);
  }, [loadBookings]);

  // Go to specific page function
  const goToPage = useCallback((page: number) => {
    console.log('📄 Going to page:', page);
    loadBookings(page, false);
  }, [loadBookings]);

  // Initial load
  useEffect(() => {
    loadBookings();
  }, []); // Only run once on mount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    bookings,
    pagination,
    loading,
    error,
    filters,
    updateFilters,
    loadMore,
    refresh,
    hasMore,
    goToPage
  };
}
