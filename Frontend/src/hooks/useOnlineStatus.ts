import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';

interface OnlineUser {
  userId: string;
  isOnline: boolean;
  lastSeen?: string;
}

export const useOnlineStatus = () => {
  const { on, off } = useSocket();
  const [onlineUsers, setOnlineUsers] = useState<Map<string, OnlineUser>>(new Map());

  // Handle user status change events
  useEffect(() => {
    const handleUserStatusChange = (data: { userId: string; status: 'online' | 'offline'; lastSeen?: string }) => {
      console.log('useOnlineStatus: user_status_change', data);
      setOnlineUsers(prev => {
        const newMap = new Map(prev);
        newMap.set(data.userId, {
          userId: data.userId,
          isOnline: data.status === 'online',
          lastSeen: data.status === 'offline' ? data.lastSeen : undefined
        });
        return newMap;
      });
    };

    const handleUserOnlineStatus = (data: { userId: string; isOnline: boolean; timestamp: string }) => {
      console.log('useOnlineStatus: user_online_status', data);
      setOnlineUsers(prev => {
        const newMap = new Map(prev);
        newMap.set(data.userId, {
          userId: data.userId,
          isOnline: data.isOnline,
          lastSeen: !data.isOnline ? data.timestamp : undefined
        });
        return newMap;
      });
    };

    on('user_status_change', handleUserStatusChange);
    on('user_online_status', handleUserOnlineStatus);

    return () => {
      off('user_status_change', handleUserStatusChange);
      off('user_online_status', handleUserOnlineStatus);
    };
  }, [on, off]);

  // Get online status for a specific user
  const getUserOnlineStatus = useCallback((userId: string): boolean => {
    const user = onlineUsers.get(userId);
    return user?.isOnline || false;
  }, [onlineUsers]);

  // Get last seen for a specific user
  const getUserLastSeen = useCallback((userId: string): string | undefined => {
    const user = onlineUsers.get(userId);
    return user?.lastSeen;
  }, [onlineUsers]);

  // Set initial status for a user
  const setUserStatus = useCallback((userId: string, isOnline: boolean, lastSeen?: string) => {
    setOnlineUsers(prev => {
      const newMap = new Map(prev);
      newMap.set(userId, {
        userId,
        isOnline,
        lastSeen: !isOnline ? lastSeen : undefined
      });
      return newMap;
    });
  }, []);

  return {
    getUserOnlineStatus,
    getUserLastSeen,
    setUserStatus,
    onlineUsers: Array.from(onlineUsers.values())
  };
};

export default useOnlineStatus;
