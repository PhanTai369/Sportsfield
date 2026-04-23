import React, { useState } from 'react';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import { MessageCircle, X } from 'lucide-react';
import './ChatAnimations.css';

interface ChatInterfaceProps {
  className?: string;
  initialChatId?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ className = '', initialChatId }) => {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(initialChatId || null);
  const [isMobileView, setIsMobileView] = useState(!!initialChatId);

  const handleChatSelect = (chatId: string) => {
    setSelectedChatId(chatId);
    setIsMobileView(true);
  };

  const handleBackToList = () => {
    setSelectedChatId(null);
    setIsMobileView(false);
  };  return (
    <div className={`flex h-full chat-interface-enter ${className}`}>
      {/* Chat List - Hidden on mobile when chat is selected */}
      <div className={`${isMobileView ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-gray-200 bg-white`}>
        <ChatList 
          onChatSelect={handleChatSelect}
          selectedChatId={selectedChatId || undefined}
        />
      </div>

      {/* Chat Window */}
      <div className={`flex-1 ${!selectedChatId && !isMobileView ? 'hidden md:flex' : 'flex'} bg-gray-50`}>
        {selectedChatId ? (
          <ChatWindow 
            chatId={selectedChatId}
            onBack={handleBackToList}
          />
        ) : (
          // Empty state
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="text-center max-w-md mx-auto px-6">
              <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="w-12 h-12 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Chọn một cuộc trò chuyện
              </h3>
              <p className="text-gray-500 leading-relaxed">
                Chọn một cuộc trò chuyện từ danh sách bên trái để bắt đầu nhắn tin với bạn bè trong cộng đồng thể thao
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
