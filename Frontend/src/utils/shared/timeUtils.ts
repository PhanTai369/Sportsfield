/**
 * Centralized time formatting utilities
 * Single source of truth for all time-related formatting across the application
 */

/**
 * Format time from "HH:MM:SS" to "HH:MM"
 */
export function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  // timeStr is in format "HH:MM:SS", we want "HH:MM"
  return timeStr.substring(0, 5);
}

/**
 * Format time range from start time with comprehensive error handling
 */
export function formatTimeRange(startTime: string): string {
  console.log('🕐 Formatting time range for:', startTime);
  
  // Validate input
  if (!startTime || typeof startTime !== 'string') {
    console.warn('⚠️ Invalid time input:', startTime);
    return 'Thời gian không hợp lệ';
  }

  try {
    // Clean the time string - remove extra spaces and handle various formats
    const cleanTime = startTime.trim();
    
    // Handle different time formats
    let hours: number, minutes: number;
    
    if (cleanTime.includes(':')) {
      // Format: "08:00" or "08:00:00"
      const timeParts = cleanTime.split(':');
      hours = parseInt(timeParts[0], 10);
      minutes = parseInt(timeParts[1] || '0', 10);
    } else if (cleanTime.length === 4) {
      // Format: "0800"
      hours = parseInt(cleanTime.substring(0, 2), 10);
      minutes = parseInt(cleanTime.substring(2, 4), 10);
    } else if (cleanTime.length === 3) {
      // Format: "800" (8:00)
      hours = parseInt(cleanTime.substring(0, 1), 10);
      minutes = parseInt(cleanTime.substring(1, 3), 10);
    } else {
      // Try parsing as number for simple formats
      const timeNum = parseInt(cleanTime, 10);
      if (!isNaN(timeNum)) {
        hours = Math.floor(timeNum / 100);
        minutes = timeNum % 100;
      } else {
        throw new Error('Unrecognized time format');
      }
    }

    // Validate parsed time values
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      console.warn('⚠️ Invalid time values:', { hours, minutes, originalTime: startTime });
      return `${cleanTime} - Thời gian không hợp lệ`;
    }

    // Format the start time properly
    const formattedStartTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    // Calculate end time (1 hour later)
    const endHour = hours + 1;
    const formattedEndTime = `${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    const result = `${formattedStartTime} - ${formattedEndTime}`;
    console.log('✅ Formatted time range:', result);
    return result;
  } catch (error) {
    console.error('❌ Error formatting time range:', error, 'Original time:', startTime);
    return `${startTime} - Lỗi định dạng thời gian`;
  }
}

/**
 * Create time range string from start and end times
 */
export function createTimeRange(startTime: string, endTime: string): string {
  const formattedStart = formatTime(startTime);
  const formattedEnd = formatTime(endTime);
  
  if (!formattedStart || !formattedEnd) {
    return 'Thời gian không hợp lệ';
  }
  
  return `${formattedStart} - ${formattedEnd}`;
}

/**
 * Parse time string to get hours and minutes
 */
export function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  try {
    const cleanTime = timeStr.trim();
    
    if (cleanTime.includes(':')) {
      const [hoursStr, minutesStr] = cleanTime.split(':');
      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr || '0', 10);
      
      if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        return { hours, minutes };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing time:', error);
    return null;
  }
}

/**
 * Format Vietnamese date display
 */
export function formatDisplayDate(day: number): string {
  try {
    const today = new Date();
    const date = new Date(today.getFullYear(), today.getMonth(), day);
    return date.toLocaleDateString('vi-VN', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch (error) {
    console.error('Error formatting display date:', error);
    return 'Ngày không hợp lệ';
  }
}

/**
 * Get Vietnamese day name
 */
export function getDayName(date: Date): string {
  try {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return days[date.getDay()];
  } catch (error) {
    return 'Không xác định';
  }
}

/**
 * Check if time is in the past
 */
export function isTimeInPast(dateStr: string, timeStr: string): boolean {
  try {
    const now = new Date();
    const targetDateTime = new Date(`${dateStr}T${timeStr}`);
    return targetDateTime < now;
  } catch (error) {
    console.error('Error checking if time is in past:', error);
    return false;
  }
}
