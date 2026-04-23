import React, { useState } from 'react';
import { Download, FileText, Table } from 'lucide-react';
import { Button } from '../ui/button';
import { formatCurrencyValue } from '../../utils/shared/currencyUtils';
import { Booking } from '../../types/booking';
import { getStatusText } from '../../utils/shared/bookingStatusUtils';

interface BookingExportProps {
  bookings: Booking[];
}

export function BookingExport({ bookings }: BookingExportProps) {
  const [exporting, setExporting] = useState(false);

  const exportToCSV = () => {
    setExporting(true);
    
    try {
      // Create CSV headers
      const headers = [
        'Mã đặt sân',
        'Ngày đặt',
        'Tên sân',
        'Loại sân',
        'Số sân',
        'Địa điểm',
        'Khung giờ',
        'Trạng thái',
        'Tổng tiền',
        'Ngày tạo',
        'Phương thức thanh toán'
      ];

      // Create CSV data
      const csvData = bookings.map(booking => [
        booking.id,
        booking.date,
        booking.fieldName,
        booking.fieldType,
        booking.fieldNumber,
        booking.fieldLocation,
        booking.timeSlot,
        getStatusText(booking.status),
        formatCurrencyValue(booking.totalPrice),
        booking.bookingDate,
        booking.paymentMethod
      ]);

      // Combine headers and data
      const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      // Add BOM for UTF-8
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Create download link
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `lich-su-dat-san-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Có lỗi xảy ra khi xuất file. Vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = () => {
    // For now, show a simple alert. In a real app, you would use a PDF library like jsPDF
    alert('Tính năng xuất PDF sẽ được phát triển trong phiên bản tiếp theo!');
  };

  if (bookings.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-gray-500" />
          <div>
            <h3 className="font-medium text-gray-800">Xuất dữ liệu</h3>
            <p className="text-sm text-gray-600">Tải xuống lịch sử đặt sân ({bookings.length} mục)</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={exporting}
            className="flex items-center gap-2"
          >
            <Table className="w-4 h-4" />
            {exporting ? 'Đang xuất...' : 'Xuất Excel'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={exportToPDF}
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Xuất PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
