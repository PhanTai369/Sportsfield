import React, { useState, useEffect } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { chatService } from '../../services/chatService';
import { useAuth } from '../../contexts/authContext';

interface UnreadBadgeProps {
  className?: string;
}

const UnreadBadge: React.FC<UnreadBadgeProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);

  // Get unread count
  const fetchUnreadCount = async () => {
    try {
      const { unreadCount: count } = await chatService.getUnreadMessagesCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Update unread count on socket events
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: any) => {
      if (message.senderId !== user?.id) {
        setUnreadCount(prev => prev + 1);
      }
    };

    const handleMessagesRead = () => {
      fetchUnreadCount();
    };

    socket.on('new_message', handleNewMessage);
    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('messages_read', handleMessagesRead);
    };
  }, [socket, user?.id]);

  // Fetch initial unread count
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
    }
  }, [user]);

  if (!user || unreadCount === 0) {
    return null;
  }

  return (
    <span className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full ${className}`}>
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  );
};

export default UnreadBadge;
