import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/authContext';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      sender: 'bot',
      text: 'Xin chào! Tôi là trợ lý ảo AI của SportFields. Tôi có thể giúp gì cho bạn trong việc tìm kiếm, đặt sân bóng hoặc giải đáp thắc mắc?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // You might want to pass user info if logged in
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isLoading) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    
    // Add user message to UI
    const newUserMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/chatbot/ask`, {
        question: userText,
        sessionId: sessionId
      });

      const { answer, sessionId: newSessionId } = response.data.data;
      
      if (newSessionId) {
        setSessionId(newSessionId);
      }

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: answer,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMsg]);
    } catch (error: any) {
      console.error('Chatbot API error:', error);
      
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        sender: 'bot',
        text: 'Xin lỗi, hệ thống AI đang gặp sự cố hoặc chưa được cấu hình đầy đủ. Vui lòng thử lại sau.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="bg-[#16A34A] hover:bg-green-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transform transition-all duration-300 hover:scale-110 focus:outline-none"
        >
          <i className="fas fa-comment-dots text-2xl"></i>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white rounded-xl shadow-2xl w-80 sm:w-96 h-[500px] flex flex-col overflow-hidden border border-gray-200 animate-fadeIn">
          {/* Header */}
          <div className="bg-[#16A34A] text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <i className="fas fa-robot text-[#16A34A]"></i>
              </div>
              <div>
                <h3 className="font-bold text-sm">SportFields AI</h3>
                <p className="text-xs text-green-100">Sẵn sàng hỗ trợ</p>
              </div>
            </div>
            <button 
              onClick={toggleChat}
              className="text-white hover:text-gray-200 focus:outline-none"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-2xl p-3 text-sm ${
                    msg.sender === 'user' 
                      ? 'bg-[#16A34A] text-white rounded-tr-none' 
                      : 'bg-white text-gray-800 border border-gray-200 shadow-sm rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <p className={`text-[10px] mt-1 text-right ${msg.sender === 'user' ? 'text-green-100' : 'text-gray-400'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 shadow-sm rounded-2xl rounded-tl-none p-3 max-w-[80%]">
                  <div className="flex gap-1 items-center">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-200">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Nhập câu hỏi của bạn..."
                className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] text-gray-900 bg-white"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className={`rounded-full w-10 h-10 flex items-center justify-center text-white transition-colors ${
                  !inputMessage.trim() || isLoading ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#16A34A] hover:bg-green-700'
                }`}
              >
                <i className="fas fa-paper-plane text-sm"></i>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
