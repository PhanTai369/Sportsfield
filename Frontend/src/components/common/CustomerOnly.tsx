import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';

interface CustomerOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const CustomerOnly: React.FC<CustomerOnlyProps> = ({ 
  children, 
  fallback = null 
}) => {
  const { isCustomer } = usePermissions();

  // Chỉ hiển thị cho customer
  if (!isCustomer) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default CustomerOnly;
