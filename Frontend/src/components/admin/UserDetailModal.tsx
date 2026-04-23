import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'owner' | 'admin';
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  profileImage?: string;
  address?: string;
  gender?: string;
  dateOfBirth?: string;
  bio?: string;
}

interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  onStatusChange: (userId: string, isActive: boolean) => Promise<void>;
}

export default function UserDetailModal({
  isOpen,
  onClose,
  userId,
  onStatusChange
}: UserDetailModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDetails();
    }
  }, [isOpen, userId]);

  const fetchUserDetails = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setUser(response.data.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi tải thông tin người dùng');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!user) return;
    await onStatusChange(user.id, !user.is_active);
    fetchUserDetails(); // Refresh user details after status change
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleName = (role: string) => {
    switch(role) {
      case 'customer': return 'Người dùng';
      case 'owner': return 'Chủ sân';
      case 'admin': return 'Quản trị viên';
      default: return role;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Chi tiết người dùng</DialogTitle>
          <DialogDescription>
            Xem thông tin chi tiết và quản lý trạng thái người dùng
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : user ? (
          <div className="grid gap-6">
            {/* Thông tin cơ bản */}
            <div className="flex items-start gap-4">
              <img
                src={user.profileImage || "/default-avatar.png"}
                alt={user.name}
                className="w-20 h-20 rounded-full object-cover"
              />
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{user.name}</h3>
                <p className="text-sm text-gray-500">{user.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    user.role === 'customer' ? 'bg-blue-100 text-blue-800' :
                    user.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {getRoleName(user.role)}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    user.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {user.is_verified ? 'Đã xác thực' : 'Chưa xác thực'}
                  </span>
                </div>
              </div>
            </div>

            {/* Thông tin chi tiết */}
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Số điện thoại</p>
                  <p>{user.phone || 'Chưa cập nhật'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Địa chỉ</p>
                  <p>{user.address || 'Chưa cập nhật'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Giới tính</p>
                  <p>{user.gender || 'Chưa cập nhật'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Ngày sinh</p>
                  <p>{user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500">Giới thiệu</p>
                <p className="text-sm">{user.bio || 'Chưa cập nhật'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Ngày tham gia</p>
                  <p>{formatDate(user.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Cập nhật lần cuối</p>
                  <p>{formatDate(user.updated_at)}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>
                Đóng
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Không tìm thấy thông tin người dùng
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
