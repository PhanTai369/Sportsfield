// Utility functions for formatting slot information in human-readable format
import { formatTimeRange as centralizedFormatTimeRange } from './shared/timeUtils';
import { formatCurrencyValue } from './shared/currencyUtils';

export interface SubField {
  id: string;
  name: string;
  field_type: string;
}

export interface SlotDetails {
  subfieldName: string;
  fieldType: string;
  displayType: string;
  times: string[];
  timeRanges: string[];
  count: number;
}

/**
 * Get field type display name in Vietnamese
 */
export const getFieldTypeDisplay = (fieldType: string): string => {
  switch (fieldType) {
    case '5vs5': return 'Sân 5vs5 (5 người)';
    case '7vs7': return 'Sân 7vs7 (7 người)';
    default: return 'Sân bóng đá';
  }
};

/**
 * Format time range from start time with comprehensive error handling
 * @deprecated Use centralized timeUtils instead
 */
export const formatTimeRange = (startTime: string): string => {
  return centralizedFormatTimeRange(startTime);
};

/**
 * Get subfield details from subfield ID and available subfields
 */
export const getSubfieldDetails = (subfieldId: string, subfields: SubField[]) => {
  const subfield = subfields.find(sub => sub.id === subfieldId);
  if (subfield) {
    return {
      name: subfield.name,
      fieldType: subfield.field_type,
      displayType: getFieldTypeDisplay(subfield.field_type)
    };
  }
  return {
    name: `Sân ${subfieldId.substring(0, 8)}`,
    fieldType: 'unknown',
    displayType: 'Sân bóng đá'
  };
};

/**
 * Enhanced subfield details lookup with better fallback logic
 */
export const getSubfieldDetailsEnhanced = (subfieldId: string, subfields: SubField[]) => {
  console.log('🔍 Looking up subfield:', subfieldId);
  
  // Check if subfields data is available
  if (!subfields || !Array.isArray(subfields)) {
    console.warn('⚠️ No subfields data available');
    return {
      name: getSubfieldNameFromId(subfieldId),
      fieldType: '5vs5',
      displayType: getFieldTypeDisplay('5vs5')
    };
  }

  // Look for exact match first
  const exactMatch = subfields.find(sub => sub.id === subfieldId);
  if (exactMatch) {
    console.log('✅ Found exact match:', exactMatch);
    return {
      name: exactMatch.name || getSubfieldNameFromId(subfieldId),
      fieldType: exactMatch.field_type || '5vs5',
      displayType: getFieldTypeDisplay(exactMatch.field_type || '5vs5')
    };
  }

  // Look for partial match (in case of ID variations)
  const partialMatch = subfields.find(sub => 
    sub.id.includes(subfieldId) || subfieldId.includes(sub.id)
  );
  if (partialMatch) {
    console.log('✅ Found partial match:', partialMatch);
    return {
      name: partialMatch.name || getSubfieldNameFromId(subfieldId),
      fieldType: partialMatch.field_type || '5vs5',
      displayType: getFieldTypeDisplay(partialMatch.field_type || '5vs5')
    };
  }

  // Enhanced fallback
  console.warn('⚠️ Subfield not found, using enhanced fallback:', subfieldId);
  return {
    name: getSubfieldNameFromId(subfieldId),
    fieldType: '5vs5',
    displayType: getFieldTypeDisplay('5vs5')
  };
};

/**
 * Process selected slots to group by subfield with human-readable information
 */
export const processSlotDetails = (selectedSlots: string[], subfields: SubField[]): Record<string, SlotDetails> => {
  // Validate inputs
  if (!selectedSlots || !Array.isArray(selectedSlots) || selectedSlots.length === 0) {
    return {};
  }
  
  if (!subfields || !Array.isArray(subfields)) {
    console.warn('⚠️ No subfields data provided to processSlotDetails');
  }

  const slotsBySubfield: Record<string, SlotDetails> = {};

  selectedSlots.forEach(slotId => {
    if (!slotId || typeof slotId !== 'string') {
      console.warn('⚠️ Invalid slot ID:', slotId);
      return;
    }

    const { subfieldId, timeString } = parseSlotId(slotId);
    
    if (!subfieldId || !timeString) {
      console.warn('⚠️ Failed to parse slot ID:', slotId);
      return;
    }
    
    const subfieldDetails = getSubfieldDetailsEnhanced(subfieldId, subfields || []);

    if (!slotsBySubfield[subfieldId]) {
      slotsBySubfield[subfieldId] = {
        subfieldName: subfieldDetails.name,
        fieldType: subfieldDetails.fieldType,
        displayType: subfieldDetails.displayType,
        times: [],
        timeRanges: [],
        count: 0
      };
    }

    slotsBySubfield[subfieldId].times.push(timeString);
    slotsBySubfield[subfieldId].count++;
  });

  // Sort times for each subfield and generate time ranges
  Object.keys(slotsBySubfield).forEach(subfieldId => {
    const details = slotsBySubfield[subfieldId];
    details.times.sort();
    details.timeRanges = details.times.map(time => {
      try {
        return formatTimeRange(time);
      } catch (error) {
        console.warn('⚠️ Failed to format time:', time, error);
        return time; // Fallback to original time
      }
    });
  });

  return slotsBySubfield;
};

