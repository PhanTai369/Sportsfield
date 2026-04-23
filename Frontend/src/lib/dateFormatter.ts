/**
 * Date Formatter
 * Utilities for consistent date formatting and manipulation
 */
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/vi';
import logger from './logger';

// Configure dayjs
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('vi');

// Set default timezone to Vietnam
const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Format a date using standard format
 * @param date - Date to format
 * @param format - Format string (default: DD/MM/YYYY)
 * @returns Formatted date string
 */
export const formatDate = (
  date: Date | string | number | null | undefined,
  format = 'DD/MM/YYYY'
): string => {
  if (!date) return '';
  
  try {
    return dayjs(date).tz(DEFAULT_TIMEZONE).format(format);
  } catch (error) {
    logger.error('Date formatting error', { 
      context: 'DateFormatter',
      data: { date, format, error }
    });
    return '';
  }
};

/**
 * Format a date with time
 * @param date - Date to format
 * @param format - Format string (default: HH:mm DD/MM/YYYY)
 * @returns Formatted date and time string
 */
export const formatDateTime = (
  date: Date | string | number | null | undefined,
  format = 'HH:mm DD/MM/YYYY'
): string => {
  return formatDate(date, format);
};

/**
 * Format a time only
 * @param date - Date to extract time from
 * @param format - Format string (default: HH:mm)
 * @returns Formatted time string
 */
export const formatTime = (
  date: Date | string | number | null | undefined,
  format = 'HH:mm'
): string => {
  return formatDate(date, format);
};

/**
 * Get relative time (e.g., "2 days ago")
 * @param date - Date to compare
 * @param baseDate - Base date to compare against (default: now)
 * @returns Localized relative time string
 */
export const getRelativeTime = (
  date: Date | string | number | null | undefined,
  baseDate?: Date | string | number
): string => {
  if (!date) return '';
  
  try {
    return baseDate 
      ? dayjs(date).from(dayjs(baseDate))
      : dayjs(date).fromNow();
  } catch (error) {
    logger.error('Relative time formatting error', { 
      context: 'DateFormatter',
      data: { date, baseDate, error }
    });
    return '';
  }
};

/**
 * Format a date range
 * @param startDate - Start date
 * @param endDate - End date
 * @param format - Format for each date (default: DD/MM/YYYY)
 * @returns Formatted date range string
 */
export const formatDateRange = (
  startDate: Date | string | number | null | undefined,
  endDate: Date | string | number | null | undefined,
  format = 'DD/MM/YYYY'
): string => {
  if (!startDate || !endDate) {
    return '';
  }
  
  try {
    const formattedStart = formatDate(startDate, format);
    const formattedEnd = formatDate(endDate, format);
    
    return `${formattedStart} - ${formattedEnd}`;
  } catch (error) {
    logger.error('Date range formatting error', { 
      context: 'DateFormatter',
      data: { startDate, endDate, format, error }
    });
    return '';
  }
};

/**
 * Check if a date is today
 * @param date - Date to check
 * @returns True if date is today
 */
export const isToday = (date: Date | string | number | null | undefined): boolean => {
  if (!date) return false;
  
  try {
    const today = dayjs().tz(DEFAULT_TIMEZONE).startOf('day');
    const targetDate = dayjs(date).tz(DEFAULT_TIMEZONE).startOf('day');
    
    return today.isSame(targetDate);
  } catch (error) {
    logger.error('isToday check error', { 
      context: 'DateFormatter',
      data: { date, error }
    });
    return false;
  }
};

/**
 * Parse a date string to Date object
 * @param dateString - Date string to parse
 * @param format - Expected format of the date string
 * @returns Parsed Date object or null if invalid
 */
export const parseDate = (
  dateString: string,
  format?: string
): Date | null => {
  if (!dateString) return null;
  
  try {
    const parsedDate = format
      ? dayjs(dateString, format).tz(DEFAULT_TIMEZONE)
      : dayjs(dateString).tz(DEFAULT_TIMEZONE);
      
    return parsedDate.isValid() ? parsedDate.toDate() : null;
  } catch (error) {
    logger.error('Date parsing error', { 
      context: 'DateFormatter',
      data: { dateString, format, error }
    });
    return null;
  }
};

/**
 * Get a human-readable duration
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 */
export const formatDuration = (seconds: number): string => {
  if (!seconds || seconds < 0) return '';
  
  try {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  } catch (error) {
    logger.error('Duration formatting error', { 
      context: 'DateFormatter',
      data: { seconds, error }
    });
    return '';
  }
}; 