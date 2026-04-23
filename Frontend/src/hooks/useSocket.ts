import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../contexts/authContext';
import { subscriptionManager } from '../utils/subscriptionManager';

interface SocketEvents {
  // Chat events
  'new_message': (message: any) => void;
  'message_deleted': (data: { messageId: string; chatId: string }) => void;
  'new_chat': (chat: any) => void;
  'messages_read': (data: any) => void;
  'user_typing': (data: { userId: string; userName: string; chatId: string }) => void;
  'user_stop_typing': (data: { userId: string; chatId: string }) => void;
  'user_status_change': (data: { userId: string; status: 'online' | 'offline' }) => void;
  'user_online_status': (data: { userId: string; isOnline: boolean; timestamp: string }) => void;
  'chat_history': (data: { chatId: string; messages: any[] }) => void;
  
  // Booking events
  'booking_status_update': (data: { 
    bookingId: string; 
    status: string; 
    paymentStatus: string; 
    previousStatus?: string;
    previousPaymentStatus?: string;
    syncTriggeredBy?: string;
    timestamp: string;
  }) => void;
  'booking_payment_update': (data: { 
    bookingId: string; 
    paymentStatus: string; 
    amount?: number;
    paymentMethod?: string;
    timestamp: string;
  }) => void;
  'booking_event': (data: { 
    eventType: string; 
    bookingId: string; 
    timestamp: string;
    [key: string]: any;
  }) => void;
  'booking_subscription_success': (data: { 
    bookingId: string; 
    status: string; 
    paymentStatus: string; 
  }) => void;
  'booking_unsubscription_success': (data: { bookingId: string }) => void;
  'booking_sync_complete': (data: { 
    bookingId: string; 
    success: boolean; 
    booking?: any; 
    timestamp: string;
  }) => void;
  
  // General events
  'user_notification': (data: any) => void;
  'error': (error: any) => void;
}

export const useSocket = () => {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      // Disconnect if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Get token from localStorage or sessionStorage
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      console.log('No token found for socket connection - user not logged in');
      return;
    }

    // Initialize socket connection with better error handling
    const socket = io(import.meta.env.VITE_BACKEND_URL || 'https://football-field-booking-backend.onrender.com', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id, 'for user:', user.id);
      setIsConnected(true);
      setError(null);
      
      // Set socket in subscription manager
      subscriptionManager.setSocket(socket);
      
      // Emit user online status
      socket.emit('user_online');
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setError(err.message);
      setIsConnected(false);
    });

    // Handle general socket errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
      setError(error.message || 'Socket error occurred');
    });

    return () => {
      if (socket) {
        // Clear subscription manager
        subscriptionManager.clear();
        
        // Emit user offline before disconnecting
        socket.emit('user_offline');
        socket.disconnect();
      }
    };
  }, [user]);

  // Handle window unload to set user offline
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (socketRef.current) {
        socketRef.current.emit('user_offline');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Chat utility functions
  const joinChat = useCallback((chatId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join_chat', { chatId });
    }
  }, []);

  const leaveChat = useCallback((chatId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('leave_chat', { chatId });
    }
  }, []);

  const startTyping = useCallback((chatId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('typing_start', { chatId });
    }
  }, []);

  const stopTyping = useCallback((chatId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('typing_stop', { chatId });
    }
  }, []);

  const markMessagesAsRead = useCallback((chatId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('mark_messages_read', { chatId });
    }
  }, []);

  const loadMoreMessages = useCallback((chatId: string, page: number, beforeMessageId?: string) => {
    if (socketRef.current) {
      socketRef.current.emit('load_more_messages', { chatId, page, beforeMessageId });
    }
  }, []);

  const sendMessage = useCallback((chatId: string, content: string) => {
    if (socketRef.current) {
      socketRef.current.emit('send_message', { chatId, content });
    }
  }, []);

  const updateOnlineStatus = useCallback((isOnline: boolean) => {
    if (socketRef.current) {
      socketRef.current.emit('update_online_status', { isOnline });
    }
  }, []);

  const getUserOnlineStatus = useCallback((userId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('get_user_online_status', { userId });
    }
  }, []);

  // Booking utility functions
  const subscribeToBooking = useCallback((bookingId: string) => {
    if (socketRef.current && bookingId) {
      const wasNewSubscription = subscriptionManager.subscribe(bookingId);
      console.log(`[useSocket] subscribeToBooking ${bookingId}, new: ${wasNewSubscription}`);
    }
  }, []);

  const unsubscribeFromBooking = useCallback((bookingId: string) => {
    if (socketRef.current && bookingId) {
      const didUnsubscribe = subscriptionManager.unsubscribe(bookingId);
      console.log(`[useSocket] unsubscribeFromBooking ${bookingId}, unsubscribed: ${didUnsubscribe}`);
    }
  }, []);

  const syncBookingStatus = useCallback((bookingId: string) => {
    if (socketRef.current && bookingId) {
      socketRef.current.emit('sync_booking_status', { bookingId });
    }
  }, []);

  // Event listeners
  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  }, []);

  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    if (socketRef.current) {
      if (callback) {
        socketRef.current.off(event, callback);
      } else {
        socketRef.current.off(event);
      }
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    error,
    // Chat functions
    joinChat,
    leaveChat,
    startTyping,
    stopTyping,
    markMessagesAsRead,
    loadMoreMessages,
    sendMessage,
    updateOnlineStatus,
    getUserOnlineStatus,
    // Booking functions
    subscribeToBooking,
    unsubscribeFromBooking,
    syncBookingStatus,
    // Event listeners
    on,
    off
  };
};
