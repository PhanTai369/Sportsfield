import React from 'react';
import { Outlet } from 'react-router-dom';
import OwnerSidebar from './OwnerSidebar.tsx';
import OwnerHeader from './OwnerHeader.tsx';
import OwnerChatFloatingButton from '../chat/OwnerChatFloatingButton';
import GlobalPackageNotification from '../../common/GlobalPackageNotification';
import { usePackageNotification } from '../../../hooks/usePackageNotification';

const OwnerLayout: React.FC = () => {
  // Kích hoạt toast notifications tự động
  usePackageNotification({
    enableToasts: true,
    toastInterval: 30 * 60 * 1000, // 30 phút
    onlyShowCritical: true // Chỉ hiển thị toast cho trường hợp nghiêm trọng
  });

  return (
    <div className="flex min-h-screen bg-gray-50">
      <OwnerSidebar />
      <div className="flex-1 flex flex-col">
        <OwnerHeader />
        {/* Global Package Status Notification - hiển thị ở đây thay vì sidebar */}
        {/* <GlobalPackageNotification 
          hideOnRoutes={[
            '/owner/service-plans',
            '/owner/service-plan-management'
          ]} 
        /> */}
        <main className="flex-1 p-6 bg-gray-50 overflow-auto">
          <Outlet />
        </main>
      </div>
      
      {/* Owner Chat Floating Button */}
      {/* <OwnerChatFloatingButton /> */}
    </div>
  );
};

export default OwnerLayout; 