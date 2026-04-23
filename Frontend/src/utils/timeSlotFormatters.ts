/**
 * TimeSlot Formatting Utilities
 * Common formatting functions for time slots, dates, and currency in the timeSlot management system
 */

import { formatDate as formatDateUtil } from "../lib/dateFormatter";
import { formatCurrencyValue as formatCurrency } from "./shared/currencyUtils";

/**
 * Format time string from HH:MM:SS to HH:MM
 * @param timeString - Time string to format
 * @returns Formatted time string
 */
export const formatTimeSlot = (timeString: string): string => {
  if (!timeString) return "";
  return timeString.length > 5 ? timeString.substring(0, 5) : timeString;
};

/**
 * Format a date with day name for display
 * @param date - Date to format
 * @returns Formatted date string with day name
 */
export const formatDateWithDay = (date: Date): string => {
  return formatDateUtil(date, "dddd, D MMMM YYYY");
};

/**
 * Get day name from date
 * @param date - Date to extract day name from
 * @returns Day name in Vietnamese
 */
export const getDayName = (date: Date): string => {
  return formatDateUtil(date, "dddd");
};

/**
 * Format booking date for display
 * @param bookingDate - Booking date to format
 * @returns Formatted booking date
 */
export const formatBookingDate = (
  bookingDate: string | Date | null | undefined
): string => {
  return formatDateUtil(bookingDate);
};

/**
 * Format price for time slot display
 * @param price - Price amount
 * @returns Formatted currency string
 */
export const formatTimeSlotPrice = (price: number): string => {
  return formatCurrency(price);
};

/**
 * Format booking status display text
 * @param paymentStatus - Payment status
 * @param bookingStatus - Booking status
 * @returns Formatted status description
 */
export const formatBookingStatus = (
  paymentStatus?: string,
  bookingStatus?: string
): string => {
  const statusIcon =
    bookingStatus === "confirmed"
      ? "✅"
      : bookingStatus === "payment_pending"
      ? "⏳"
      : "❓";
  const paymentText =
    paymentStatus === "paid" ? "Đã thanh toán" : "Chờ thanh toán";

  return `${statusIcon} ${paymentText}`;
};

/**
 * Get payment status display badge info
 * @param paymentStatus - Payment status
 * @param slotStatus - Time slot status (to handle maintenance)
 * @returns Badge configuration for payment status
 */
export const getPaymentStatusBadge = (paymentStatus?: string, slotStatus?: string) => {
  // Handle maintenance status first
  if (slotStatus === "maintenance") {
    return {
      className: "bg-red-500",
      text: "🔧 Bảo trì",
    };
  }
  
  switch (paymentStatus) {
    case "paid":
      return {
        className: "bg-green-500",
        text: "✅ Đã đặt",
      };
    case "pending":
      return {
        className: "bg-yellow-500",
        text: "⏳ Chờ thanh toán",
      };
    default:
      return {
        className: "bg-blue-500",
        text: "Đã đặt",
      };
  }
};

/**
 * Common time slot constants
 */
export const TIME_SLOT_CONSTANTS = {
  DISPLAY_HOURS: {
    START: "05:00",
    END: "22:00",
  },
  STATUS: {
    AVAILABLE: "available",
    BOOKED: "booked",
    MAINTENANCE: "maintenance",
  },
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
} as const;
