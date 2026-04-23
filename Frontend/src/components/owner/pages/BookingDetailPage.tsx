import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingDetailService } from '../../../services/bookingDetailService';

interface BookingDetail {
  id: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    avatar?: string;
    userId?: string;
  };
  field: {
    name: string;
    type: string;
    location: string;
    facilities: string[];
    subFields?: {
      id: string;
      name: string;
      type: string;
      timeSlot: string;
    }[];
  };
  booking: {
    date: string;
    timeSlot: string;
    duration: number;
    price: number;
    status: string;
    paymentMethod: string;
    paymentStatus: string;
    bookingDate: string;
    bookingCode: string;
    notes?: string;
  };
  review?: {
    rating: number;
    comment: string;
    date: string;
  };
  history: {
    date: string;
    action: string;
    by: string;
    note?: string;
  }[];
}

const BookingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('details');
  const [statusUpdateNote, setStatusUpdateNote] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    const fetchBookingDetail = async () => {
      if (!id) {
        setError('Không tìm thấy ID đặt sân');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const bookingDetail = await bookingDetailService.getBookingDetail(id);
        console.log('🔍 Booking detail received in component:', bookingDetail);
        console.log('🔍 Booking dates:', {
          playDate: bookingDetail.booking.date,
          bookingDate: bookingDetail.booking.bookingDate
        });
        setBooking(bookingDetail);
      } catch (err) {
        console.error('Error fetching booking detail:', err);
        setError('Không thể tải thông tin đặt sân. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetail();
  }, [id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string | null | undefined) => {
    try {
      if (!dateString || dateString === 'Chưa xác định') {
        return 'Chưa xác định';
      }
      
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Chưa xác định';
      }
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Chưa xác định';
    }
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    try {
      if (!dateString || dateString === 'Chưa xác định') {
        return 'Chưa xác định';
      }
      
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Chưa xác định';
      }
      return date.toLocaleString('vi-VN');
    } catch (error) {
      console.error('Error formatting datetime:', error);
      return 'Chưa xác định';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'refund':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'refund':
        return 'Hoàn tiền';
      case 'confirmed':
        return 'Đã xác nhận';
      case 'completed':
        return 'Hoàn thành';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Đã thanh toán';
      case 'pending':
        return 'Chờ thanh toán';
      case 'failed':
        return 'Thanh toán thất bại';
      default:
        return status;
    }
  };

  const handleStatusUpdate = (status: string) => {
    setNewStatus(status);
    setShowStatusModal(true);
  };

  const confirmStatusUpdate = async () => {
    if (booking && id) {
      try {
        await bookingDetailService.updateBookingStatus(id, newStatus, statusUpdateNote);
        
        const updatedBooking = {
          ...booking,
          booking: {
            ...booking.booking,
            status: newStatus
          },
          history: [
            ...booking.history,
            {
              date: new Date().toISOString(),
              action: `Cập nhật trạng thái thành ${getStatusText(newStatus)}`,
              by: 'Quản lý',
              note: statusUpdateNote || undefined
            }
          ]
        };
        setBooking(updatedBooking);
        setShowStatusModal(false);
        setStatusUpdateNote('');
      } catch (error) {
        console.error('Error updating status:', error);
        // Show error message to user
      }
    }
  };

  const printBooking = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải thông tin đặt sân...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
            <p className="font-bold">Lỗi!</p>
            <p>{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 mr-2"
          >
            Thử lại
          </button>
          <button
            onClick={() => navigate('/owner/booking-statistics')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
          <p className="text-gray-700">Không tìm thấy thông tin đặt sân</p>
          <button
            onClick={() => navigate('/owner/booking-statistics')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">📋 Chi Tiết Đặt Sân</h1>
              <p className="text-blue-100">Mã đặt sân: {booking.booking.bookingCode}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/owner/booking-statistics')}
                className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 border border-blue-300 text-white px-4 py-2 rounded-lg transition-all"
              >
                <i className="fas fa-arrow-left"></i>
                <span>Quay lại danh sách</span>
              </button>
              <button
                onClick={printBooking}
                className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 border border-blue-300 text-white px-4 py-2 rounded-lg transition-all"
              >
                <i className="fas fa-print"></i>
                <span>In</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status and Actions */}
        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(booking.booking.status)}`}>
                {getStatusText(booking.booking.status)}
              </span>
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getPaymentStatusColor(booking.booking.paymentStatus)}`}>
                {getPaymentStatusText(booking.booking.paymentStatus)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {booking.booking.status === 'refund' && (
                <button
                  onClick={() => handleStatusUpdate('confirmed')}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all"
                >
                  <i className="fas fa-undo"></i>
                  <span>Xử lý hoàn tiền</span>
                </button>
              )}
              {booking.booking.status === 'confirmed' && (
                <button
                  onClick={() => handleStatusUpdate('completed')}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all"
                >
                  <i className="fas fa-check-double"></i>
                  <span>Hoàn thành</span>
                </button>
              )}
              {booking.booking.status === 'confirmed' && (
                <button
                  onClick={() => handleStatusUpdate('refund')}
                  className="flex items-center space-x-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-all"
                >
                  <i className="fas fa-undo"></i>
                  <span>Hoàn tiền</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('details')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'details'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="fas fa-info-circle mr-2"></i>
                Thông tin chi tiết
              </button>
              <button
                onClick={() => setActiveTab('customer')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'customer'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="fas fa-user mr-2"></i>
                Khách hàng
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="fas fa-history mr-2"></i>
                Lịch sử
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'details' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Booking Information */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 Thông tin đặt sân</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Mã đặt sân:</span>
                        <span className="font-medium">{booking.booking.bookingCode}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Ngày đặt:</span>
                        <span className="font-medium">{booking.booking.bookingDate}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Ngày chơi:</span>
                        <span className="font-medium">{booking.booking.date}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Khung giờ:</span>
                        <span className="font-medium">{booking.booking.timeSlot}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Thời gian:</span>
                        <span className="font-medium">{booking.booking.duration} giờ</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Giá:</span>
                        <span className="font-medium text-green-600">{formatCurrency(booking.booking.price)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Field Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">⚽ Thông tin sân</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Tên sân:</span>
                        <span className="font-medium">{booking.field.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Loại sân:</span>
                        <span className="font-medium">{booking.field.type}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Địa điểm:</span>
                        <span className="font-medium">{booking.field.location}</span>
                      </div>
                      {booking.field.subFields && booking.field.subFields.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-sm text-gray-600">Sân con được đặt:</span>
                          <div className="space-y-1">
                            {booking.field.subFields.map((subField, index) => (
                              <div key={index} className="flex items-center justify-between bg-blue-50 p-2 rounded">
                                <span className="text-sm font-medium text-blue-800">{subField.name}</span>
                                <span className="text-sm text-blue-600">{subField.timeSlot}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="space-y-2">
                        <span className="text-sm text-gray-600">Tiện ích:</span>
                        <div className="flex flex-wrap gap-2">
                          {booking.field.facilities.map((facility, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full">
                              {facility}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment and Notes */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">💳 Thông tin thanh toán</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Phương thức:</span>
                        <span className="font-medium">
                          {booking.booking.paymentMethod === 'credit_card' ? 'Thẻ tín dụng' :
                           booking.booking.paymentMethod === 'cash' ? 'Tiền mặt' :
                           booking.booking.paymentMethod === 'transfer' ? 'Chuyển khoản' : 
                           booking.booking.paymentMethod}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Trạng thái:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(booking.booking.paymentStatus)}`}>
                          {getPaymentStatusText(booking.booking.paymentStatus)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Tổng tiền:</span>
                        <span className="font-bold text-lg text-green-600">{formatCurrency(booking.booking.price)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {booking.booking.notes && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">📝 Ghi chú</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-700">{booking.booking.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Review */}
                  {booking.review && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">⭐ Đánh giá</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <i
                                key={i}
                                className={`fas fa-star ${
                                  i < Math.floor(booking.review!.rating) ? 'text-yellow-400' : 'text-gray-300'
                                }`}
                              ></i>
                            ))}
                          </div>
                          <span className="font-medium">{booking.review.rating}/5</span>
                        </div>
                        <p className="text-gray-700 mb-2">{booking.review.comment}</p>
                        <p className="text-sm text-gray-500">Đánh giá vào {booking.review.date}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'customer' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">👤 Thông tin khách hàng</h3>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-lg">{booking.customer.avatar}</span>
                      </div>
                      <div>
                        <h4 className="text-xl font-semibold text-gray-900">{booking.customer.name}</h4>
                        <p className="text-gray-600">{booking.customer.email}</p>
                        <p className="text-sm text-green-600 font-medium">✅ Khách hàng đã xác thực</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Số điện thoại:</span>
                        <span className="font-medium">{booking.customer.phone || 'Chưa cập nhật'}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Trạng thái:</span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                          Hoạt động
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">📞 Hành động</h3>
                  <div className="space-y-3">
                    <button 
                      onClick={() => window.open(`tel:${booking.customer.phone}`, '_self')}
                      className="w-full flex items-center justify-center space-x-3 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg transition-all transform hover:scale-105"
                    >
                      <i className="fas fa-phone"></i>
                      <span>Gọi điện</span>
                      <span className="text-xs opacity-75">({booking.customer.phone})</span>
                    </button>
                    <button 
                      onClick={() => window.open(`mailto:${booking.customer.email}?subject=Thông tin đặt sân ${booking.booking.bookingCode}`, '_blank')}
                      className="w-full flex items-center justify-center space-x-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-all transform hover:scale-105"
                    >
                      <i className="fas fa-envelope"></i>
                      <span>Gửi email</span>
                      <span className="text-xs opacity-75">({booking.customer.email})</span>
                    </button>
                    <button 
                      onClick={() => window.open(`sms:${booking.customer.phone}?body=Xin chào ${booking.customer.name}, thông tin đặt sân của bạn...`, '_self')}
                      className="w-full flex items-center justify-center space-x-3 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg transition-all transform hover:scale-105"
                    >
                      <i className="fas fa-comment"></i>
                      <span>Nhắn tin</span>
                      <span className="text-xs opacity-75">SMS</span>
                    </button>
                  </div>

                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Lịch sử thay đổi</h3>
                <div className="space-y-4">
                  {booking.history.map((item, index) => (
                    <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900">{item.action}</span>
                          <span className="text-sm text-gray-500">{item.date}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">Bởi: {item.by}</p>
                        {item.note && (
                          <p className="text-sm text-gray-500 italic">{item.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Cập nhật trạng thái thành "{getStatusText(newStatus)}"
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ghi chú (tùy chọn)
              </label>
              <textarea
                value={statusUpdateNote}
                onChange={(e) => setStatusUpdateNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Nhập ghi chú về việc thay đổi trạng thái..."
              />
            </div>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
              >
                Hủy
              </button>
              <button
                onClick={confirmStatusUpdate}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingDetailPage;
