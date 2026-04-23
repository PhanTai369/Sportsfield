import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

interface MaintenanceDialogData {
  timeSlot: string;
  fieldName: string;
  fieldId: string;
  customerInfo?: {
    name: string;
    email: string;
    phone: string;
  };
  estimatedRefundAmount?: number;
}

interface UseMaintenanceDialogReturn {
  // State
  dialogData: MaintenanceDialogData | null;
  isLoading: boolean;
  useEnhancedDialog: boolean;
  
  // Actions
  openDialog: (data: MaintenanceDialogData) => void;
  closeDialog: () => void;
  toggleDialogType: () => void;
  setLoading: (loading: boolean) => void;
  
  // Handlers
  handleConfirm: (reason: string, onConfirm: (reason: string) => Promise<void>) => Promise<void>;
  handleComplete: (success: boolean, message: string) => void;
}

export const useMaintenanceDialog = (): UseMaintenanceDialogReturn => {
  const [dialogData, setDialogData] = useState<MaintenanceDialogData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [useEnhancedDialog, setUseEnhancedDialog] = useState(true);

  const openDialog = useCallback((data: MaintenanceDialogData) => {
    setDialogData(data);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogData(null);
    setIsLoading(false);
  }, []);

  const toggleDialogType = useCallback(() => {
    setUseEnhancedDialog(prev => !prev);
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const handleConfirm = useCallback(async (
    reason: string, 
    onConfirm: (reason: string) => Promise<void>
  ) => {
    try {
      setIsLoading(true);
      await onConfirm(reason);
    } catch (error) {
      console.error("❌ Error in maintenance confirmation:", error);
      toast.error("Có lỗi xảy ra khi xử lý yêu cầu bảo trì");
      throw error; // Re-throw to trigger error state in enhanced dialog
    } finally {
      setIsLoading(false);
      closeDialog();
    }
  }, [closeDialog]);

  const handleComplete = useCallback((success: boolean, message: string) => {
    if (success) {
      toast.success(message);
    } else {
      toast.error(message);
    }
  }, []);

  return {
    dialogData,
    isLoading,
    useEnhancedDialog,
    openDialog,
    closeDialog,
    toggleDialogType,
    setLoading,
    handleConfirm,
    handleComplete,
  };
};
