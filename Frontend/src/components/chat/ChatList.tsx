import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, MessageCircle, Users } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import { chatService, Chat } from '../../services/chatService';
import { useAuth } from '../../contexts/authContext';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import OnlineStatus from './OnlineStatus';

interface ChatListProps {
  onChatSelect: (chatId: string) => void;
  selectedChatId?: string;
}

const ChatList: React.FC<ChatListProps> = ({ onChatSelect, selectedChatId }) => {
  const { user } = useAuth();
  const { socket, on, off } = useSocket();
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  // Load chats
  const loadChats = useCallback(async () => {
    try {
      setLoading(true);
      const [chatsData, unreadData] = await Promise.all([
        chatService.getUserChats(),
        chatService.getUnreadMessagesCountByChat()
      ]);
      
      setChats(chatsData);
      setUnreadCounts(unreadData);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter chats based on search query
  const filteredChats = chats.filter(chat =>
    chat.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase())
  );
  // Socket event handlers
  useEffect(() => {
    if (!socket || !user) return;

    const handleNewMessage = (message: any) => {
      console.log('ChatList received new_message:', message);
      
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
                isFromMe: message.senderId === user?.id,
                isRead: message.isRead
              }
            };
          }
          return chat;
        });

        // If no chat was updated, might be a new chat that doesn't exist in list
        const chatExists = updatedChats.some(chat => chat.id === message.chatId);
        if (!chatExists) {
          // This could be a new chat, reload the chat list
          console.log('New chat detected, reloading chat list');
          loadChats(); // Reload to get the new chat
          return prevChats; // Return current state while loading
        }

        // Sort by latest message
        return updatedChats.sort((a, b) => {
          const aTime = a.lastMessage?.createdAt || a.createdAt;
          const bTime = b.lastMessage?.createdAt || b.createdAt;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });
      });

      // Update unread count
      if (message.senderId !== user?.id) {
        setUnreadCounts(prev => ({
          ...prev,
          [message.chatId]: (prev[message.chatId] || 0) + 1
        }));
      }
    };

    const handleNewChat = (newChat: Chat) => {
      console.log('ChatList received new_chat:', newChat);
      setChats(prevChats => {
        const exists = prevChats.find(chat => chat.id === newChat.id);
        if (!exists) {
          return [newChat, ...prevChats];
        }
        return prevChats;
      });
    };    const handleMessagesRead = (data: { chatId: string; readData: { userId: string; readAt: string } }) => {
      console.log('ChatList received messages_read:', data);
      // Only update unread count if the current user read the messages
      if (data.readData.userId === user?.id) {
        setUnreadCounts(prev => ({
          ...prev,
          [data.chatId]: 0
        }));
      }
    };    const handleUserStatusChange = (data: { userId: string; status: 'online' | 'offline'; lastSeen?: string }) => {
      console.log('ChatList: user_status_change received:', data);
      setChats(prevChats => 
        prevChats.map(chat => {
          if (chat.otherUser.id === data.userId) {
            console.log(`Updating chat ${chat.id} user ${data.userId} status to: ${data.status}`);
            return {
              ...chat,
              otherUser: {
                ...chat.otherUser,
                isOnline: data.status === 'online',
                lastSeen: data.status === 'offline' ? data.lastSeen : chat.otherUser.lastSeen
              }
            };
          }
          return chat;
        })
      );
    };

    const handleUserOnlineStatus = (data: { userId: string; isOnline: boolean; timestamp: string }) => {
      console.log('ChatList: user_online_status received:', data);
      setChats(prevChats => 
        prevChats.map(chat => {
          if (chat.otherUser.id === data.userId) {
            console.log(`Updating chat ${chat.id} user ${data.userId} online status to: ${data.isOnline}`);
            return {
              ...chat,
              otherUser: {
                ...chat.otherUser,
                isOnline: data.isOnline
              }
            };
          }
          return chat;
        })
      );
    };// Register event listeners
    on('new_message', handleNewMessage);
    on('new_chat', handleNewChat);
    on('messages_read', handleMessagesRead);
    on('user_status_change', handleUserStatusChange);
    on('user_online_status', handleUserOnlineStatus);

    return () => {
      // Cleanup event listeners
      off('new_message', handleNewMessage);
      off('new_chat', handleNewChat);
      off('messages_read', handleMessagesRead);
      off('user_status_change', handleUserStatusChange);
      off('user_online_status', handleUserOnlineStatus);
    };
  }, [socket, user?.id, on, off, loadChats]);

  // Load chats on mount
  useEffect(() => {
    loadChats();
  }, []);
  if (loading) {
    return (
      <div className="w-full bg-white flex flex-col h-full">
        {/* Header Skeleton */}
        <div className="px-4 py-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="h-8 bg-gray-200 rounded-md w-20 mb-2 loading-shimmer"></div>
              <div className="h-4 bg-gray-200 rounded-md w-40 loading-shimmer"></div>
            </div>
            <div className="w-10 h-10 bg-gray-200 rounded-full loading-shimmer"></div>
          </div>
          <div className="h-12 bg-gray-200 rounded-xl loading-shimmer"></div>
        </div>
        
        {/* Chat Items Skeleton */}
        <div className="flex-1 p-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 mx-2 my-1 flex items-center space-x-4">
              <div className="w-14 h-14 bg-gray-200 rounded-full loading-shimmer"></div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div className="h-4 bg-gray-200 rounded w-24 loading-shimmer"></div>
                  <div className="h-3 bg-gray-200 rounded w-12 loading-shimmer"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-32 loading-shimmer"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="w-full bg-white flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chats</h1>
            <p className="text-sm text-gray-600 mt-1">Kết nối với cộng đồng thể thao</p>
          </div>
          <button className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors">
            <Plus className="w-5 h-5" />
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm cuộc trò chuyện..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent focus:bg-white transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-2">
              {searchQuery ? 'Không tìm thấy cuộc trò chuyện' : 'Chưa có cuộc trò chuyện nào'}
            </h3>
            <p className="text-sm text-gray-500 max-w-xs">
              {searchQuery 
                ? 'Thử tìm kiếm với từ khóa khác' 
                : 'Bắt đầu cuộc trò chuyện mới với chủ sân bóng'
              }
            </p>
          </div>
        ) : (
          <div className="px-2 py-2">
            {filteredChats.map((chat) => {
              const unreadCount = unreadCounts[chat.id] || chat.unreadCount || 0;
              
              return (                <div 
                  key={chat.id} 
                  className={`chat-item p-4 mx-2 my-1 flex items-center space-x-4 hover:bg-gray-50 cursor-pointer rounded-xl transition-all duration-200 ${
                    selectedChatId === chat.id ? 'bg-green-50 border border-green-200 shadow-sm' : ''
                  }`}
                  onClick={() => onChatSelect(chat.id)}
                >
                  <div className="relative flex-shrink-0">
                    {chat.otherUser.profileImage ? (
                      <img 
                        src={chat.otherUser.profileImage} 
                        alt={chat.otherUser.name} 
                        className="h-14 w-14 rounded-full object-cover border-2 border-white shadow-md"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white shadow-md">
                        <span className="text-lg font-semibold">
                          {chat.otherUser.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}                    {/* Online status */}
                    <OnlineStatus isOnline={chat.otherUser.isOnline || false} size="md" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center space-x-2">
                        <p className="text-base font-semibold text-gray-900 truncate">
                          {chat.otherUser.name}
                        </p>
                        {chat.otherUser.role === 'owner' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            <Users className="w-3 h-3 mr-1" />
                            CS
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        {chat.lastMessage && (
                          <p className="text-xs text-gray-500 font-medium">
                            {formatDistanceToNow(new Date(chat.lastMessage.createdAt), { 
                              addSuffix: false, 
                              locale: vi 
                            })}
                          </p>
                        )}                        {unreadCount > 0 && (
                          <span className="notification-badge inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold leading-none text-white bg-green-500 rounded-full shadow-sm">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {chat.lastMessage && (
                      <div className="flex items-center">
                        {chat.lastMessage.isFromMe && (
                          <span className="text-gray-500 text-sm mr-1">Bạn: </span>
                        )}
                        <p className={`text-sm truncate ${
                          unreadCount > 0 && !chat.lastMessage.isFromMe 
                            ? 'text-gray-900 font-medium' 
                            : 'text-gray-600'
                        }`}>
                          {chat.lastMessage.content}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;
