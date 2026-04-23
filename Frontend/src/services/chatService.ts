import apiClient from '../lib/apiClient';

export interface Chat {
  id: string;
  otherUser: {
    id: string;
    name: string;
    email: string;
    profileImage: string;
    role: string;
    isOnline?: boolean;
    lastSeen?: string;
  };
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    createdAt: string;
    isFromMe: boolean;
    isRead: boolean;
  };
  unreadCount: number;
  createdAt: string;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  chatId: string;
  isFromMe: boolean;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
    profileImage?: string;
  };
}

export interface ChatDetail {
  id: string;
  currentUserId?: string;
  otherUser: {
    id: string;
    name: string;
    email: string;
    profileImage: string;
    role: string;
    isOnline?: boolean;
    lastSeen?: string;
  };
  messages: Message[];
  createdAt: string;
}

export interface SendMessageRequest {
  content: string;
}

export interface CreateChatRequest {
  otherUserId: string;
}

class ChatService {
  // Get all chats for current user
  async getUserChats(): Promise<Chat[]> {
    const response = await apiClient.get('/chats');
    return response.data;
  }

  // Create or get existing chat
  async createOrGetChat(otherUserId: string): Promise<Chat> {
    const response = await apiClient.post('/chats', { otherUserId });
    return response.data;
  }

  // Get chat detail with messages
  async getChatDetail(chatId: string): Promise<ChatDetail> {
    const response = await apiClient.get(`/chats/${chatId}`);
    return response.data;
  }

  // Send message in chat
  async sendMessage(chatId: string, content: string): Promise<Message> {
    const response = await apiClient.post(`/chats/${chatId}/messages`, { content });
    return response.data;
  }

  // Delete message
  async deleteMessage(messageId: string): Promise<void> {
    await apiClient.delete(`/chats/messages/${messageId}`);
  }

  // Mark messages as read
  async markMessagesAsRead(chatId: string): Promise<void> {
    await apiClient.put(`/chats/${chatId}/read`);
  }

  // Get unread messages count
  async getUnreadMessagesCount(): Promise<{ unreadCount: number }> {
    const response = await apiClient.get('/chats/unread/count');
    return response.data;
  }

  // Get unread messages count by chat
  async getUnreadMessagesCountByChat(): Promise<Record<string, number>> {
    const response = await apiClient.get('/chats/unread/count-by-chat');
    return response.data;
  }
}

export const chatService = new ChatService();
