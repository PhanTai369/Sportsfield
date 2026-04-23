import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/authContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getNotifications, markNotificationAsRead } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';

const OwnerHeader: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const socket = useSocket();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  // Fetch notifications for owner
  useEffect(() => {
    if (user?.id) {
      getNotifications()
        .then((data) => {
          let notiArr: any[] = [];
          if (Array.isArray(data)) {
            notiArr = data;
          } else if (data && Array.isArray(data.data)) {
            notiArr = data.data;
          } else if (data && Array.isArray(data.notifications)) {
            notiArr = data.notifications;
          } else if (data && typeof data === 'object') {
            notiArr = Object.values(data).filter((v) => typeof v === 'object' && (v as { id?: unknown }).id);
          }
          notiArr = notiArr.map((n) => ({
            ...n,
            is_read: n.is_read !== undefined ? n.is_read : (n.read !== undefined ? n.read : false)
          }));
          setNotifications(notiArr);
          setUnreadCount(notiArr.filter((n: any) => !n.is_read).length);
        })
        .catch(() => {
          setNotifications([]);
          setUnreadCount(0);
        });
    }
  }, [user?.id]);

  // Listen for new notifications via socket
  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = (notification: any) => {
      setNotifications(prev => {
        const noti = {
          ...notification,
          is_read: notification.is_read !== undefined ? notification.is_read : (notification.read !== undefined ? notification.read : false)
        };
        let newList;
        const exists = prev.find(n => n.id === noti.id);
        if (exists) {
          newList = prev.map(n => n.id === noti.id ? noti : n);
        } else {
          newList = [noti, ...prev];
        }
        setUnreadCount(newList.filter((n: any) => !n.is_read && !n.read).length);
        return newList;
      });
    };
    socket.on('new_notification', handleNewNotification);
    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [socket]);

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read && !notification.is_read) {
      await markNotificationAsRead(notification.id);
      setNotifications((prev) => {
        const newList = prev.map((n) =>
          n.id === notification.id ? { ...n, read: true, is_read: true } : n
        );
        setUnreadCount(newList.filter((n: any) => !n.is_read && !n.read).length);
        return newList;
      });
    }
    if (notification.title === 'Tin nhắn mới') {
      // Extract chatId from notification message
      const chatIdMatch = notification.message.match(/chat:([a-f0-9\-]{36})/);
      const chatId = chatIdMatch ? chatIdMatch[1] : null;
      
      if (chatId) {
        navigate('/owner/chat', { state: { selectedChatId: chatId } });
      } else {
        navigate('/owner/chat');
      }
    } else if (
      notification.title === 'Đặt sân thành công' ||
      notification.title === 'Có người đặt sân' ||
      notification.title === 'Khách đã thanh toán đặt sân'
    ) {
      navigate('/owner/bookings');
    }
    setIsNotificationDropdownOpen(false);
  };

  return (
    <header className="bg-white border-b border-gray-200 flex justify-between items-center p-4">
      <div>
        <h1 className="text-xl font-semibold text-green-600">Quản lý sân bóng</h1>
        <p className="text-sm text-gray-500">Quản lý tất cả các sân bóng của bạn.</p>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Notification Bell */}
        <div className="relative">
          <button
            className="relative text-gray-700 hover:bg-gray-100 p-2 rounded-full"
            onClick={() => {
              setIsNotificationDropdownOpen((open) => !open);
              setIsUserDropdownOpen(false); // Close user dropdown
            }}
          >
            <i className="fas fa-bell"></i>
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
          {isNotificationDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
              <div className="p-2 font-semibold border-b">Thông báo</div>
              {notifications.length === 0 && (
                <div className="p-4 text-gray-500 text-center">Không có thông báo</div>
              )}
              {notifications.map((n: any, idx: number) => {
                const handleClick = () => handleNotificationClick(n);
                const isRead = n.is_read || n.read;
                return (
                  <button
                    type="button"
                    key={n.id || idx}
                    className={`w-full text-left flex items-start gap-2 px-4 py-3 cursor-pointer hover:bg-gray-100 border-0 outline-none transition-colors duration-150 group ${!isRead ? 'bg-green-50' : 'bg-gray-50'}`}
                    onClick={handleClick}
                    tabIndex={0}
                  >
                    <i className={`fas fa-info-circle mt-1 text-lg ${!isRead ? 'text-green-600' : 'text-gray-400'}`}></i>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{n.title}</div>
                      <div className="text-xs text-gray-600 group-hover:text-gray-800">{n.message && n.message.replace(/\s*\([^)]*\)\s*$/, '').trim()}</div>
                      <div className="text-xs text-gray-400 mt-1">{n.created_at ? new Date(n.created_at).toLocaleString('vi-VN') : ''}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {/* Avatar Dropdown */}
        <DropdownMenu open={isUserDropdownOpen} onOpenChange={(open) => {
          setIsUserDropdownOpen(open);
          if (open) setIsNotificationDropdownOpen(false); // Close notification dropdown
        }}>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarImage src={user?.profileImage} />
              <AvatarFallback>{user?.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => navigate('/owner/profile')}>
              <i className="fas fa-user mr-2"></i>
              Tài khoản
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              <i className="fas fa-sign-out-alt mr-2"></i>
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default OwnerHeader;