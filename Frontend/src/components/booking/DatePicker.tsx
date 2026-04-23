"use client"

import { useState, useEffect } from 'react';

interface DatePickerProps {
  selectedDate: number;
  onDateSelect: (date: number) => void;
}

export function DatePicker({ selectedDate, onDateSelect }: DatePickerProps) {
  const [dates, setDates] = useState<{ date: number; day: string; month: string; isToday: boolean }[]>([]);

  useEffect(() => {
    // Generate dates for the next 7 days starting from today
    const today = new Date();
    const nextDays = [];
    
    const weekdays = ['CN', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);
      
      nextDays.push({
        date: date.getDate(),
        day: weekdays[date.getDay()],
        month: (date.getMonth() + 1).toString(),
        isToday: i === 0
      });
    }
    
    setDates(nextDays);
  }, []);

  return (
    <div className="mb-4 sm:mb-6">
      <h3 className="text-green-600 font-medium mb-2 sm:mb-3 border-l-4 border-green-500 pl-3 text-sm sm:text-base">Chọn ngày</h3>

      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2 sm:gap-3 booking-date-grid">
        {dates.map((dateInfo) => (
          <button
            key={dateInfo.date}
            onClick={() => onDateSelect(dateInfo.date)}
            className={`flex flex-col items-center p-2 sm:p-3 rounded-xl border-2 booking-date-picker-item ${
              selectedDate === dateInfo.date
                ? "bg-green-500 text-white border-green-500 booking-date-picker-selected"
                : "bg-white text-gray-600 border-gray-200 hover:border-green-300 hover:shadow-md"
            }`}
          >
            <span className="text-xs font-medium mb-1">{dateInfo.day}</span>
            <span className="text-lg sm:text-xl font-bold">{dateInfo.date}</span>
            <span className="text-xs opacity-75">T{dateInfo.month}</span>
            {dateInfo.isToday && (
              <span className={`text-xs mt-1 px-1 sm:px-2 py-0.5 rounded-full ${
                selectedDate === dateInfo.date ? 'bg-white text-green-500' : 'bg-green-100 text-green-600'
              }`}>
                Hôm nay
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
