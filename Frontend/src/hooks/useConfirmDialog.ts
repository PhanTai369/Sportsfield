import { useState } from 'react';

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  type: 'warning' | 'danger' | 'info';
  onConfirm: () => void;
  isLoading: boolean;
}

interface ConfirmDialogOptions {
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
}

export const useConfirmDialog = () => {
  const [dialog, setDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Xác nhận',
    cancelText: 'Hủy',
    type: 'warning',
    onConfirm: () => {},
    isLoading: false
  });

  const showDialog = (
    title: string,
    message: string,
    onConfirm: () => void,
    options: ConfirmDialogOptions = {}
  ) => {
    setDialog({
      isOpen: true,
      title,
      message,
      confirmText: options.confirmText || 'Xác nhận',
      cancelText: options.cancelText || 'Hủy',
      type: options.type || 'warning',
      onConfirm,
      isLoading: false
    });
  };

  const closeDialog = () => {
    setDialog(prev => ({ ...prev, isOpen: false, isLoading: false }));
  };

  const handleConfirm = async () => {
    setDialog(prev => ({ ...prev, isLoading: true }));
    
    try {
      await dialog.onConfirm();
      // Dialog will be closed by the onConfirm function when it completes
    } catch (error) {
      console.error('Error in confirm dialog:', error);
      setDialog(prev => ({ ...prev, isLoading: false }));
    }
  };

  const setLoading = (loading: boolean) => {
    setDialog(prev => ({ ...prev, isLoading: loading }));
  };

  return {
    dialog,
    showDialog,
    closeDialog,
    handleConfirm,
    setLoading
  };
};

export default useConfirmDialog;
