import React from 'react';
import {
  formatDate,
  formatDateTime,
  formatTime,
  getRelativeTime,
  isToday,
  formatDateRange
} from '../../lib/dateFormatter';

export interface DateDisplayProps {
  date: Date | string | number;
  format?: 'date' | 'datetime' | 'time' | 'relative' | 'smart' | 'custom';
  customFormat?: string;
  endDate?: Date | string | number;
  className?: string;
}

/**
 * A reusable component for displaying formatted dates
 */
const DateDisplay: React.FC<DateDisplayProps> = ({
  date,
  format = 'date',
  customFormat,
  endDate,
  className = ''
}) => {
  if (!date) {
    return null;
  }

  let formattedDate: string;

  switch (format) {
    case 'datetime':
      formattedDate = formatDateTime(date);
      break;
    case 'time':
      formattedDate = formatTime(date);
      break;
    case 'relative':
      formattedDate = getRelativeTime(date);
      break;
    case 'smart':
      // Smart format: show relative time for recent dates, regular format for older dates
      formattedDate = isToday(date) 
        ? getRelativeTime(date) 
        : formatDate(date);
      break;
    case 'custom':
      formattedDate = formatDate(date, customFormat || 'DD/MM/YYYY');
      break;
    default:
      // For date range, check if endDate is provided
      if (endDate) {
        formattedDate = formatDateRange(date, endDate);
      } else {
        formattedDate = formatDate(date);
      }
  }

  return (
    <time dateTime={new Date(date).toISOString()} className={className}>
      {formattedDate}
    </time>
  );
};

export default DateDisplay; 