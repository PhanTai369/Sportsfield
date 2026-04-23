import React from 'react';
import { useNavigate } from 'react-router-dom';

const PaymentCancel: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-red-50">
      <div className="bg-white p-8 rounded shadow-md text-center">
        <div className="text-red-500 text-5xl mb-4">
          <i className="fas fa-times-circle"></i>
        </div>
        <h1 className="text-2xl font-bold mb-2">Thanh toán thất bại</h1>
        <p className="mb-4">Giao dịch không thành công hoặc đã bị huỷ. Vui lòng thử lại hoặc chọn gói dịch vụ khác.</p>
        <button
          className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 transition"
          onClick={() => navigate('/owner/service-plans')}
        >
          Quay về gói dịch vụ
        </button>
      </div>
    </div>
  );
};

export default PaymentCancel;
