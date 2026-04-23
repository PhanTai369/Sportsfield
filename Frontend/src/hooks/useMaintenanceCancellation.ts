import { useState } from 'react';
import { toast } from 'sonner';

interface BookingInfo {
  bookingId: string;
  fieldName?: string;
  customerName?: string;
  date?: string;
  time?: string;
  totalPrice?: number;
}

interface MaintenanceResult {
  bookingId: string;
  cancelled: boolean;
  refundAmount: number;
  emailSent: boolean;
  maintenanceReason: string;
}

export const useMaintenanceCancellation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [currentBooking, setCurrentBooking] = useState<BookingInfo | null>(null);
  const [maintenanceReason, setMaintenanceReason] = useState('');
  const [result, setResult] = useState<MaintenanceResult | null>(null);

  const initiateMaintenanceCancellation = (
    booking: BookingInfo,
    reason: string = 'Bảo trì định kỳ'
  ) => {
    setCurrentBooking(booking);
    setMaintenanceReason(reason);
    setShowConfirmDialog(true);
  };

  const confirmMaintenanceCancellation = async () => {
    if (!currentBooking) return;

    setIsLoading(true);
    setShowConfirmDialog(false);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Không tìm thấy token xác thực');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || "https://football-field-booking-backend.onrender.com/api"}/bookings/cancel-for-maintenance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bookingId: currentBooking.bookingId,
          maintenanceReason: maintenanceReason
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Có lỗi xảy ra khi hủy booking');
      }

      const data = await response.json();
      
      if (data.success) {
        setResult({
          bookingId: data.data.bookingId,
          cancelled: data.data.cancelled,
          refundAmount: data.data.refundAmount || 0,
          emailSent: data.data.emailSent || false,
          maintenanceReason: maintenanceReason
        });
        setShowSuccessDialog(true);
        
        toast.success('Booking đã được hủy để bảo trì', {
          description: `Hoàn tiền: ${(data.data.refundAmount || 0).toLocaleString('vi-VN')}đ`
        });
      } else {
        throw new Error(data.message || 'Không thể hủy booking');
      }
    } catch (error) {
      console.error('Error cancelling booking for maintenance:', error);
      toast.error('Lỗi hủy booking', {
        description: error instanceof Error ? error.message : 'Có lỗi không xác định xảy ra'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const cancelMaintenanceCancellation = () => {
    setShowConfirmDialog(false);
    setCurrentBooking(null);
    setMaintenanceReason('');
  };

  const closeSuccessDialog = () => {
    setShowSuccessDialog(false);
    setResult(null);
    setCurrentBooking(null);
    setMaintenanceReason('');
  };

  return {
    isLoading,
    showConfirmDialog,
    showSuccessDialog,
    currentBooking,
    maintenanceReason,
    result,
    initiateMaintenanceCancellation,
    confirmMaintenanceCancellation,
    cancelMaintenanceCancellation,
    closeSuccessDialog,
    setMaintenanceReason
  };
};

export default useMaintenanceCancellation;