/**
 * Format currency in Vietnamese format
 * @deprecated Use centralized currencyUtils instead
 */
export const formatCurrency = (amount: number): string => {
  return formatCurrencyValue(amount);
};

/**
 * Format date for display in Vietnamese
 */
export const formatDisplayDate = (day: number): string => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Create date with proper day of month
  const date = new Date(currentYear, currentMonth, day);
  
  // Check if the created date is valid
  if (date.getDate() !== day || date.getMonth() !== currentMonth) {
    // If day is invalid for current month, use today
    return today.toLocaleDateString('vi-VN', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
  }
  
  return date.toLocaleDateString('vi-VN', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long',
    year: 'numeric'
  });
};

/**
 * Generate readable booking summary text
 */
export const generateBookingSummary = (
  selectedSlots: string[], 
  subfields: SubField[], 
  selectedDate: number
): string => {
  // Validate inputs
  if (!selectedSlots || selectedSlots.length === 0) {
    return 'Chưa có slot nào được chọn';
  }
  
  if (!selectedDate || selectedDate < 1 || selectedDate > 31) {
    return 'Ngày không hợp lệ';
  }

  try {
    const slotDetails = processSlotDetails(selectedSlots, subfields);
    const dateText = formatDisplayDate(selectedDate);
    
    if (Object.keys(slotDetails).length === 0) {
      return `Không thể xử lý thông tin đặt sân cho ngày ${dateText}`;
    }
    
    const summaryParts = Object.values(slotDetails).map(details => 
      `${details.subfieldName} (${details.displayType}): ${details.timeRanges.join(', ')}`
    );

    return `Đặt sân ngày ${dateText}\n${summaryParts.join('\n')}`;
  } catch (error) {
    console.error('Error generating booking summary:', error);
    return 'Lỗi khi tạo thông tin đặt sân';
  }
};

/**
 * Parse complex slot ID to extract subfield ID and time
 */
export const parseSlotId = (slotId: string): { subfieldId: string; timeString: string } => {
  if (!slotId || typeof slotId !== 'string') {
    console.error('❌ Invalid slot ID:', slotId);
    return { subfieldId: '', timeString: '' };
  }
  
  // Split by dash
  const parts = slotId.split('-');
  
  if (parts.length < 2) {
    console.error('❌ Invalid slot ID format:', slotId);
    return { subfieldId: slotId, timeString: '' };
  }
  
  // Look for time pattern in the parts (HH:MM or H:MM format)
  const timePattern = /^\d{1,2}:\d{2}$/;
  const timePartIndex = parts.findIndex(part => timePattern.test(part));
  
  let subfieldId = '';
  let timeString = '';
  
  if (timePartIndex !== -1) {
    timeString = parts[timePartIndex];
    // Reconstruct subfieldId from parts before time
    subfieldId = parts.slice(0, timePartIndex).join('-');
  } else {
    // Fallback: check if last part looks like time without colon (e.g., "0800")
    const lastPart = parts[parts.length - 1];
    if (/^\d{3,4}$/.test(lastPart)) {
      // Convert HHMM to HH:MM format
      const hours = lastPart.slice(0, -2);
      const minutes = lastPart.slice(-2);
      timeString = `${hours.padStart(2, '0')}:${minutes}`;
      subfieldId = parts.slice(0, -1).join('-');
    } else {
      // Assume last part is time, rest is subfieldId
      timeString = lastPart;
      subfieldId = parts.slice(0, -1).join('-');
    }
  }
  
  // Validate timeString format
  if (timeString && !timePattern.test(timeString)) {
    console.warn('⚠️ Invalid time format:', timeString);
  }
  
  return { subfieldId, timeString };
};

/**
 * Get subfield name from ID with enhanced fallback logic
 */
export const getSubfieldNameFromId = (subfieldId: string): string => {
  // Extract meaningful name from UUID patterns
  if (subfieldId.includes('174000')) return 'Sân A';
  if (subfieldId.includes('174001')) return 'Sân B';
  if (subfieldId.includes('174002')) return 'Sân C';
  
  // Try to extract from different patterns
  if (subfieldId.includes('bb1e4567')) return 'Sân B';
  if (subfieldId.includes('e89b')) return 'Sân A';
  
  // Extract letters and numbers for naming
  const letterMatch = subfieldId.match(/[a-zA-Z]+/);
  const numberMatch = subfieldId.match(/\d+/);
  
  if (letterMatch && numberMatch) {
    return `Sân ${letterMatch[0].toUpperCase()}${numberMatch[0].slice(-1)}`;
  } else if (letterMatch) {
    return `Sân ${letterMatch[0].toUpperCase()}`;
  } else if (numberMatch) {
    return `Sân ${numberMatch[0].slice(-1)}`;
  }
  
  // Fallback to last 4 characters
  const lastPart = subfieldId.slice(-4);
  return `Sân ${lastPart}`;
};
