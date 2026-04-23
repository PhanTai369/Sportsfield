import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { Search, RefreshCw, AlertCircle, LogIn, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { BookingCard } from './BookingCard';
import { BookingStats } from './BookingStats';
import { BookingFilter } from './BookingFilter';
import { BookingExport } from './BookingExport';
import { Booking, BookingStatus } from '../../types/booking';
import { useBookingHistory } from '../../hooks/useBookingHistory';
import { isAuthenticated } from '../../utils/auth';
import { BookingCardSkeleton, StatsSkeleton } from '../ui/skeleton';
import { useSocket } from '../../hooks/useSocket';
import { calculateBookingHours } from '../../utils/timeSlotUtils';

interface BookingHistoryProps {
  onDownloadReceipt?: (bookingId: string) => void;
}

// Memoized BookingCard for performance
const MemoizedBookingCard = memo(BookingCard);

export function BookingHistory({ onDownloadReceipt }: BookingHistoryProps) {
  const {
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
  } = useBookingHistory();

  const [expandedBookingIds, setExpandedBookingIds] = useState<string[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalHours: 0,
    totalSpent: 0,
    totalRefunded: 0
  });

  // Socket connection for real-time updates
  const { isConnected, on, off } = useSocket();

  useEffect(() => {
    // Check authentication status
    const authStatus = isAuthenticated();
    setIsLoggedIn(authStatus);
  }, []);

  // Real-time updates with optimized partial updates
  useEffect(() => {
    if (!isConnected || !isLoggedIn) return;

    console.log('Setting up real-time listeners for booking history');

    const handlePaymentConfirmed = (data: any) => {
      console.log('Payment confirmed event received:', data);
      if (data.bookingId && (window as any).updateBookingInHistory) {
        (window as any).updateBookingInHistory(data.bookingId, { 
          status: 'paid' as BookingStatus
        });
      }
    };

    const handleBookingStatusUpdate = (data: any) => {
      console.log('Booking status update received:', data);
      if (data.bookingId && data.status && (window as any).updateBookingInHistory) {
        (window as any).updateBookingInHistory(data.bookingId, { 
          status: data.status as BookingStatus 
        });
      }
    };

    const handleBookingCancelled = (data: any) => {
      console.log('Booking cancelled event received:', data);
      if (data.bookingId && (window as any).updateBookingInHistory) {
        (window as any).updateBookingInHistory(data.bookingId, { 
          status: 'cancelled' as BookingStatus 
        });
      }
    };

    const handleBookingExpired = (data: any) => {
      console.log('Booking expired event received:', data);
      if (data.bookingId && (window as any).updateBookingInHistory) {
        (window as any).updateBookingInHistory(data.bookingId, { 
          status: 'cancelled' as BookingStatus 
        });
        
        // Show a toast notification to the user
        try {
          const toast = (window as any).toast;
          if (toast) {
            toast.warning(data.message || 'Một booking đã bị hủy do hết thời gian thanh toán');
          }
        } catch (e) {
          console.log('Toast notification not available');
        }
      }
    };

    // Subscribe to events
    on('payment_confirmed', handlePaymentConfirmed);
    on('booking_status_update', handleBookingStatusUpdate);
    on('booking_cancelled', handleBookingCancelled);
    on('booking_expired', handleBookingExpired);

    return () => {
      off('payment_confirmed', handlePaymentConfirmed);
      off('booking_status_update', handleBookingStatusUpdate);
      off('booking_cancelled', handleBookingCancelled);
      off('booking_expired', handleBookingExpired);
    };
  }, [isConnected, isLoggedIn, on, off]);

  // Handle search with debouncing (handled by hook)
  const handleSearch = useCallback((query: string) => {
    updateFilters({ search: query });
  }, [updateFilters]);

  // Handle filter changes
  const handleFilterChange = useCallback((filterData: { status: string; dateRange: string }) => {
    const updates: any = { status: filterData.status };
    
    if (filterData.dateRange !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (filterData.dateRange) {
        case 'today':
          updates.startDate = today.toISOString();
          updates.endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'week':
          updates.startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          updates.endDate = now.toISOString();
          break;
        case 'month':
          updates.startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          updates.endDate = now.toISOString();
          break;
        case 'quarter':
          updates.startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
          updates.endDate = now.toISOString();
          break;
        default:
          updates.startDate = undefined;
          updates.endDate = undefined;
      }
    } else {
      updates.startDate = undefined;
      updates.endDate = undefined;
    }
    
    updateFilters(updates);
  }, [updateFilters]);

  // Toggle booking expansion
  const toggleBookingExpanded = useCallback((bookingId: string) => {
    setExpandedBookingIds(prev =>
      prev.includes(bookingId)
        ? prev.filter(id => id !== bookingId)
        : [...prev, bookingId]
    );
  }, []);

  // Update stats when bookings change
  useEffect(() => {
    if (bookings.length > 0) {
      const totalSpent = bookings
        .filter(b => b.status === 'completed' || b.status === 'paid')
        .reduce((sum, b) => sum + b.totalPrice, 0);
      
      // Tính tổng tiền đã hoàn cho bookings có status 'refunded'
      const totalRefunded = bookings
        .filter(b => b.status === 'refunded')
        .reduce((sum, b) => {
          // Nếu có refundAmount thì dùng, không thì dùng totalPrice
          return sum + (b.refundAmount || b.totalPrice);
        }, 0);
      
      // Tính tổng số giờ chơi thực tế từ timeSlot
      const totalHours = bookings
        .filter(b => b.status === 'completed' || b.status === 'paid')
        .reduce((sum, b) => sum + calculateBookingHours(b), 0);
      
      setStats({
        totalBookings: bookings.length,
        totalHours: Math.round(totalHours * 100) / 100, // Round to 2 decimal places
        totalSpent,
        totalRefunded
      });
    }
  }, [bookings]);

  // Loading state for initial load
  if (loading && bookings.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <StatsSkeleton />
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <BookingCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Lịch sử đặt sân</h1>
          <p className="text-gray-600 mt-1">
            {pagination ? `Tổng cộng ${pagination.total} đặt sân` : `${bookings.length} đặt sân`}
          </p>
        </div>
        {/* <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button> */}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-red-800 font-medium">Có lỗi xảy ra</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            {!isLoggedIn ? (
              <button
                onClick={() => window.location.href = '/auth'}
                className="mt-2 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <LogIn className="w-4 h-4" />
                Đăng nhập ngay
              </button>
            ) : (
              <button
                onClick={refresh}
                className="text-red-600 underline text-sm mt-2 hover:text-red-800"
              >
                Thử lại
              </button>
            )}
          </div>
        </div>
      )}

      

      {/* Stats Section */}
      <BookingStats
        totalBookings={stats.totalBookings}
        totalHours={stats.totalHours}
        totalSpent={stats.totalSpent}
        totalRefunded={stats.totalRefunded}
      />

      {/* Filters and Export */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-grow">
          <BookingFilter
            onFilterChange={handleFilterChange}
            onSearch={handleSearch}
            totalBookings={bookings.length}
          />
        </div>
        <div className="flex-shrink-0">
          <BookingExport bookings={bookings} />
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          placeholder="Tìm kiếm theo mã đặt sân, tên sân, số sân..."
          value={filters.search || ''}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
        />
      </div>

      {/* Booking List */}
      {bookings.length > 0 ? (
        <div className="space-y-6">
          {bookings.map((booking) => (
            <MemoizedBookingCard
              key={booking.id}
              booking={booking}
              isExpanded={expandedBookingIds.includes(booking.id)}
              onToggleExpand={() => toggleBookingExpanded(booking.id)}
            />
          ))}
          
          {/* Backend Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between py-4">
              <div className="text-sm text-gray-700">
                Trang {pagination.page} / {pagination.totalPages} - Hiển thị {bookings.length} trong tổng số {pagination.total} booking
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => goToPage(pagination.page - 1)}
                  disabled={!pagination.hasPrev || loading}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    !pagination.hasPrev || loading
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Trước
                </button>
                
                <div className="flex items-center space-x-1">
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        disabled={loading}
                        className={`px-3 py-2 rounded-md text-sm font-medium ${
                          pageNum === pagination.page
                            ? 'bg-green-600 text-white'
                            : loading
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => goToPage(pagination.page + 1)}
                  disabled={!pagination.hasNext || loading}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    !pagination.hasNext || loading
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Sau
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg">
            {filters.search || filters.status !== 'all'
              ? 'Không tìm thấy lịch sử đặt sân nào phù hợp với bộ lọc.'
              : 'Bạn chưa có lịch sử đặt sân nào.'
            }
          </p>
          {!filters.search && filters.status === 'all' && (
            <button
              onClick={() => window.location.href = '/'}
              className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Đặt sân ngay
            </button>
          )}
        </div>
      )}
    </div>
  );
}
