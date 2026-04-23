import React from 'react';
import Profile from '../../profile/Profile';
import OwnerLayout from '../layout/OwnerLayout';

const OwnerProfile: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="bg-white rounded-lg shadow">
          <Profile />
        </div>
      </div>
    </div>
  );
};

export default OwnerProfile; 