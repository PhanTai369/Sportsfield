import React from 'react';
import { Link } from 'react-router-dom';
import { XCircleIcon } from '@heroicons/react/24/solid';

const PaymentCancel: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
      <div className="max-w-md w-full px-4">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Cancel Header */}
          <div className="bg-yellow-50 px-6 py-8 text-center">
            <XCircleIcon className="mx-auto h-16 w-16 text-yellow-400" />
            <h1 className="mt-4 text-3xl font-bold text-gray-900">Thanh toán đã bị hủy</h1>
            <p className="mt-2 text-lg text-gray-600">
              Bạn đã hủy quá trình thanh toán. Đặt sân của bạn chưa được xác nhận.
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Bạn có muốn thử lại?</h2>
              <p className="text-gray-600 mb-6">
                Nếu bạn gặp vấn đề trong quá trình thanh toán, hãy thử lại hoặc liên hệ với chúng tôi để được hỗ trợ.
              </p>

              <div className="space-y-4">
                <Link
                  to="/booking"
                  className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  Đặt sân lại
                </Link>
                
                <Link
                  to="/"
                  className="w-full inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Về trang chủ
                </Link>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Cần hỗ trợ?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Nếu bạn gặp khó khăn hoặc có câu hỏi về quá trình đặt sân, đừng ngần ngại liên hệ với chúng tôi.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <a
                    href="tel:+84123456789"
                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Gọi điện
                  </a>
                  
                  <a
                    href="mailto:support@example.com"
                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Gửi email
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;
