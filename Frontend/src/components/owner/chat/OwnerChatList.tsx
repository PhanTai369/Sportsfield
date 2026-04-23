import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Users, MessageSquare } from 'lucide-react';
import { useSocket } from '../../../hooks/useSocket';
import { chatService, Chat } from '../../../services/chatService';
import { useAuth } from '../../../contexts/authContext';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface OwnerChatListProps {
  onChatSelect: (chatId: string) => void;
  selectedChatId?: string;
}

const OwnerChatList: React.FC<OwnerChatListProps> = ({ onChatSelect, selectedChatId }) => {
  const { user } = useAuth();
  const { socket, on, off } = useSocket();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  // Load chats
  const loadChats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await chatService.getUserChats();
      setChats(data);
      
      // Load unread counts for each chat
      const counts: Record<string, number> = {};
      for (const chat of data) {
        if (chat.unreadCount) {
          counts[chat.id] = chat.unreadCount;
        }
      }
      setUnreadCounts(counts);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  // Handle socket events
  useEffect(() => {
    if (!socket || !user) return;

    const handleNewMessage = (message: any) => {
      console.log('OwnerChatList received new_message:', message);
      
      // Update chat list with new message
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
      console.log('OwnerChatList received new_chat:', newChat);
      setChats(prevChats => {
        const exists = prevChats.find(chat => chat.id === newChat.id);
        if (!exists) {
          return [newChat, ...prevChats];
        }
        return prevChats;
      });
    };    const handleMessagesRead = (data: { chatId: string; readData: { userId: string; readAt: string } }) => {
      console.log('OwnerChatList received messages_read:', data);
      // Only update unread count if the current user read the messages
      if (data.readData.userId === user?.id) {
        setUnreadCounts(prev => ({
          ...prev,
          [data.chatId]: 0
        }));
      }
    };const handleUserStatusChange = (data: { userId: string; status: 'online' | 'offline'; lastSeen?: string }) => {
      setChats(prevChats => 
        prevChats.map(chat => 
          chat.otherUser.id === data.userId 
            ? {
                ...chat,
                otherUser: {
                  ...chat.otherUser,
                  isOnline: data.status === 'online',
                  lastSeen: data.status === 'offline' ? data.lastSeen : chat.otherUser.lastSeen
                }
              }
            : chat
        )
      );
    };

    const handleUserOnlineStatus = (data: { userId: string; isOnline: boolean; timestamp: string }) => {
      setChats(prevChats => 
        prevChats.map(chat => 
          chat.otherUser.id === data.userId 
            ? {
                ...chat,
                otherUser: {
                  ...chat.otherUser,
                  isOnline: data.isOnline
                }
              }
            : chat
        )
      );
    };    // Register event listeners
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

  // Filter chats based on search term
  const filteredChats = chats.filter(chat => 
    chat.otherUser.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (chat.lastMessage?.content || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-blue-900">Chat Khách hàng</h2>
            <button className="text-blue-600 hover:text-blue-700">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm khách hàng..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled
            />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-500 text-sm">Đang tải...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-blue-900">Chat Khách hàng</h2>
          <button className="text-blue-600 hover:text-blue-700">
            <Plus className="w-5 h-5" />
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm khách hàng..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4">
            <MessageSquare className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500 text-center">
              {searchTerm ? 'Không tìm thấy cuộc trò chuyện nào' : 'Chưa có tin nhắn từ khách hàng'}
            </p>
            {!searchTerm && (
              <p className="text-gray-400 text-sm text-center mt-2">
                Khách hàng sẽ có thể nhắn tin với bạn từ trang chi tiết sân bóng
              </p>
            )}
          </div>
        ) : (
          filteredChats.map((chat) => {
            const unreadCount = unreadCounts[chat.id] || 0;
            return (
              <div
                key={chat.id}
                onClick={() => onChatSelect(chat.id)}
                className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedChatId === chat.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {chat.otherUser.profileImage ? (
                      <img 
                        src={chat.otherUser.profileImage} 
                        alt={chat.otherUser.name} 
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
                        <span className="text-sm font-medium">
                          {chat.otherUser.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white ${
                      chat.otherUser.isOnline ? 'bg-green-500' : 'bg-gray-400'
                    }`}></span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {chat.otherUser.name}
                        </p>
                        {chat.otherUser.role === 'customer' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            <Users className="w-3 h-3 mr-1" />
                            KH
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        {chat.lastMessage && (
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(chat.lastMessage.createdAt), { 
                              addSuffix: false, 
                              locale: vi 
                            })}
                          </p>
                        )}
                        {unreadCount > 0 && (
                          <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {chat.lastMessage && (
                      <div className="flex items-center mt-1">
                        {chat.lastMessage.isFromMe && (
                          <span className="text-gray-400 text-xs mr-1">Bạn: </span>
                        )}
                        <p className={`text-xs truncate ${
                          unreadCount > 0 && !chat.lastMessage.isFromMe 
                            ? 'text-gray-900 font-medium' 
                            : 'text-gray-500'
                        }`}>
                          {chat.lastMessage.content}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default OwnerChatList;
