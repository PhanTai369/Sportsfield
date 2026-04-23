// TimeSlot Management Types
// Created: 2025-06-11

export interface TimeSlot {
  id: string;
  field: string;
  fieldName?: string; // For mapping with API response subfield_name
  startTime: string;
  endTime: string;
  time?: string; // Add time field for compatibility
  price: string;
  status: 'available' | 'booked' | 'maintenance' | 'past';
  basePrice?: number;
  finalPrice?: number;
  peakHourMultiplier?: number;
  // For booked status
  customerName?: string;
  customerPhone?: string;
  bookingDate?: string;
  paymentStatus?: 'paid' | 'pending' | 'cancelled';
  bookingStatus?: 'paid' | 'pending' | 'cancelled' | 'payment_pending' | 'confirmed';  
  // For maintenance status
  maintenanceReason?: string;
  maintenanceUntil?: string;
  estimatedCompletion?: string; // Keep for backward compatibility
  maintenanceStaff?: string;
  // For available status
  description?: string;
  // For optimistic updates
  isOptimistic?: boolean;
  // For virtual slots (client-side only)
  isVirtual?: boolean;
  isPast?: boolean;
}

export interface DragState {
  isDragging: boolean;
  startTime: string | null;
  endTime: string | null;
  field: string | null;
}

export interface ContextMenu {
  visible: boolean;
  x: number;
  y: number;
  timeSlot: TimeSlot | null;
}

export interface TooltipInfo {
  visible: boolean;
  x: number;
  y: number;
  timeSlot: TimeSlot | null;
  time: string;
  field: string;
}

// Additional utility types for TimeSlot Management
export type TimeSlotStatus = 'available' | 'booked' | 'maintenance';
export type PaymentStatus = 'paid' | 'pending' | 'cancelled';
export type FieldName = 'A' | 'B' | 'C' | 'D' | 'E';

// Props interface for TimeSlot related components
export interface TimeSlotCellProps {
  timeSlot?: TimeSlot;
  time: string;
  field: string;
  isDraggedOver: boolean;
  onMouseDown: (time: string, field: string, event: React.MouseEvent) => void;
  onMouseEnter: (time: string, field: string) => void;
  onContextMenu: (event: React.MouseEvent, timeSlot: TimeSlot | null) => void;
  onClick: (event: React.MouseEvent, timeSlot: TimeSlot | null, time: string, field: string) => void;
}
