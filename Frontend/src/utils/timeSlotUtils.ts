/**
 * Utility functions for time slot calculations
 */

/**
 * Calculate total hours from a time slot string or array
 * @param timeSlot - Time slot string (e.g., "07:00 - 08:00") or array of time slot strings
 * @returns Total hours as a number
 */
export const calculateHoursFromTimeSlot = (timeSlot: string | string[] | null | undefined): number => {
  if (!timeSlot) return 0;
  
  // Handle array of time slots
  if (Array.isArray(timeSlot)) {
    return timeSlot.reduce((total, slot) => total + calculateHoursFromSingleSlot(slot), 0);
  }
  
  // Handle single time slot string
  return calculateHoursFromSingleSlot(timeSlot);
};

/**
 * Calculate hours from a single time slot string
 * @param timeSlot - Time slot string (e.g., "07:00 - 08:00")
 * @returns Hours as a number
 */
const calculateHoursFromSingleSlot = (timeSlot: string): number => {
  if (!timeSlot || typeof timeSlot !== 'string') return 0;
  
  // Handle formats like "07:00 - 08:00", "7:00-8:00", "07:00-08:00"
  const timePattern = /(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/;
  const match = timeSlot.match(timePattern);
  
  if (!match) {
    console.warn('Could not parse timeSlot:', timeSlot);
    // If no match, try to extract just numbers and assume common patterns
    const numbers = timeSlot.match(/\d+/g);
    if (numbers && numbers.length >= 2) {
      const startHour = parseInt(numbers[0]);
      const endHour = parseInt(numbers[1]);
      if (!isNaN(startHour) && !isNaN(endHour) && endHour > startHour) {
        return endHour - startHour;
      }
    }
    return 1; // Default to 1 hour if can't parse
  }
  
  const [, startHour, startMinute, endHour, endMinute] = match;
  
  // Convert to minutes
  const startMinutes = parseInt(startHour) * 60 + parseInt(startMinute);
  const endMinutes = parseInt(endHour) * 60 + parseInt(endMinute);
  
  // Handle overnight slots (e.g., "23:00 - 01:00")
  let diffMinutes = endMinutes - startMinutes;
  if (diffMinutes <= 0) {
    diffMinutes = (24 * 60) + diffMinutes; // Add 24 hours
  }
  
  // Calculate difference in hours
  return diffMinutes / 60;
};

/**
 * Calculate total hours from booking data including sub-fields
 * @param booking - Booking object with timeSlot and optionally subFields
 * @returns Total hours as a number
 */
export const calculateBookingHours = (booking: any): number => {
  let totalHours = 0;
  
  // Add hours from main time slot
  if (booking.timeSlot) {
    totalHours += calculateHoursFromTimeSlot(booking.timeSlot);
  }
  
  // Add hours from sub-fields if they exist
  if (booking.subFields && Array.isArray(booking.subFields)) {
    booking.subFields.forEach((subField: any) => {
      if (subField.timeSlot) {
        totalHours += calculateHoursFromTimeSlot(subField.timeSlot);
      }
    });
  }
  
  return totalHours;
};
