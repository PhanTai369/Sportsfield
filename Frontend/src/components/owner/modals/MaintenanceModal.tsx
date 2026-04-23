import React, { useState } from "react";
import { X, AlertTriangle, Clock, FileText } from "lucide-react";

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, estimatedCompletion?: string) => Promise<void>;
  timeSlot: {
    time: string;
    endTime: string;
    fieldName: string;
    date: string;
    slotId?: string | null;
    fieldId?: string;
    currentStatus?: "available" | "maintenance" | "past";
  } | null;
  currentStatus?: "available" | "maintenance" | "past";
  isLoading?: boolean;
}

const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  timeSlot,
  currentStatus = "available",
  isLoading = false,
}) => {
  const [reason, setReason] = useState("");
  const [estimatedCompletion, setEstimatedCompletion] = useState("");
  const [errors, setErrors] = useState<{ reason?: string; timeSlot?: string }>(
    {}
  );

  const isSettingMaintenance = currentStatus === "available";
  const isPastSlot = currentStatus === "past";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: { reason?: string; timeSlot?: string } = {};

    // Don't allow maintenance operations on past slots
    if (isPastSlot) {
      newErrors.timeSlot = "Không thể đặt bảo trì cho khung giờ đã qua";
    }
    // Check if trying to set maintenance for past time slot
    else if (isSettingMaintenance && timeSlot) {
      const now = new Date();
      const slotDate = new Date(timeSlot.date);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const slotDateNormalized = new Date(
        slotDate.getFullYear(),
        slotDate.getMonth(),
        slotDate.getDate()
      );

      // Check if date is in the past
      if (slotDateNormalized < today) {
        newErrors.timeSlot = "Không thể đặt bảo trì cho ngày trong quá khứ";
      }
      // If it's today, check if the time slot has passed
      else if (slotDateNormalized.getTime() === today.getTime()) {
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const slotHour = parseInt(timeSlot.time.split(":")[0]);
        const slotMinute = parseInt(timeSlot.time.split(":")[1]);

        const currentTotalMinutes = currentHour * 60 + currentMinute;
        const slotTotalMinutes = slotHour * 60 + slotMinute;

        if (slotTotalMinutes < currentTotalMinutes) {
          newErrors.timeSlot = `Không thể đặt bảo trì cho khung giờ đã qua (${
            timeSlot.time
          }). Hiện tại: ${currentHour}:${currentMinute
            .toString()
            .padStart(2, "0")}`;
        }
      }
    }

    if (isSettingMaintenance && (!reason || reason.trim().length === 0)) {
      newErrors.reason = "Vui lòng nhập lý do bảo trì";
    }

    if (reason && reason.trim().length < 5) {
      newErrors.reason = "Lý do bảo trì phải có ít nhất 5 ký tự";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    try {
      await onConfirm(reason.trim(), estimatedCompletion || undefined);
      handleClose();
    } catch (error) {
      console.error("Error in maintenance modal:", error);
    }
  };

  const handleClose = () => {
    setReason("");
    setEstimatedCompletion("");
    setErrors({});
    onClose();
  };

  if (!isOpen || !timeSlot) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div
          className={`p-6 rounded-t-xl ${
            isSettingMaintenance
              ? "bg-orange-50 border-b border-orange-100"
              : "bg-green-50 border-b border-green-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`p-2 rounded-full ${
                  isSettingMaintenance ? "bg-orange-100" : "bg-green-100"
                }`}
              >
                {isSettingMaintenance ? (
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                ) : (
                  <Clock className="w-5 h-5 text-green-600" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {isSettingMaintenance ? "Đặt bảo trì" : "Hủy bảo trì"}
                </h3>
                <p className="text-sm text-gray-600">
                  {isSettingMaintenance
                    ? "Đặt khung giờ vào trạng thái bảo trì"
                    : "Hủy trạng thái bảo trì"}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isLoading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Time Slot Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">
              Thông tin khung giờ
            </h4>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Sân:</span>
                <span className="font-medium">{timeSlot.fieldName}</span>
              </div>
              <div className="flex justify-between">
                <span>Ngày:</span>
                <span className="font-medium">
                  {new Date(timeSlot.date).toLocaleDateString("vi-VN")}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Thời gian:</span>
                <span className="font-medium">
                  {timeSlot.time} - {timeSlot.endTime}
                </span>
              </div>
            </div>
            {errors.timeSlot && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  {errors.timeSlot}
                </p>
              </div>
            )}
          </div>

          {/* Maintenance Reason (only when setting maintenance) */}
          {isSettingMaintenance && (
            <div className="mb-4">
              <label
                htmlFor="reason"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                <FileText className="w-4 h-4 inline mr-1" />
                Lý do bảo trì <span className="text-red-500">*</span>
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none ${
                  errors.reason ? "border-red-500" : "border-gray-300"
                }`}
                rows={3}
                placeholder="Nhập lý do bảo trì (ví dụ: Sửa chữa cỏ nhân tạo, Bảo trì hệ thống tưới...)"
                disabled={isLoading}
                maxLength={500}
              />
              {errors.reason && (
                <p className="mt-1 text-sm text-red-600">{errors.reason}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {reason.length}/500 ký tự
              </p>
            </div>
          )}

          {/* Estimated Completion (optional) */}
          {isSettingMaintenance && (
            <div className="mb-6">
              <label
                htmlFor="completion"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                <Clock className="w-4 h-4 inline mr-1" />
                Thời gian dự kiến hoàn thành (không bắt buộc)
              </label>
              <input
                type="datetime-local"
                id="completion"
                value={estimatedCompletion}
                onChange={(e) => setEstimatedCompletion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                disabled={isLoading}
                min={new Date().toISOString().slice(0, 16)}
              />
              <p className="mt-1 text-xs text-gray-500">
                Giúp khách hàng biết khi nào sân sẽ sẵn sàng trở lại
              </p>
            </div>
          )}

          {/* Warning for removing maintenance */}
          {!isSettingMaintenance && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <Clock className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900">
                    Xác nhận hủy bảo trì
                  </h4>
                  <p className="text-sm text-green-700 mt-1">
                    Khung giờ này sẽ trở lại trạng thái có thể đặt và khách hàng
                    có thể đặt lịch ngay lập tức.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors disabled:opacity-50 ${
                isSettingMaintenance
                  ? "bg-orange-600 hover:bg-orange-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang xử lý...</span>
                </div>
              ) : isSettingMaintenance ? (
                "Đặt bảo trì"
              ) : (
                "Hủy bảo trì"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaintenanceModal;
