import React from "react";
import { useLocation } from "react-router-dom";
import OwnerChatInterface from "../chat/OwnerChatInterface";
import { useAuth } from "../../../contexts/authContext";

const OwnerChatPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Get selectedChatId from navigation state
  const initialChatId = location.state?.selectedChatId;

  if (!user || user.role !== 'owner') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Bạn cần quyền chủ sân để truy cập trang này
          </h2>
          <p className="text-gray-600">
            Chỉ có chủ sân mới có thể truy cập vào trang chat này.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Content */}
      <div className="h-screen">
        <div className="bg-white h-full">
          <OwnerChatInterface initialChatId={initialChatId} />
        </div>
      </div>
    </div>
  );
};

export default OwnerChatPage;