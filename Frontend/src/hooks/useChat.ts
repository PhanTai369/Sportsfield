import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import { chatService, Chat, Message } from '../services/chatService';
import { useAuth } from '../contexts/authContext';

export const useChat = () => {
  const { user } = useAuth();
  const { socket, on, off } = useSocket();
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  // Load user chats
  const loadChats = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const [chatsData, unreadData] = await Promise.all([
        chatService.getUserChats(),
        chatService.getUnreadMessagesCountByChat()
      ]);
      
      setChats(chatsData);
      setUnreadCounts(unreadData);
      
      // Calculate total unread count
      const total = Object.values(unreadData).reduce((sum, count) => sum + count, 0);
      setTotalUnreadCount(total);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Create or get chat
  const createOrGetChat = useCallback(async (otherUserId: string) => {
    try {
      const chat = await chatService.createOrGetChat(otherUserId);
      
      // Add chat to list if not exists
      setChats(prevChats => {
        const exists = prevChats.find(c => c.id === chat.id);
        if (!exists) {
          return [chat, ...prevChats];
        }
        return prevChats;
      });
      
      return chat;
    } catch (error) {
      console.error('Error creating or getting chat:', error);
      throw error;
    }
  }, []);

  // Send message
  const sendMessage = useCallback(async (chatId: string, content: string) => {
    try {
      const message = await chatService.sendMessage(chatId, content);
      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, []);

  // Mark messages as read
  const markMessagesAsRead = useCallback(async (chatId: string) => {
    try {
      await chatService.markMessagesAsRead(chatId);
      
      // Update unread counts
      setUnreadCounts(prev => {
        const newCounts = { ...prev };
        const previousCount = newCounts[chatId] || 0;
        newCounts[chatId] = 0;
        
        // Update total count
        setTotalUnreadCount(prevTotal => prevTotal - previousCount);
        
        return newCounts;
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, []);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !user) return;

    const handleNewMessage = (message: Message) => {
      // Update chat list
      setChats(prevChats => {
        const updatedChats = prevChats.map(chat => {
          if (chat.id === message.chatId) {
            return {
              ...chat,
              lastMessage: {
                id: message.id,
                content: message.content,
                senderId: message.senderId,
                senderName: message.sender?.name || '',
                createdAt: message.createdAt,
                isFromMe: message.senderId === user.id,
                isRead: message.isRead
              }
            };
          }
          return chat;
        });

        // Sort by latest message
        return updatedChats.sort((a, b) => {
          const aTime = a.lastMessage?.createdAt || a.createdAt;
          const bTime = b.lastMessage?.createdAt || b.createdAt;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });
      });

      // Update messages if it's for current chat
      if (message.chatId === currentChatId) {
        setMessages(prev => [...prev, message]);
      }

      // Update unread count if not from current user
      if (message.senderId !== user.id) {
        setUnreadCounts(prev => ({
          ...prev,
          [message.chatId]: (prev[message.chatId] || 0) + 1
        }));
        setTotalUnreadCount(prev => prev + 1);
      }
    };

    const handleNewChat = (newChat: Chat) => {
      setChats(prevChats => {
        const exists = prevChats.find(chat => chat.id === newChat.id);
        if (!exists) {
          return [newChat, ...prevChats];
        }
        return prevChats;
      });
    };

    const handleMessageDeleted = (data: { messageId: string; chatId: string }) => {
      if (data.chatId === currentChatId) {
        setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
      }
    };    const handleMessagesRead = (data: { chatId: string; readData: { userId: string; readAt: string } }) => {
      if (data.readData.userId === user.id) {
        setUnreadCounts(prev => {
          const newCounts = { ...prev };
          const previousCount = newCounts[data.chatId] || 0;
          newCounts[data.chatId] = 0;
          
          setTotalUnreadCount(prevTotal => prevTotal - previousCount);
          
          return newCounts;
        });
      }
    };

    // Register event listeners
    on('new_message', handleNewMessage);
    on('new_chat', handleNewChat);
    on('message_deleted', handleMessageDeleted);
    on('messages_read', handleMessagesRead);

    return () => {
      // Cleanup event listeners
      off('new_message', handleNewMessage);
      off('new_chat', handleNewChat);
      off('message_deleted', handleMessageDeleted);
      off('messages_read', handleMessagesRead);
    };
  }, [socket, user, currentChatId, on, off]);

  // Load chats on mount
  useEffect(() => {
    loadChats();
  }, [loadChats]);

  return {
    chats,
    currentChatId,
    setCurrentChatId,
    messages,
    setMessages,
    loading,
    unreadCounts,
    totalUnreadCount,
    loadChats,
    createOrGetChat,
    sendMessage,
    markMessagesAsRead
  };
};
