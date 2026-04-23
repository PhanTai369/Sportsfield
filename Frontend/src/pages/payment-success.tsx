import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Có thể lấy thông tin gói từ query hoặc localStorage nếu cần
  // const { packageType } = new URLSearchParams(location.search);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-green-50">
      <div className="bg-white p-8 rounded shadow-md text-center">
        <div className="text-green-500 text-5xl mb-4">
          <i className="fas fa-check-circle"></i>
        </div>
        <h1 className="text-2xl font-bold mb-2">Thanh toán thành công!</h1>
        <p className="mb-4">Bạn đã mua gói dịch vụ thành công. Cảm ơn bạn đã tin tưởng sử dụng dịch vụ của chúng tôi.</p>
        <button
          className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 transition"
          onClick={() => navigate('/owner/pitches')}
        >
          Quay về quản lý sân
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccess;
