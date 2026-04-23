import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import ChatInterface from "./ChatInterface";

import { useAuth } from "../../contexts/authContext";
import Navbar from "../home/navbar";
import Footer from "../home/footer";

const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [showChatInterface, setShowChatInterface] = useState(false);

  // Get selectedChatId from navigation state
  const initialChatId = location.state?.selectedChatId;

  useEffect(() => {
    // If there's an initial chat ID, show the chat interface immediately
    if (initialChatId) {
      setShowChatInterface(true);
    }
  }, [initialChatId]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Đăng nhập để sử dụng chat
          </h2>
          <p className="text-gray-600">
            Bạn cần đăng nhập để có thể nhắn tin với người khác.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Navbar />

      {/* Content */}
      <div className="h-screen pt-16">
        {showChatInterface ? (
          <div className="h-full bg-white shadow-xl">
            <ChatInterface initialChatId={initialChatId} />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="mb-8">
                <div className="w-32 h-32 bg-gradient-to-br from-green-400 to-green-600 rounded-full mx-auto flex items-center justify-center">
                  <svg
                    className="w-16 h-16 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.964 8.964 0 01-4.953-1.488A3.997 3.997 0 003 12V7a8 8 0 018-8h6a8 8 0 018 8v5z"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-6">
                Chào mừng đến với Sport Field Chat
              </h3>
              <p className="text-lg text-gray-600 mb-10 max-w-lg mx-auto">
                Kết nối với những người yêu thể thao khác, trao đổi về các sân bóng và đặt lịch cùng nhau.
              </p>
              <button
                onClick={() => setShowChatInterface(true)}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Bắt đầu trò chuyện
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
