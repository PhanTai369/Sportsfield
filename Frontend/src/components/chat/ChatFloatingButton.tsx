import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Minus } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import { chatService } from '../../services/chatService';
import { useAuth } from '../../contexts/authContext';
import { useLocation } from 'react-router-dom';
import ChatInterface from './ChatInterface';

const ChatFloatingButton: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);

  // Get unread count
  const fetchUnreadCount = async () => {
    try {
      const { unreadCount: count } = await chatService.getUnreadMessagesCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatRef.current && !chatRef.current.contains(event.target as Node)) {
        if (isOpen && !isMinimized) {
          setIsMinimized(true);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isMinimized]);

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
  // Don't show if user is not logged in, is owner, or is in owner routes
  if (!user || user.role === 'owner' || location.pathname.startsWith('/owner')) {
    return null;
  }

  const toggleChat = () => {
    if (isOpen) {
      if (isMinimized) {
        setIsMinimized(false);
      } else {
        setIsOpen(false);
        setIsMinimized(false);
      }
    } else {
      setIsOpen(true);
      setIsMinimized(false);
    }
  };

  const closeChat = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const minimizeChat = () => {
    setIsMinimized(true);
  };

  return (
    <>
      {/* Floating Chat Window */}
      {isOpen && (
        <div 
          ref={chatRef}
          className={`fixed bottom-20 right-4 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 transition-all duration-300 ${
            isMinimized 
              ? 'w-80 h-12' 
              : 'w-96 h-[600px]'
          }`}
          style={{ maxHeight: 'calc(100vh - 100px)' }}
        >
          {/* Chat Header */}
          <div className="bg-green-500 text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5" />
              <span className="font-medium">Chat</span>
              {unreadCount > 0 && !isMinimized && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={minimizeChat}
                className="hover:bg-green-600 p-1 rounded"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                onClick={closeChat}
                className="hover:bg-green-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Content */}
          {!isMinimized && (
            <div className="h-[556px] flex flex-col">
              <ChatInterface className="h-full" />
            </div>
          )}
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={toggleChat}
        className="fixed bottom-4 right-4 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 z-40"
      >
        <div className="relative">
          <MessageCircle className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-5 h-5 flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </button>
    </>
  );
};

export default ChatFloatingButton;
