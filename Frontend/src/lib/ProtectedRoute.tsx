import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/authContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requiredRole?: 'customer' | 'owner' | 'admin';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  redirectTo = '/auth',
  requiredRole 
}) => {  const { user, isLoading } = useAuth();
  const location = useLocation();
  
  // If still loading authentication, show loading indicator
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }if (requiredRole && user.role !== requiredRole) {
    // Redirect to appropriate dashboard based on role
    if (user.role === 'owner') {
      return <Navigate to="/owner/dashboard" replace />;
    } else if (user.role === 'customer') {
      // If user is customer but on a page that requires different role,
      // only redirect if NOT already on customer-accessible pages
      if (!location.pathname.startsWith('/profile') && 
          !location.pathname.startsWith('/chat') &&
          !location.pathname.startsWith('/wishlist')) {
        return <Navigate to="/profile" replace />;
      }
    }
    // If user's role doesn't match and we can't redirect safely, go to home
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;

export const AdminRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  redirectTo = '/' 
}) => {
  const { user } = useAuth();
  
  if (!user || user.userType !== 'owner') {
    return <Navigate to={redirectTo} replace />;
  }
  
  return <>{children}</>;
}; 