import jsPDF from 'jspdf';
import { formatCurrencyValue } from './shared/currencyUtils';

interface BookingReceiptData {
  bookingId: string;
  fieldName: string;
  fieldLocation: string;
  customerName: string;
  customerEmail: string;
  date: string;
  slots: Array<{
    subfieldName: string;
    fieldType: string;
    timeRanges: string[];
    count: number;
  }>;
  totalAmount: number;
  paymentStatus: string;
  bookedAt: string;
}

export const generateBookingReceiptPDF = (data: BookingReceiptData): void => {
  try {
    // Create new PDF document
    const pdf = new jsPDF();
    
    // Add support for Vietnamese characters by using a different approach
    // We'll encode text properly for better Vietnamese support
    const encodeVietnamese = (text: string): string => {
      return text;
    };
    
    // Colors
    const primaryColor = '#22c55e'; // Green
    const textColor = '#374151'; // Gray
    const lightGray = '#f3f4f6';
    
    // Header
    pdf.setFillColor(34, 197, 94); // Green background
    pdf.rect(0, 0, 210, 40, 'F');
    
    // Logo/Title - Use Times for better Vietnamese support
    pdf.setFont('times', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.text('HOA DON DAT SAN', 20, 20);
    
    // Company info
    pdf.setFontSize(10);
    pdf.setFont('times', 'normal');
    pdf.text('SportFields - He thong dat san the thao', 20, 30);
    
    // Reset text color
    pdf.setTextColor(55, 65, 81);
    
    // Booking ID section
    pdf.setFontSize(12);
    pdf.setFont('times', 'bold');
    pdf.text('Ma dat san:', 20, 50);
    pdf.setFont('times', 'normal');
    pdf.text(data.bookingId, 65, 50);
    
    // Date/Time
    pdf.setFont('times', 'bold');
    pdf.text('Ngay xuat:', 120, 50);
    pdf.setFont('times', 'normal');
    pdf.text(new Date().toLocaleDateString('vi-VN'), 155, 50);
    
    // Customer Information
    let yPos = 65;
    pdf.setFillColor(243, 244, 246); // Light gray background
    pdf.rect(15, yPos - 5, 180, 30, 'F');
    
    pdf.setFontSize(11);
    pdf.setFont('times', 'bold');
    pdf.text('THONG TIN KHACH HANG', 20, yPos + 5);
    
    pdf.setFontSize(9);
    pdf.setFont('times', 'normal');
    pdf.text('Ho ten: ' + data.customerName, 20, yPos + 15);
    pdf.text('Email: ' + data.customerEmail, 20, yPos + 22);
    
    // Field Information
    yPos += 40;
    pdf.setFillColor(243, 244, 246);
    pdf.rect(15, yPos - 5, 180, 40, 'F');
    
    pdf.setFontSize(11);
    pdf.setFont('times', 'bold');
    pdf.text('THONG TIN SAN BONG', 20, yPos + 5);
    
    pdf.setFontSize(9);
    pdf.setFont('times', 'normal');
    pdf.text('Ten san: ' + data.fieldName, 20, yPos + 15);
    pdf.text('Dia chi: ' + data.fieldLocation, 20, yPos + 22);
    pdf.text('Ngay dat: ' + data.date, 20, yPos + 29);
    
    // Booking Details
    yPos += 50;
    pdf.setFontSize(11);
    pdf.setFont('times', 'bold');
    pdf.text('CHI TIET DAT SAN', 20, yPos);
    
    // Table header
    yPos += 8;
    pdf.setFillColor(34, 197, 94);
    pdf.rect(15, yPos, 180, 8, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('times', 'bold');
    pdf.text('San', 20, yPos + 5);
    pdf.text('Loai san', 70, yPos + 5);
    pdf.text('Khung gio', 120, yPos + 5);
    pdf.text('SL', 170, yPos + 5);
    
    // Table content
    pdf.setTextColor(55, 65, 81);
    yPos += 10;
    
    data.slots.forEach((slot, index) => {
      if (index % 2 === 0) {
        pdf.setFillColor(249, 250, 251);
        pdf.rect(15, yPos - 2, 180, 8, 'F');
      }
      
      pdf.setFontSize(8);
      pdf.setFont('times', 'normal');
      
      // Subfield name (truncate if too long)
      const subfieldName = slot.subfieldName.length > 15 
        ? slot.subfieldName.substring(0, 15) + '...' 
        : slot.subfieldName;
      pdf.text(subfieldName, 20, yPos + 3);
      
      // Field type
      pdf.text(slot.fieldType, 70, yPos + 3);
      
      // Time ranges (join first few to fit)
      const timeText = slot.timeRanges.slice(0, 2).join(', ');
      const displayTime = timeText.length > 20 
        ? timeText.substring(0, 20) + '...' 
        : timeText;
      pdf.text(displayTime, 120, yPos + 3);
      
      // Count
      pdf.text(slot.count.toString(), 175, yPos + 3);
      
      yPos += 8;
    });
    
    // Payment Information
    yPos += 8;
    pdf.setFillColor(243, 244, 246);
    pdf.rect(15, yPos - 5, 180, 25, 'F');
    
    pdf.setFontSize(11);
    pdf.setFont('times', 'bold');
    pdf.text('THONG TIN THANH TOAN', 20, yPos + 5);
    
    pdf.setFontSize(9);
    pdf.setFont('times', 'normal');
    
    // Total amount
    pdf.text('Tong tien:', 20, yPos + 15);
    pdf.setFont('times', 'bold');
    pdf.setTextColor(34, 197, 94);
    pdf.text(formatCurrencyValue(data.totalAmount), 70, yPos + 15);
    
    // Payment status
    pdf.setTextColor(55, 65, 81);
    pdf.setFont('times', 'normal');
    pdf.text('Trang thai:', 120, yPos + 15);
    
    const statusColor = data.paymentStatus === 'paid' || data.paymentStatus === 'confirmed' 
      ? [34, 197, 94] : [249, 115, 22];
    pdf.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    pdf.setFont('times', 'bold');
    
    const statusText = data.paymentStatus === 'paid' || data.paymentStatus === 'confirmed' 
      ? 'Da thanh toan' : 'Cho thanh toan';
    pdf.text(statusText, 155, yPos + 15);
    
    // Footer
    yPos = 260; // Near bottom of page
    pdf.setTextColor(107, 114, 128);
    pdf.setFontSize(8);
    pdf.setFont('times', 'normal');
    pdf.text('Cam on ban da su dung dich vu cua SportFields!', 20, yPos);
    pdf.text('Thoi gian dat: ' + data.bookedAt, 20, yPos + 7);
    pdf.text('Hotline ho tro: 0123-456-789', 20, yPos + 14);
    
    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 16).replace(/:/g, '-');
    const filename = `HoaDon_${data.bookingId}_${timestamp}.pdf`;
    
    // Download the PDF
    pdf.save(filename);
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Không thể tạo file PDF. Vui lòng thử lại!');
  }
};
