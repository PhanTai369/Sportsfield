import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../contexts/authContext';
import { Navigate } from 'react-router-dom';

interface PermissionWrapperProps {
  children: React.ReactNode;
  requiredPermission: keyof ReturnType<typeof usePermissions>;
  fallbackPath?: string;
  fallbackMessage?: React.ReactNode;
}

const PermissionWrapper: React.FC<PermissionWrapperProps> = ({ 
  children, 
  requiredPermission,
  fallbackPath = '/',
  fallbackMessage
}) => {
  const permissions = usePermissions();
  const { user } = useAuth();

  // Nếu chưa đăng nhập
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Kiểm tra quyền
  if (!permissions[requiredPermission]) {
    if (fallbackMessage) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center p-8">
            {fallbackMessage}
          </div>
        </div>
      );
    }
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};

export default PermissionWrapper;
