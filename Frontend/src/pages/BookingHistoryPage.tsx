import React from 'react';
import { BookingHistory } from '../components/booking/BookingHistory';
import Navbar from '../components/home/navbar';
import Footer from '../components/home/footer';
import { generateBookingReceiptPDF } from '../utils/pdfGeneratorHTML';
import { showToast } from '../utils/toast';
import { bookingHistoryService } from '../services/bookingHistoryService';

export default function BookingHistoryPage() {
  const handleDownloadReceipt = async (bookingId: string) => {
    try {
      // Get detailed booking information
      const bookingDetails = await bookingHistoryService.getBookingDetails(bookingId);
      
      if (!bookingDetails) {
        showToast.error('Không thể tải thông tin đặt sân. Vui lòng thử lại!');
        return;
      }

      // Prepare data for PDF generation
      const pdfData = {
        bookingId: bookingDetails.id,
        fieldName: bookingDetails.fieldName || 'Tên sân không có',
        fieldLocation: bookingDetails.fieldLocation || 'Địa chỉ không có',
        customerName: bookingDetails.customerInfo?.fullName || 'Không có tên',
        customerEmail: bookingDetails.customerInfo?.email || 'Không có email',
        date: bookingDetails.date,
        slots: [{ // Simplified slot data for history
          subfieldName: 'Sân chính',
          fieldType: 'Sân bóng đá',
          timeRanges: bookingDetails.slots || [],
          count: bookingDetails.slots?.length || 1
        }],
        totalAmount: bookingDetails.totalAmount || 0,
        paymentStatus: bookingDetails.paymentStatus || 'pending',
        bookedAt: bookingDetails.createdAt || new Date().toLocaleString('vi-VN')
      };

      // Generate and download PDF
      await generateBookingReceiptPDF(pdfData);
      
      // Show success message
      showToast.success('Hóa đơn PDF đã được tải xuống thành công!');
      
    } catch (error) {
      console.error('Error generating receipt PDF:', error);
      showToast.error('Có lỗi xảy ra khi tạo hóa đơn PDF. Vui lòng thử lại!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <Navbar />
      
      {/* Main content */}
      <main className="flex-1 pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <BookingHistory
            onDownloadReceipt={handleDownloadReceipt}
          />
        </div>
      </main>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
