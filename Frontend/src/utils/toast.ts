import { toast } from 'sonner';

export const showToast = {
  success: (title: string, description?: string) => {
    toast.success(title, {
      description,
      duration: 3000,
      position: 'top-right'
    });
  },

  error: (title: string, description?: string) => {
    toast.error(title, {
      description,
      duration: 5000,
      position: 'top-right'
    });
  },

  loading: (title: string, description?: string) => {
    return toast.loading(title, {
      description,
      position: 'top-right'
    });
  },

  warning: (title: string, description?: string) => {
    toast.warning(title, {
      description,
      duration: 4000,
      position: 'top-right'
    });
  },

  info: (title: string, description?: string) => {
    toast.info(title, {
      description,
      duration: 3000,
      position: 'top-right'
    });
  },

  // Các thông báo cụ thể cho từng hành động
  auth: {
    sessionExpired: () => {
      toast.error('Phiên đăng nhập đã hết hạn', {
        description: 'Vui lòng đăng nhập lại để tiếp tục',
        duration: 5000
      });
    },
    
    invalidSession: () => {
      toast.error('Phiên đăng nhập không hợp lệ', {
        description: 'Vui lòng đăng nhập lại để tiếp tục',
        duration: 5000
      });
    }
  },

  profile: {
    updateSuccess: () => {
      toast.success('Cập nhật thông tin thành công', {
        description: 'Thông tin cá nhân của bạn đã được lưu thành công',
        duration: 3000
      });
    },

    updateError: () => {
      toast.error('Không thể cập nhật thông tin', {
        description: 'Đã có lỗi xảy ra trong quá trình xử lý, vui lòng thử lại sau',
        duration: 5000
      });
    },

    fetchError: () => {
      toast.error('Không thể tải thông tin người dùng', {
        description: 'Đã có lỗi xảy ra khi tải thông tin, vui lòng thử lại sau',
        duration: 5000
      });
    },

    imageUploadSuccess: () => {
      toast.success('Cập nhật ảnh đại diện thành công', {
        description: 'Ảnh đại diện mới của bạn đã được cập nhật và hiển thị',
        duration: 3000
      });
    },

    imageUploadError: (message?: string) => {
      toast.error('Không thể tải lên ảnh', {
        description: message || 'Đã có lỗi xảy ra trong quá trình tải ảnh lên',
        duration: 5000
      });
    },

    imageDeleteSuccess: () => {
      toast.success('Xóa ảnh đại diện thành công', {
        description: 'Ảnh đại diện của bạn đã được xóa',
        duration: 3000
      });
    },

    imageDeleteError: () => {
      toast.error('Không thể xóa ảnh', {
        description: 'Đã có lỗi xảy ra trong quá trình xóa ảnh, vui lòng thử lại sau',
        duration: 5000
      });
    }
  },

  password: {
    changeSuccess: () => {
      toast.success('Đổi mật khẩu thành công', {
        description: 'Mật khẩu mới của bạn đã được cập nhật',
        duration: 3000
      });
    },

    changeError: (message?: string) => {
      toast.error('Không thể đổi mật khẩu', {
        description: message || 'Đã có lỗi xảy ra, vui lòng thử lại sau',
        duration: 5000
      });
    },

    incorrectPassword: () => {
      toast.error('Mật khẩu hiện tại không chính xác', {
        description: 'Vui lòng kiểm tra và nhập lại mật khẩu hiện tại',
        duration: 5000
      });
    }
  },

  booking: {
    createSuccess: () => {
      toast.success('Đặt sân thành công!', {
        description: 'Đang chuyển đến trang thanh toán...',
        duration: 3000
      });
    },

    createError: (message?: string) => {
      toast.error('Không thể đặt sân', {
        description: message || 'Đã có lỗi xảy ra trong quá trình đặt sân, vui lòng thử lại sau',
        duration: 5000
      });
    },

    conflictError: () => {
      toast.error('Khung giờ đã được đặt', {
        description: 'Khung giờ bạn chọn đã được đặt bởi người khác. Vui lòng chọn khung giờ khác.',
        duration: 5000
      });
    },

    inProgressError: () => {
      toast.error('Đang xử lý giao dịch', {
        description: 'Đã có một giao dịch đang được xử lý cho khung giờ này. Vui lòng thử lại sau.',
        duration: 5000
      });
    }
  }
}; 