import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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

export const generateBookingReceiptPDFFromHTML = async (data: BookingReceiptData): Promise<void> => {
  try {
    // Create HTML content for the receipt
    const receiptHTML = `
      <div id="receipt-content" style="width: 794px; padding: 40px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: white;">
        <!-- Header -->
        <div style="background: #22c55e; color: white; padding: 20px; margin: -40px -40px 30px -40px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold;">HÓA ĐƠN ĐẶT SÂN</h1>
          <p style="margin: 5px 0 0 0; font-size: 12px;">SportFields - Hệ thống đặt sân thể thao</p>
        </div>

        <!-- Booking Info -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div>
            <strong>Mã đặt sân:</strong> ${data.bookingId}
          </div>
          <div>
            <strong>Ngày xuất:</strong> ${new Date().toLocaleDateString('vi-VN')}
          </div>
        </div>

        <!-- Customer Info -->
        <div style="background: #f9fafb; padding: 20px; margin-bottom: 20px; border-radius: 8px;">
          <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 16px;">THÔNG TIN KHÁCH HÀNG</h3>
          <p style="margin: 5px 0;"><strong>Họ tên:</strong> ${data.customerName}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${data.customerEmail}</p>
        </div>

        <!-- Field Info -->
        <div style="background: #f9fafb; padding: 20px; margin-bottom: 20px; border-radius: 8px;">
          <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 16px;">THÔNG TIN SÂN BÓNG</h3>
          <p style="margin: 5px 0;"><strong>Tên sân:</strong> ${data.fieldName}</p>
          <p style="margin: 5px 0;"><strong>Địa chỉ:</strong> ${data.fieldLocation}</p>
          <p style="margin: 5px 0;"><strong>Ngày đặt:</strong> ${data.date}</p>
        </div>

        <!-- Booking Details -->
        <div style="margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 16px;">CHI TIẾT ĐẶT SÂN</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
            <thead>
              <tr style="background: #22c55e; color: white;">
                <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Sân</th>
                <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Loại sân</th>
                <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Khung giờ</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">SL</th>
              </tr>
            </thead>
            <tbody>
              ${data.slots.map((slot, index) => `
                <tr style="background: ${index % 2 === 0 ? '#f9fafb' : 'white'};">
                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${slot.subfieldName}</td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${slot.fieldType}</td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${slot.timeRanges.join(', ')}</td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${slot.count}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Payment Info -->
        <div style="background: #f9fafb; padding: 20px; margin-bottom: 30px; border-radius: 8px;">
          <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 16px;">THÔNG TIN THANH TOÁN</h3>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <p style="margin: 5px 0;"><strong>Tổng tiền:</strong> <span style="color: #22c55e; font-size: 18px; font-weight: bold;">${formatCurrencyValue(data.totalAmount)}</span></p>
            </div>
            <div>
              <p style="margin: 5px 0;"><strong>Trạng thái:</strong> 
                <span style="color: ${data.paymentStatus === 'paid' || data.paymentStatus === 'confirmed' ? '#22c55e' : '#f59e0b'}; font-weight: bold;">
                  ${data.paymentStatus === 'paid' || data.paymentStatus === 'confirmed' ? 'Đã thanh toán' : 'Chờ thanh toán'}
                </span>
              </p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          <p>Cảm ơn bạn đã sử dụng dịch vụ của SportFields!</p>
          <p>Thời gian đặt: ${data.bookedAt}</p>
          <p>Hotline hỗ trợ: 0123-456-789</p>
        </div>
      </div>
    `;

    // Create a temporary div to hold the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = receiptHTML;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    document.body.appendChild(tempDiv);

    // Get the content element
    const contentElement = tempDiv.querySelector('#receipt-content') as HTMLElement;

    if (!contentElement) {
      throw new Error('Could not create receipt content');
    }

    // Convert HTML to canvas
    const canvas = await html2canvas(contentElement, {
      scale: 2, // Higher resolution
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    // Remove temporary div
    document.body.removeChild(tempDiv);

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Calculate dimensions to fit the page
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Add image to PDF
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 16).replace(/:/g, '-');
    const filename = `HoaDon_${data.bookingId}_${timestamp}.pdf`;

    // Download the PDF
    pdf.save(filename);

  } catch (error) {
    console.error('Error generating PDF from HTML:', error);
    throw new Error('Không thể tạo file PDF. Vui lòng thử lại!');
  }
};

// Export both functions for flexibility
export { generateBookingReceiptPDFFromHTML as generateBookingReceiptPDF };
