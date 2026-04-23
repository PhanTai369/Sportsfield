import React, { useState } from 'react';
import OwnerChatList from './OwnerChatList';
import ChatWindow from '../../chat/ChatWindow';
import { MessageSquare } from 'lucide-react';

interface OwnerChatInterfaceProps {
  className?: string;
  initialChatId?: string;
}

const OwnerChatInterface: React.FC<OwnerChatInterfaceProps> = ({ className = '', initialChatId }) => {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(initialChatId || null);
  const [isMobileView, setIsMobileView] = useState(!!initialChatId);

  const handleChatSelect = (chatId: string) => {
    setSelectedChatId(chatId);
    setIsMobileView(true);
  };

  const handleBackToList = () => {
    setSelectedChatId(null);
    setIsMobileView(false);
  };

  return (
    <div className={`flex h-full bg-gray-50 ${className}`}>
      {/* Chat List - Hidden on mobile when chat is selected */}
      <div className={`${isMobileView ? 'hidden md:flex' : 'flex'} flex-shrink-0`}>
        <OwnerChatList 
          onChatSelect={handleChatSelect}
          selectedChatId={selectedChatId || undefined}
        />
      </div>

      {/* Chat Window */}
      <div className={`flex-1 ${!selectedChatId && !isMobileView ? 'hidden md:flex' : 'flex'}`}>
        {selectedChatId ? (
          <ChatWindow 
            chatId={selectedChatId}
            onBack={handleBackToList}
          />
        ) : (
          // Empty state
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Chọn một khách hàng để chat
              </h3>
              <p className="text-sm text-gray-500 max-w-sm">
                Chọn một cuộc trò chuyện từ danh sách bên trái để bắt đầu nhắn tin với khách hàng của bạn.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerChatInterface;
