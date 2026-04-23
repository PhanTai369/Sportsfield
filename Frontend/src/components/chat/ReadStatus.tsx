import React from 'react';
import { Check, CheckCheck } from 'lucide-react';

interface ReadStatusProps {
  isRead: boolean;
  isSent: boolean;
  className?: string;
}

const ReadStatus: React.FC<ReadStatusProps> = ({ isRead, isSent, className = '' }) => {
  if (!isSent) {
    return (
      <div className={`flex items-center ${className}`} title="Đang gửi...">
        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  if (isRead) {
    return (
      <div className={className} title="Đã đọc">
        <CheckCheck className="w-4 h-4 text-blue-400" />
      </div>
    );
  }

  return (
    <div className={className} title="Đã gửi">
      <Check className="w-4 h-4" />
    </div>
  );
};

export default ReadStatus;
