import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { timeslotService, SubFieldInfo } from '../../../services/timeslotService';

interface PeakHourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  fieldId: string;
  subFields: SubFieldInfo[];
  currentPricingRules?: any[];
}

const PeakHourModal: React.FC<PeakHourModalProps> = ({
  isOpen,
  onClose,
  onSave,
  subFields,
  fieldId,
  currentPricingRules = []
}) => {
  const [startTime, setStartTime] = useState('17:00');
  const [endTime, setEndTime] = useState('22:00');
  const [peakHourMultiplier, setPeakHourMultiplier] = useState(1.5);
  const [isLoading, setIsLoading] = useState(false);
  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      // Load existing peak hour rule if available
      const peakRule = currentPricingRules.find(rule => rule.multiplier > 1.0);
      if (peakRule) {
        setStartTime(`${peakRule.from_hour.toString().padStart(2, '0')}:00`);
        setEndTime(`${peakRule.to_hour.toString().padStart(2, '0')}:00`);
        setPeakHourMultiplier(peakRule.multiplier);
      } else {
        setStartTime('17:00');
        setEndTime('22:00');
        setPeakHourMultiplier(1.5);
      }
    }
  }, [isOpen, currentPricingRules]);
  const handleSubFieldToggle = (subFieldId: string) => {
    // This function is no longer needed since we apply to entire field
  };

  const handleSelectAll = () => {
    // This function is no longer needed
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();    if (peakHourMultiplier < 1 || peakHourMultiplier > 5) {
      toast.error('Hệ số peak hour phải từ 1.0 đến 5.0');
      return;
    }

    const startHour = parseInt(startTime.split(':')[0]);
    const endHour = parseInt(endTime.split(':')[0]);
    
    if (startHour >= endHour) {
      toast.error('Giờ bắt đầu phải nhỏ hơn giờ kết thúc');
      return;
    }setIsLoading(true);
    
    try {
      // Create pricing rules for the main field
      const startHour = parseInt(startTime.split(':')[0]);
      const endHour = parseInt(endTime.split(':')[0]);
      
      const rules = [{
        from_hour: startHour,
        to_hour: endHour,
        multiplier: peakHourMultiplier
      }];

      await timeslotService.bulkCreatePricingRules(fieldId, rules);

      toast.success(
        `Đã cập nhật hệ số peak hour ${peakHourMultiplier}x trong khoảng ${startTime} - ${endTime}`
      );onSave();
      onClose();
    } catch (error: any) {
      console.error('Error updating peak hour:', error);
      toast.error(error.message || 'Lỗi cập nhật hệ số peak hour');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">          <h2 className="text-xl font-bold text-gray-800">
            Cài đặt giờ cao điểm - Sân {fieldId}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            disabled={isLoading}
          >
            ×
          </button>
        </div>        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Time Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Khoảng thời gian cao điểm
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Giờ bắt đầu</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Giờ kết thúc</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  min={startTime}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Peak Hour Multiplier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hệ số giờ cao điểm <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="1"
                max="5"
                step="0.1"
                value={peakHourMultiplier}
                onChange={(e) => setPeakHourMultiplier(parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-lg font-semibold text-blue-600 min-w-[60px]">
                {peakHourMultiplier}x
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Giá sẽ được nhân với {peakHourMultiplier} trong khung giờ cao điểm
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Xem trước cài đặt:</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div>• Thời gian: {startTime} - {endTime}</div>
              <div>• Áp dụng: Toàn bộ sân {fieldId}</div>
              <div>• Hệ số: {peakHourMultiplier}x</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Đang cập nhật...' : 'Cập nhật'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PeakHourModal;
