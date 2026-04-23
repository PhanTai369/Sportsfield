"use client"
import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronRight, Search, Bell, Download, Filter, MoreVertical, AlertCircle } from "lucide-react";
import UserDetailModal from "./UserDetailModal";

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
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

const ROLES = [
  { value: '', label: 'Tất cả vai trò' },
  { value: 'customer', label: 'Người dùng' },
  { value: 'owner', label: 'Chủ sân' },
  
];

const getRoleName = (role: string) => {
  switch(role) {
    case 'customer': return 'Người dùng';
    case 'owner': return 'Chủ sân';
    
    default: return role;
  }
};

const getRoleStyle = (role: string) => {
  switch(role) {
    case 'customer':
      return 'bg-blue-100 text-blue-800';
    case 'owner':
      return 'bg-purple-100 text-purple-800';
    case 'admin':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function CustomerList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });
  const [allUsers, setAllUsers] = useState<User[]>([]); // Store all users for client-side filtering
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [userToUpdate, setUserToUpdate] = useState<{id: string, newStatus: boolean} | null>(null);

  const fetchUsers = async (page: number = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page,
          limit: pagination.itemsPerPage
        }
      });

      if (response.data.success) {
        const fetchedUsers = response.data.data.users || [];
        setAllUsers(fetchedUsers); // Store all users
        setUsers(fetchedUsers); // Initially set the same users
        setPagination({
          currentPage: response.data.data.pagination.currentPage || 1,
          totalPages: response.data.data.pagination.totalPages || 1,
          totalItems: response.data.data.pagination.totalItems || 0,
          itemsPerPage: response.data.data.pagination.itemsPerPage || 10
        });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi tải danh sách người dùng');
      setUsers([]);
      setAllUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter users client-side
  const filterUsers = () => {
    let filteredUsers = [...allUsers];
    
    // Filter by role if selected
    if (selectedRole) {
      filteredUsers = filteredUsers.filter(user => user.role === selectedRole);
    }
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filteredUsers = filteredUsers.filter(user => {
        const nameMatch = user.name.toLowerCase().includes(searchLower);
        const emailMatch = user.email.toLowerCase().includes(searchLower);
        const phoneMatch = user.phone?.toLowerCase().includes(searchLower);
        return nameMatch || emailMatch || phoneMatch;
      });
    }

    return filteredUsers;
  };

  // Update displayed users whenever search term or role changes
  useEffect(() => {
    const filteredUsers = filterUsers();
    setUsers(filteredUsers);
    // Update pagination for filtered results
    setPagination(prev => ({
      ...prev,
      totalItems: filteredUsers.length,
      totalPages: Math.ceil(filteredUsers.length / prev.itemsPerPage),
      currentPage: 1 // Reset to first page when filters change
    }));
  }, [searchTerm, selectedRole, allUsers]);

  // Initial fetch
  useEffect(() => {
    fetchUsers();
  }, []);

  const getCurrentPageUsers = () => {
    const start = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const end = start + pagination.itemsPerPage;
    return users.slice(start, end);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    }
  };

  // Update handlePageChange to work with client-side pagination
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({
      ...prev,
      currentPage: newPage
    }));
  };

  const openConfirmModal = (userId: string, newStatus: boolean) => {
    setUserToUpdate({ id: userId, newStatus });
    setConfirmModal(true);
  };

  const handleStatusChange = async (userId: string, isActive: boolean) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/admin/users/${userId}/status`,
        { is_active: isActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Cập nhật trạng thái thành công');
      // Refresh the data including both the list and any open modal
      await fetchUsers();
      // If the modal is open with this user, refresh the modal content
      if (showUserDetail && selectedUserId === userId) {
        setShowUserDetail(false); // Close and reopen to force refresh
        setTimeout(() => {
          setShowUserDetail(true);
        }, 100);
      }
      // Reset user to update and close modal
      setUserToUpdate(null);
      setConfirmModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật trạng thái');
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleRoleChange = (value: string) => {
    setSelectedRole(value);
  };

  const handleViewDetail = (userId: string) => {
    setSelectedUserId(userId);
    setShowUserDetail(true);
  };

  const handleExportData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/admin/users/export/excel`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          responseType: 'blob' // Quan trọng để nhận file
        }
      );

      // Tạo URL cho blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      
      // Tạo thẻ a ẩn để download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `danh-sach-nguoi-dung-${new Date().toISOString().split('T')[0]}.xlsx`);
      
      // Thêm vào DOM và click
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Xuất dữ liệu thành công');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi xuất dữ liệu');
    }
  };

  const handleBulkStatusChange = async (newStatus: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const adminUsers = selectedUsers.filter(userId => {
        const user = allUsers.find(u => u.id === userId);
        return user?.role !== 'admin';
      });

      if (adminUsers.length === 0) {
        toast.error('Không thể thay đổi trạng thái của admin');
        setConfirmModal(false);
        setUserToUpdate(null);
        return;
      }

      // Thực hiện tuần tự để đảm bảo tất cả đều được xử lý
      for (const userId of adminUsers) {
        await axios.put(
          `${API_BASE_URL}/admin/users/${userId}/status`,
          { is_active: newStatus },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      toast.success(`Đã ${newStatus ? 'kích hoạt' : 'khóa'} ${adminUsers.length} tài khoản`);
      // Refresh data
      await fetchUsers();
      // Reset selection and close modal
      setSelectedUsers([]);
      setConfirmModal(false);
      setUserToUpdate(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật trạng thái');
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h2>          <Button variant="outline" onClick={handleExportData}>
            <Download className="w-4 h-4 mr-2" />
            Xuất dữ liệu
          </Button>
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-4 items-center flex-1">
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Tìm theo tên, email, số điện thoại..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  {ROLES.find(role => role.value === selectedRole)?.label || 'Tất cả vai trò'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuRadioGroup value={selectedRole} onValueChange={handleRoleChange}>
                  {ROLES.map(role => (
                    <DropdownMenuRadioItem key={role.value} value={role.value}>
                      {role.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {selectedUsers.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" className="ml-4">
                  Thao tác ({selectedUsers.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => {
                  // Mở modal xác nhận với trạng thái mở khóa cho nhiều tài khoản
                  setUserToUpdate({ id: 'bulk', newStatus: true });
                  setConfirmModal(true);
                }}>
                  Kích hoạt đã chọn
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  // Mở modal xác nhận với trạng thái khóa cho nhiều tài khoản
                  setUserToUpdate({ id: 'bulk', newStatus: false });
                  setConfirmModal(true);
                }}>
                  Khóa đã chọn
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === users.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                </TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Số điện thoại</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tham gia</TableHead>
                <TableHead>Hoạt động cuối</TableHead>
                <TableHead className="w-20">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : getCurrentPageUsers().length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10">
                    Không tìm thấy người dùng nào
                  </TableCell>
                </TableRow>
              ) : (
                getCurrentPageUsers().map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                        className="rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <img
                          src={user.profileImage || "/default-avatar.png"}
                          alt={user.name}
                          className="w-8 h-8 rounded-full mr-3"
                        />
                        {user.name}
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone || "Chưa cập nhật"}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRoleStyle(user.role)}`}>
                        {getRoleName(user.role)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          "px-2 py-1 rounded-full text-xs font-semibold " +
                          (user.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800")
                        }
                      >
                        {user.is_active ? "Hoạt động" : "Bị khóa"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString("vi-VN")}
                    </TableCell>
                    <TableCell>
                      {new Date(user.updated_at).toLocaleDateString("vi-VN")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {user.role !== 'admin' && (
                            <DropdownMenuItem onClick={() => openConfirmModal(user.id, !user.is_active)}>
                              {user.is_active ? "Khóa tài khoản" : "Mở khóa"}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleViewDetail(user.id)}>Xem chi tiết</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Hiển thị {Math.min(users.length, pagination.itemsPerPage)} trong số {users.length} người dùng
            {selectedRole && ` (${ROLES.find(role => role.value === selectedRole)?.label})`}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={pagination.currentPage === 1}
              onClick={() => handlePageChange(pagination.currentPage - 1)}
            >
              Trước
            </Button>
            <Button
              variant="outline"
              disabled={pagination.currentPage === pagination.totalPages}
              onClick={() => handlePageChange(pagination.currentPage + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      </div>

      {showUserDetail && selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          isOpen={showUserDetail}
          onClose={() => setShowUserDetail(false)}
          onStatusChange={() => fetchUsers()}
        />
      )}

      {/* Modal xác nhận thay đổi trạng thái tài khoản */}
      <Dialog open={confirmModal} onOpenChange={setConfirmModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              {userToUpdate && userToUpdate.id === 'bulk' 
                ? (userToUpdate.newStatus ? "Xác nhận mở khóa nhiều tài khoản" : "Xác nhận khóa nhiều tài khoản")
                : (userToUpdate && allUsers.find(u => u.id === userToUpdate.id)?.is_active
                  ? "Xác nhận khóa tài khoản"
                  : "Xác nhận mở khóa tài khoản")}
            </DialogTitle>
            <DialogDescription>
              {userToUpdate && userToUpdate.id === 'bulk' 
                ? (userToUpdate.newStatus 
                  ? `Bạn có chắc chắn muốn mở khóa ${selectedUsers.length} tài khoản đã chọn? Những người dùng này sẽ có thể đăng nhập và sử dụng dịch vụ bình thường.`
                  : `Bạn có chắc chắn muốn khóa ${selectedUsers.length} tài khoản đã chọn? Những người dùng này sẽ không thể đăng nhập hoặc sử dụng dịch vụ cho đến khi được mở khóa.`)
                : (userToUpdate && allUsers.find(u => u.id === userToUpdate.id)?.is_active
                  ? "Bạn có chắc chắn muốn khóa tài khoản này? Người dùng sẽ không thể đăng nhập hoặc sử dụng dịch vụ cho đến khi được mở khóa."
                  : "Bạn có chắc chắn muốn mở khóa tài khoản này? Người dùng sẽ có thể đăng nhập và sử dụng dịch vụ bình thường.")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmModal(false);
                setUserToUpdate(null);
              }}
            >
              Hủy
            </Button>
            <Button
              variant={
                userToUpdate && userToUpdate.id === 'bulk'
                  ? (!userToUpdate.newStatus ? "destructive" : "default")
                  : (userToUpdate && allUsers.find(u => u.id === userToUpdate.id)?.is_active ? "destructive" : "default")
              }
              onClick={() => {
                if (userToUpdate) {
                  if (userToUpdate.id === 'bulk') {
                    handleBulkStatusChange(userToUpdate.newStatus);
                  } else {
                    handleStatusChange(userToUpdate.id, userToUpdate.newStatus);
                  }
                }
              }}
            >
              {userToUpdate && userToUpdate.id === 'bulk'
                ? (userToUpdate.newStatus ? "Mở khóa tài khoản" : "Khóa tài khoản")
                : (userToUpdate && allUsers.find(u => u.id === userToUpdate.id)?.is_active
                  ? "Khóa tài khoản"
                  : "Mở khóa tài khoản")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
