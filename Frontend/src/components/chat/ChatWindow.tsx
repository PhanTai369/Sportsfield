import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, MoreVertical, Phone, Video, Search, Info, ArrowLeft } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import { chatService, Message, ChatDetail } from '../../services/chatService';
import { useAuth } from '../../contexts/authContext';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import ReadStatus from './ReadStatus';
import OnlineStatus from './OnlineStatus';

interface ChatWindowProps {
  chatId: string;
  onBack?: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chatId, onBack }) => {
  const { user } = useAuth();
  const { socket, joinChat, leaveChat, startTyping, stopTyping, markMessagesAsRead, sendMessage: sendSocketMessage, updateOnlineStatus, getUserOnlineStatus, on, off } = useSocket();
  
  const [chatDetail, setChatDetail] = useState<ChatDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ userId: string; userName: string }[]>([]);  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [sendButtonActive, setSendButtonActive] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };  // Load chat detail
  const loadChatDetail = async () => {
    try {
      console.log('Loading chat detail for chatId:', chatId);
      
      const detail = await chatService.getChatDetail(chatId);
      console.log('Loaded chat detail:', detail);
      console.log('Messages count:', detail.messages?.length || 0);
      
      setChatDetail(detail);
      
      // Only set messages from API if we don't have messages from socket yet
      setMessages(prevMessages => {
        if (prevMessages.length > 0) {
          console.log('Messages already loaded from socket, keeping them');
          return prevMessages;
        }
        
        // If no messages from socket, use API messages as fallback
        const sortedMessages = (detail.messages || []).sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        console.log('Setting sorted messages from API:', sortedMessages.length);
        return sortedMessages;
      });
      
      // Set initial online status
      const initialOnlineStatus = detail.otherUser.isOnline || false;
      setOtherUserOnline(initialOnlineStatus);
      console.log('Set initial online status to:', initialOnlineStatus);
      
      // Get current online status from socket
      if (detail.otherUser.id && getUserOnlineStatus) {
        console.log('Requesting online status for user:', detail.otherUser.id);
        getUserOnlineStatus(detail.otherUser.id);
      }
      
      // Mark messages as read
      await markMessagesAsRead(chatId);
    } catch (error) {
      console.error('Error loading chat detail:', error);
      setMessages([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };// Handle sending message
  const handleSendMessage = async () => {
    if (!message.trim() || sending) return;

    setSending(true);
    setSendButtonActive(true);
    try {
      // Stop typing indicator
      handleStopTyping();
      
      // Use socket to send message for real-time communication
      sendSocketMessage(chatId, message.trim());
      setMessage('');
      
      // Reset button animation after a short delay
      setTimeout(() => setSendButtonActive(false), 300);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    } else if (e.key !== 'Enter') {
      handleStartTyping();
    }
  };

  // Handle typing start
  const handleStartTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      startTyping(chatId);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 2000);
  };

  // Handle typing stop
  const handleStopTyping = () => {
    if (isTyping) {
      setIsTyping(false);
      stopTyping(chatId);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };
  // Socket event handlers
  useEffect(() => {
    if (!socket || !chatDetail) return;

    const handleNewMessage = (newMessage: Message) => {
      console.log('Received new message:', newMessage);
      if (newMessage.chatId === chatId) {
        // Check if message already exists to avoid duplicates
        setMessages(prev => {
          const exists = prev.find(msg => msg.id === newMessage.id);
          if (exists) {
            console.log('Message already exists, skipping');
            return prev; // Message already exists, don't add again
          }
          console.log('Adding new message to list');
          return [...prev, newMessage];
        });
        
        // Mark as read if not from current user
        if (newMessage.senderId !== user?.id) {
          markMessagesAsRead(chatId);
        }
      }
    };

    const handleMessageDeleted = (data: { messageId: string; chatId: string }) => {
      console.log('Message deleted:', data);
      if (data.chatId === chatId) {
        setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
      }
    };    const handleUserTyping = (data: { userId: string; userName: string; chatId: string }) => {
      console.log('Received typing event:', data, 'Current chatId:', chatId);
      if (data.chatId === chatId && data.userId !== user?.id) {
        setTypingUsers(prev => {
          const exists = prev.find(u => u.userId === data.userId);
          if (!exists) {
            console.log('Adding typing user:', data.userName);
            return [...prev, { userId: data.userId, userName: data.userName }];
          }
          return prev;
        });
      }
    };

    const handleUserStopTyping = (data: { userId: string; chatId: string }) => {
      console.log('Received stop typing event:', data, 'Current chatId:', chatId);
      if (data.chatId === chatId) {
        setTypingUsers(prev => {
          const filtered = prev.filter(u => u.userId !== data.userId);
          if (filtered.length !== prev.length) {
            console.log('Removing typing user:', data.userId);
          }
          return filtered;
        });
      }
    };const handleUserStatusChange = (data: { userId: string; status: 'online' | 'offline'; lastSeen?: string }) => {
      if (chatDetail && data.userId === chatDetail.otherUser.id) {
        const isOnline = data.status === 'online';
        setOtherUserOnline(isOnline);
        
        // Update chatDetail with new status
        setChatDetail(prev => prev ? {
          ...prev,
          otherUser: {
            ...prev.otherUser,
            isOnline: isOnline,
            lastSeen: data.status === 'offline' && data.lastSeen ? data.lastSeen : prev.otherUser.lastSeen
          }
        } : null);
        
        console.log(`User ${data.userId} status changed to: ${data.status}`);
      }
    };    const handleUserOnlineStatus = (data: { userId: string; isOnline: boolean; timestamp: string }) => {
      if (chatDetail && data.userId === chatDetail.otherUser.id) {
        setOtherUserOnline(data.isOnline);
        
        // Update chatDetail with new status
        setChatDetail(prev => prev ? {
          ...prev,
          otherUser: {
            ...prev.otherUser,
            isOnline: data.isOnline
          }
        } : null);
        
        console.log(`User ${data.userId} online status: ${data.isOnline}`);
      }
    };    const handleChatHistory = (data: { chatId: string; messages: Message[] }) => {
      console.log('Received chat history:', data);
      if (data.chatId === chatId) {
        console.log('Setting messages from chat history:', data.messages.length, 'messages');
        setMessages(data.messages.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ));
      }
    };const handleMessageSent = (data: { messageId: string; chatId: string; timestamp: string }) => {
      if (data.chatId === chatId) {
        console.log('Message sent successfully:', data.messageId);
        // Message will be received via new_message event, so no need to add here
      }
    };

    // Register event listeners
    on('new_message', handleNewMessage);
    on('message_deleted', handleMessageDeleted);
    on('user_typing', handleUserTyping);
    on('user_stop_typing', handleUserStopTyping);
    on('user_status_change', handleUserStatusChange);
    on('user_online_status', handleUserOnlineStatus);
    on('chat_history', handleChatHistory);
    on('message_sent', handleMessageSent);

    return () => {
      // Cleanup event listeners
      off('new_message', handleNewMessage);
      off('message_deleted', handleMessageDeleted);
      off('user_typing', handleUserTyping);
      off('user_stop_typing', handleUserStopTyping);
      off('user_status_change', handleUserStatusChange);
      off('user_online_status', handleUserOnlineStatus);
      off('chat_history', handleChatHistory);
      off('message_sent', handleMessageSent);
    };  }, [socket, chatDetail, chatId, user?.id, on, off, markMessagesAsRead]);
  // Join chat on mount and load data
  useEffect(() => {    const initializeChat = async () => {
      try {
        console.log('Starting chat initialization for chatId:', chatId);
        
        // Clear all previous state when switching chats
        setMessages([]);
        setChatDetail(null);
        setTypingUsers([]); // Clear typing indicators from previous chat
        setOtherUserOnline(false); // Reset online status
        setIsTyping(false); // Reset own typing state
        setLoading(true);
        
        // Join the chat room first to get socket messages
        joinChat(chatId);
        
        // Wait a bit for socket to settle, then load chat detail
        // This ensures socket messages arrive first and won't overwrite API data
        setTimeout(async () => {
          await loadChatDetail();
          console.log('Chat initialization completed for chatId:', chatId);
        }, 100);
      } catch (error) {
        console.error('Error initializing chat:', error);
        setLoading(false);
      }
    };

    initializeChat();    return () => {
      // Stop typing before leaving chat
      if (isTyping) {
        stopTyping(chatId);
      }
      leaveChat(chatId);
      handleStopTyping();
      // Clear typing users when leaving chat
      setTypingUsers([]);
    };
  }, [chatId, joinChat, leaveChat]);
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-clear typing users after 5 seconds to prevent stuck indicators
  useEffect(() => {
    if (typingUsers.length > 0) {
      const timeout = setTimeout(() => {
        console.log('Auto-clearing typing users after timeout');
        setTypingUsers([]);
      }, 5000); // 5 seconds timeout

      return () => clearTimeout(timeout);
    }
  }, [typingUsers]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!chatDetail) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Không tìm thấy cuộc trò chuyện</p>
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col bg-white h-full">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          {onBack && (
            <button 
              onClick={onBack}
              className="md:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="relative">
            {chatDetail.otherUser.profileImage ? (
              <img 
                src={chatDetail.otherUser.profileImage} 
                alt={chatDetail.otherUser.name} 
                className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-md"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white shadow-md">
                <span className="text-lg font-semibold">
                  {chatDetail.otherUser.name.charAt(0).toUpperCase()}
                </span>
              </div>            )}
            <OnlineStatus isOnline={otherUserOnline} size="md" />
          </div><div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              {chatDetail.otherUser.name}
              {chatDetail.otherUser.role === 'owner' && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  Chủ sân
                </span>
              )}
            </h2>
            <p className={`text-sm transition-colors ${
              typingUsers.length > 0 
                ? 'text-green-500 font-medium' 
                : otherUserOnline 
                  ? 'text-green-500' 
                  : 'text-gray-500'
            }`}>
              {typingUsers.length > 0 
                ? 'Đang nhập...' 
                : otherUserOnline 
                  ? 'Đang hoạt động' 
                  : chatDetail.otherUser.lastSeen 
                    ? `Hoạt động ${formatDistanceToNow(new Date(chatDetail.otherUser.lastSeen), { addSuffix: true, locale: vi })}`
                    : 'Ngoại tuyến'
              }
            </p>
          </div>
        </div>
        
      </div>      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 chat-scrollbar" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f3f4f6' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}>
        <div className="p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Send className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Chưa có tin nhắn nào
              </h3>
              <p className="text-gray-500 max-w-sm">
                Hãy bắt đầu cuộc trò chuyện bằng cách gửi tin nhắn đầu tiên
              </p>
            </div>          ) : (
            messages.map((msg, index) => {
              // Sử dụng currentUserId từ backend nếu có, fallback về user.id
              const currentUserId = chatDetail.currentUserId || user?.id;
              const isMe = String(msg.senderId) === String(currentUserId);
                            
              const showAvatar = index === 0 || messages[index - 1]?.senderId !== msg.senderId;
              const showTimestamp = index === 0 || 
                new Date(msg.createdAt).getTime() - new Date(messages[index - 1]?.createdAt).getTime() > 300000; // 5 minutes
              
              return (
                <div key={msg.id}>
                  {showTimestamp && (
                    <div className="flex justify-center mb-4">
                      <span className="bg-white px-3 py-1 rounded-full text-xs text-gray-500 shadow-sm">
                        {new Date(msg.createdAt).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                  
                  <div className={`flex items-end space-x-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {!isMe && showAvatar && (
                      <div className="flex-shrink-0">
                        {chatDetail.otherUser.profileImage ? (
                          <img 
                            src={chatDetail.otherUser.profileImage} 
                            alt={chatDetail.otherUser.name} 
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-semibold">
                            {chatDetail.otherUser.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {!isMe && !showAvatar && <div className="w-8" />}
                    <div className={`group relative max-w-xs lg:max-w-md message-bubble ${
                      isMe 
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' 
                        : 'bg-white text-gray-800 shadow-sm border border-gray-100'
                    } rounded-2xl px-4 py-3`}>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</div>
                      <div className={`text-xs mt-2 ${
                        isMe ? 'text-green-100' : 'text-gray-500'
                      } flex items-center ${isMe ? 'justify-end' : 'justify-start'} space-x-1`}>
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {isMe && (
                          <ReadStatus 
                            isRead={msg.isRead} 
                            isSent={true}
                            className="text-green-100 message-status"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="flex items-end space-x-3">
              <div className="flex-shrink-0">
                {chatDetail.otherUser.profileImage ? (
                  <img 
                    src={chatDetail.otherUser.profileImage} 
                    alt={chatDetail.otherUser.name} 
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-semibold">
                    {chatDetail.otherUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Đang nhập</span>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
                    </div>
                  </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex items-end space-x-4">
          <button className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <Paperclip className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Nhập tin nhắn của bạn..."
              className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none bg-gray-50 focus:bg-white transition-all min-h-[44px] max-h-32"
              rows={1}
              disabled={sending}
              style={{ 
                scrollbarWidth: 'thin',
                scrollbarColor: '#d1d5db transparent'
              }}
            />
          </div>          <button 
            onClick={handleSendMessage}
            disabled={!message.trim() || sending}
            className={`bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white rounded-full p-3 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none disabled:shadow-none ${
              sendButtonActive ? 'send-button-active' : ''
            }`}
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Send className="w-5 h-5" />
            )}          </button>
        </div>
      </div>

     
    </div>
  );
};

export default ChatWindow;
