import React from 'react';
import { Filter, Calendar, CreditCard } from 'lucide-react';
import { Button } from '../ui/button';

interface BookingFilterProps {
  onFilterChange: (filters: { status: string; dateRange: string }) => void;
  onSearch: (query: string) => void;
  totalBookings: number;
}

export function BookingFilter({
  onFilterChange,
  onSearch,
  totalBookings
}: BookingFilterProps) {
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [dateFilter, setDateFilter] = React.useState('all');

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    onFilterChange({ status, dateRange: dateFilter });
  };

  const handleDateChange = (dateRange: string) => {
    setDateFilter(dateRange);
    onFilterChange({ status: statusFilter, dateRange });
  };

  const handleClearFilters = () => {
    setStatusFilter('all');
    setDateFilter('all');
    onFilterChange({ status: 'all', dateRange: 'all' });
  };

  const statusOptions = [
    { value: 'all', label: 'Tất cả trạng thái', color: 'text-gray-700' },
    { value: 'paid', label: 'Đã thanh toán', color: 'text-green-700' },
    { value: 'pending', label: 'Chờ thanh toán', color: 'text-orange-700' },
    { value: 'completed', label: 'Hoàn thành', color: 'text-green-700' },
    { value: 'cancelled', label: 'Đã hủy', color: 'text-red-700' },
    { value: 'refunded', label: 'Đã hoàn tiền', color: 'text-purple-700' }
  ];

  const dateOptions = [
    { value: 'all', label: 'Tất cả thời gian' },
    { value: 'today', label: 'Hôm nay' },
    { value: 'week', label: '7 ngày qua' },
    { value: 'month', label: '30 ngày qua' },
    { value: 'quarter', label: '3 tháng qua' }
  ];

  const hasActiveFilters = statusFilter !== 'all' || dateFilter !== 'all';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-gray-500" />
        <h3 className="font-medium text-gray-800">Bộ lọc</h3>
        <span className="text-sm text-gray-500">({totalBookings} kết quả)</span>
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            className="ml-auto text-xs"
          >
            Xóa bộ lọc
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <CreditCard className="w-4 h-4 inline mr-1" />
            Trạng thái booking
          </label>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Thời gian
          </label>
          <select
            value={dateFilter}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            {dateOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-600">Đang lọc:</span>
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {statusOptions.find(opt => opt.value === statusFilter)?.label}
              </span>
            )}
            {dateFilter !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {dateOptions.find(opt => opt.value === dateFilter)?.label}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
