/**
 * Debug utility component to show booking calculation details
 */
import React, { useMemo, useState } from 'react';
import { Booking } from '../../types/booking';
import { calculateBookingHours } from '../../utils/timeSlotUtils';

interface BookingDebugProps {
  bookings: Booking[];
  pagination?: {
    total: number;
    page: number;
    totalPages: number;
  };
}

// Debug API call
const debugBookingCount = async () => {
  try {
    const token = localStorage.getItem('token');
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
    const response = await fetch(`${API_BASE_URL}/bookings/debug/count`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Debug API call failed:', error);
    throw error;
  }
};

export function BookingDebug({ bookings, pagination }: BookingDebugProps) {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const debug = useMemo(() => {
    const stats = {
      totalBookings: bookings.length,
      paginationTotal: pagination?.total || 0,
      currentPage: pagination?.page || 1,
      totalPages: pagination?.totalPages || 0,
      totalHours: 0,
      totalSpent: 0,
      totalRefunded: 0,
      bookingsByStatus: {} as Record<string, number>,
      hoursBreakdown: [] as { id: string; timeSlot: string; hours: number; status: string }[],
      uniqueUserIds: new Set<string>()
    };

    bookings.forEach(booking => {
      // Count by status
      stats.bookingsByStatus[booking.status] = (stats.bookingsByStatus[booking.status] || 0) + 1;
      
      // Track user IDs to detect if there are bookings from multiple users
      if ((booking as any).userId) {
        stats.uniqueUserIds.add((booking as any).userId);
      }
      
      // Calculate hours
      const hours = calculateBookingHours(booking);
      stats.hoursBreakdown.push({
        id: booking.id,
        timeSlot: booking.timeSlot,
        hours,
        status: booking.status
      });
      
      // Add to total hours for completed/paid bookings only
      if (booking.status === 'completed' || booking.status === 'paid') {
        stats.totalHours += hours;
        stats.totalSpent += booking.totalPrice;
      }
      
      // Add refunded amount
      if (booking.status === 'refunded') {
        stats.totalRefunded += (booking.refundAmount || booking.totalPrice);
      }
    });

    return stats;
  }, [bookings, pagination]);

  const handleDebugCount = async () => {
    setLoading(true);
    try {
      const result = await debugBookingCount();
      setDebugInfo(result.data);
    } catch (error) {
      console.error('Failed to get debug info:', error);
      setDebugInfo({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (process.env.NODE_ENV !== 'development') {
    return null; // Only show in development
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-blue-800">🔍 Debug: Booking Statistics</h3>
        <button
          onClick={handleDebugCount}
          disabled={loading}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Debug Count API'}
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <h4 className="font-medium text-blue-700 mb-2">Tổng quan</h4>
          <ul className="space-y-1">
            <li>📊 Bookings trong array: <strong>{debug.totalBookings}</strong></li>
            <li>📄 Pagination total: <strong className={debug.paginationTotal !== debug.totalBookings ? 'text-red-600' : 'text-green-600'}>{debug.paginationTotal}</strong></li>
            <li>📑 Trang {debug.currentPage}/{debug.totalPages}</li>
            <li>👥 Unique users: <strong>{debug.uniqueUserIds.size}</strong></li>
            <li>⏰ Tổng giờ chơi: <strong>{debug.totalHours.toFixed(2)} giờ</strong></li>
            <li>💰 Tổng tiền: <strong>{debug.totalSpent.toLocaleString('vi-VN')}đ</strong></li>
            <li>💸 Tiền hoàn: <strong>{debug.totalRefunded.toLocaleString('vi-VN')}đ</strong></li>
          </ul>
          {debug.paginationTotal !== debug.totalBookings && (
            <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs">
              ⚠️ <strong>Cảnh báo:</strong> Pagination total ({debug.paginationTotal}) khác với số bookings hiện tại ({debug.totalBookings}). 
              Có thể đang hiển thị theo pagination.
            </div>
          )}
        </div>
        
        <div>
          <h4 className="font-medium text-blue-700 mb-2">Theo trạng thái</h4>
          <ul className="space-y-1">
            {Object.entries(debug.bookingsByStatus).map(([status, count]) => (
              <li key={status}>
                {status}: <strong>{count}</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      {/* Debug API Results */}
      {debugInfo && (
        <div className="mt-4 p-3 bg-gray-100 rounded">
          <h4 className="font-medium text-gray-700 mb-2">🛠️ Backend Debug Info</h4>
          {debugInfo.error ? (
            <div className="text-red-600">Error: {debugInfo.error}</div>
          ) : (
            <div className="text-sm space-y-1">
              <div>👤 User ID: <code>{debugInfo.userId}</code></div>
              <div>📊 Total Count (Backend): <strong>{debugInfo.totalCount}</strong></div>
              <div>📈 Status Breakdown:</div>
              <ul className="ml-4">
                {debugInfo.statusCounts?.map((item: any, index: number) => (
                  <li key={index}>• {item.status}: {item.count}</li>
                ))}
              </ul>
              {debugInfo.duplicateCheck?.length > 0 && (
                <div className="text-red-600">⚠️ Duplicates found: {debugInfo.duplicateCheck.length}</div>
              )}
            </div>
          )}
        </div>
      )}
      
      <details className="mt-4">
        <summary className="font-medium text-blue-700 cursor-pointer">Chi tiết giờ chơi từng booking</summary>
        <div className="mt-2 max-h-40 overflow-y-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-100">
                <th className="text-left p-1">ID</th>
                <th className="text-left p-1">TimeSlot</th>
                <th className="text-left p-1">Giờ</th>
                <th className="text-left p-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {debug.hoursBreakdown.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-blue-25' : 'bg-white'}>
                  <td className="p-1">{item.id.slice(-8)}</td>
                  <td className="p-1">{item.timeSlot}</td>
                  <td className="p-1">{item.hours}</td>
                  <td className="p-1">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
