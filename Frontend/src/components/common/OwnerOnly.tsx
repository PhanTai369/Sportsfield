import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';

interface OwnerOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const OwnerOnly: React.FC<OwnerOnlyProps> = ({ 
  children, 
  fallback = null 
}) => {
  const { isOwner } = usePermissions();

  // Chỉ hiển thị cho owner
  if (!isOwner) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default OwnerOnly;
