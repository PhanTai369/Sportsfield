import React from 'react';
import MaintenanceBookingConfirmDialog from '../dialogs/MaintenanceBookingConfirmDialog';
import EnhancedMaintenanceConfirmDialog from '../dialogs/EnhancedMaintenanceConfirmDialog';

interface MaintenanceDialogManagerProps {
  // Dialog data
  dialogData: {
    timeSlot: string;
    fieldName: string;
    fieldId: string;
    customerInfo?: {
      name: string;
      email: string;
      phone: string;
    };
    estimatedRefundAmount?: number;
  } | null;
  
  // Dialog settings
  useEnhancedDialog: boolean;
  isLoading: boolean;
  
  // Event handlers
  onConfirm: (reason: string) => Promise<void>;
  onCancel: () => void;
  onComplete?: (success: boolean, message: string) => void;
}

const MaintenanceDialogManager: React.FC<MaintenanceDialogManagerProps> = ({
  dialogData,
  useEnhancedDialog,
  isLoading,
  onConfirm,
  onCancel,
  onComplete
}) => {
  if (!dialogData) return null;

  const commonProps = {
    isOpen: true,
    timeSlot: dialogData.timeSlot,
    fieldName: dialogData.fieldName,
    customerInfo: dialogData.customerInfo,
    onConfirm,
    onCancel,
    isLoading,
  };

  return (
    <>
      {useEnhancedDialog ? (
        <EnhancedMaintenanceConfirmDialog
          {...commonProps}
          showRefundAmount={true}
          estimatedRefundAmount={dialogData.estimatedRefundAmount || 0}
          onComplete={onComplete}
        />
      ) : (
        <MaintenanceBookingConfirmDialog
          {...commonProps}
          onComplete={onComplete}
        />
      )}
    </>
  );
};

export default MaintenanceDialogManager;
