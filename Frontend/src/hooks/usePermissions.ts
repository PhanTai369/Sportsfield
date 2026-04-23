import { useAuth } from '../contexts/authContext';

export const usePermissions = () => {
  const { user } = useAuth();

  return {
    // Basic role checks
    isCustomer: user?.role === 'customer',
    isOwner: user?.role === 'owner',
    isAdmin: user?.role === 'admin',
    
    // Specific permission checks
    canFavorite: user?.role === 'customer',
    canManagePitches: user?.role === 'owner',
    canViewOwnerDashboard: user?.role === 'owner',
    canViewCustomerDashboard: user?.role === 'customer',
    canChat: user?.role === 'customer' || user?.role === 'owner',
    canBookFields: user?.role === 'customer',
    canManageBookings: user?.role === 'owner',
    canViewReports: user?.role === 'owner' || user?.role === 'admin',
    canManageUsers: user?.role === 'admin',
    
    // Current user info
    currentUser: user,
    userRole: user?.role,
  };
};

export default usePermissions;
