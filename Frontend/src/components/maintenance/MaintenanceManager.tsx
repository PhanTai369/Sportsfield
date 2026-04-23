import React from 'react';
import MaintenanceConfirmDialog from '../dialogs/MaintenanceConfirmDialog';
import MaintenanceSuccessDialog from '../dialogs/MaintenanceSuccessDialog';
import useMaintenanceCancellation from '../../hooks/useMaintenanceCancellation';

interface MaintenanceManagerProps {
  children?: (props: {
    initiateMaintenanceCancellation: (booking: {
      bookingId: string;
      fieldName?: string;
      customerName?: string;
      date?: string;
      time?: string;
      totalPrice?: number;
    }, reason?: string) => void;
    isLoading: boolean;
  }) => React.ReactNode;
  
  // Direct props for simple usage
  timeSlot?: string;
  fieldName?: string;
  hasBooking?: boolean;
  customerInfo?: {
    name: string;
    email: string;
    phone: string;
  };
  onConfirm?: (reason: string) => Promise<void>;
  onCancel?: () => void;
}

const MaintenanceManager: React.FC<MaintenanceManagerProps> = ({ children }) => {
  const {
    isLoading,
    showConfirmDialog,
    showSuccessDialog,
    currentBooking,
    maintenanceReason,
    result,
    initiateMaintenanceCancellation,
    confirmMaintenanceCancellation,
    cancelMaintenanceCancellation,
    closeSuccessDialog
  } = useMaintenanceCancellation();

  return (
    <>
      {children({ initiateMaintenanceCancellation, isLoading })}
      
      <MaintenanceConfirmDialog
        isOpen={showConfirmDialog}
        onConfirm={confirmMaintenanceCancellation}
        onCancel={cancelMaintenanceCancellation}
        bookingInfo={currentBooking ? {
          fieldName: currentBooking.fieldName,
          customerName: currentBooking.customerName,
          date: currentBooking.date,
          time: currentBooking.time,
          totalPrice: currentBooking.totalPrice
        } : undefined}
        maintenanceReason={maintenanceReason}
      />
      
      <MaintenanceSuccessDialog
        isOpen={showSuccessDialog}
        onClose={closeSuccessDialog}
        result={result ? {
          bookingId: result.bookingId,
          refundAmount: result.refundAmount,
          emailSent: result.emailSent,
          customerName: currentBooking?.customerName,
          fieldName: currentBooking?.fieldName,
          maintenanceReason: result.maintenanceReason
        } : undefined}
      />
    </>
  );
};

export default MaintenanceManager;
