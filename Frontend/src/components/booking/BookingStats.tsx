import React from 'react';
import { Calendar, Clock, DollarSign } from 'lucide-react';
import { formatCurrencyValue } from '../../utils/shared/currencyUtils';

interface BookingStatsProps {
  totalBookings: number;
  totalHours: number;
  totalSpent: number;
  totalRefunded?: number; // Thêm trường tổng tiền đã hoàn
}

export function BookingStats({ 
  totalBookings, 
  totalHours, 
  totalSpent,
  totalRefunded = 0 // Default value nếu không có
}: BookingStatsProps) {
  const stats = [
    {
      title: 'Tổng số lần đặt sân',
      value: totalBookings.toString(),
      icon: Calendar,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: 'Tổng số giờ chơi',
      value: `${totalHours} giờ`,
      icon: Clock,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      title: 'Tổng chi tiêu',
      value: `${formatCurrencyValue(totalSpent)} đ`,
      icon: DollarSign,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
    {
      title: 'Tổng tiền đã hoàn',
      value: `${formatCurrencyValue(totalRefunded)} đ`,
      icon: DollarSign,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className={`${stat.bgColor} rounded-lg p-6 border border-gray-200 shadow-sm`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {stat.title}
                </p>
                <p className={`text-2xl font-bold ${stat.textColor}`}>
                  {stat.value}
                </p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
