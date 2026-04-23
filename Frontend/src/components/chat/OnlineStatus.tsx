import React from 'react';

interface OnlineStatusProps {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

const OnlineStatus: React.FC<OnlineStatusProps> = ({ 
  isOnline, 
  size = 'md', 
  className = '',
  showTooltip = true
}) => {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4', 
    lg: 'h-5 w-5'
  };

  return (
    <div className="relative group">
      <span 
        className={`
          absolute -bottom-1 -right-1 block rounded-full ring-2 ring-white transition-all duration-200
          ${sizeClasses[size]}
          ${isOnline 
            ? 'bg-green-500 shadow-lg' 
            : 'bg-gray-400'
          }
          ${className}
        `}
        style={{
          animation: isOnline ? 'onlinePulse 2s infinite' : 'none'
        }}
      />
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
          {isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-gray-800"></div>
        </div>
      )}
    </div>
  );
};

export default OnlineStatus;
