import React, { useState, useEffect } from "react";
import {
  X,
  AlertTriangle,
  Clock,
  FileText,
  Calendar,
  Settings,
} from "lucide-react";

interface AdvancedMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: MaintenanceData) => Promise<void>;
  subFields: Array<{
    id: string;
    name: string;
    pricePerHour?: number;
  }>;
  fieldId: string;
  currentDate: Date;
  timeSlots: string[];
  isLoading?: boolean;
}

export interface MaintenanceData {
  type: "time-slot" | "full-day";
  subFieldIds: string[];
  date: string;
  reason: string;
  estimatedCompletion?: string;
  timeSlots?: {
    startTime: string;
    endTime: string;
  }[];
}

const AdvancedMaintenanceModal: React.FC<AdvancedMaintenanceModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  subFields,
  fieldId,
  currentDate,
  timeSlots,
  isLoading = false,
}) => {
  const [maintenanceType, setMaintenanceType] = useState<
    "time-slot" | "full-day"
  >("time-slot");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [reason, setReason] = useState("");
  const [estimatedCompletion, setEstimatedCompletion] = useState("");
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<
    {
      startTime: string;
      endTime: string;
    }[]
  >([]);
  const [errors, setErrors] = useState<{
    fields?: string;
    date?: string;
    reason?: string;
    timeSlots?: string;
  }>({});

  // Initialize with current date
  useEffect(() => {
    if (isOpen) {
      const dateStr = currentDate.toISOString().split("T")[0];
      setSelectedDate(dateStr);
      // Auto-select all fields by default
      setSelectedFields(subFields.map((field) => field.id));
    }
  }, [isOpen, currentDate, subFields]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: typeof errors = {};
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const selectedDateObj = new Date(selectedDate);
    const selectedDateNormalized = new Date(
      selectedDateObj.getFullYear(),
      selectedDateObj.getMonth(),
      selectedDateObj.getDate()
    );

    if (selectedFields.length === 0) {
      newErrors.fields = "Vui lòng chọn ít nhất một sân";
    }

    if (!selectedDate) {
      newErrors.date = "Vui lòng chọn ngày bảo trì";
    } else {
      if (selectedDateNormalized < today) {
        newErrors.date = "Không thể đặt bảo trì cho ngày trong quá khứ";
      }
    }

    if (!reason || reason.trim().length < 5) {
      newErrors.reason = "Lý do bảo trì phải có ít nhất 5 ký tự";
    }

    if (maintenanceType === "time-slot" && selectedTimeSlots.length === 0) {
      newErrors.timeSlots = "Vui lòng chọn ít nhất một khung giờ";
    } else if (maintenanceType === "time-slot" && selectedDate) {
      // Check if selected date is today, then validate time slots
      const isToday = selectedDateNormalized.getTime() === today.getTime();

      if (isToday) {
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTotalMinutes = currentHour * 60 + currentMinute;

        const invalidTimeSlots = selectedTimeSlots.filter((slot) => {
          const startHour = parseInt(slot.startTime.split(":")[0]);
          const startMinute = parseInt(slot.startTime.split(":")[1]);
          const slotTotalMinutes = startHour * 60 + startMinute;

          return slotTotalMinutes < currentTotalMinutes;
        });

        if (invalidTimeSlots.length > 0) {
          const invalidTimes = invalidTimeSlots
            .map((slot) => slot.startTime)
            .join(", ");
          newErrors.timeSlots = `Không thể đặt bảo trì cho khung giờ đã qua: ${invalidTimes}. Hiện tại: ${currentHour}:${currentMinute
            .toString()
            .padStart(2, "0")}`;
        }
      }
    }

    // Additional validation: Check if all selected time slots are in the past
    if (
      maintenanceType === "time-slot" &&
      selectedDate &&
      selectedTimeSlots.length > 0
    ) {
      const isToday = selectedDateNormalized.getTime() === today.getTime();

      if (isToday) {
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTotalMinutes = currentHour * 60 + currentMinute;

        const allSlotsInPast = selectedTimeSlots.every((slot) => {
          const startHour = parseInt(slot.startTime.split(":")[0]);
          const startMinute = parseInt(slot.startTime.split(":")[1]);
          const slotTotalMinutes = startHour * 60 + startMinute;
          return slotTotalMinutes < currentTotalMinutes;
        });

        if (allSlotsInPast) {
          newErrors.timeSlots =
            "Tất cả khung giờ đã chọn đều đã qua. Vui lòng chọn khung giờ trong tương lai.";
        }
      }

      // Validate time slot logic: startTime must be before endTime
      const invalidTimeRanges = selectedTimeSlots.filter((slot) => {
        const startHour = parseInt(slot.startTime.split(":")[0]);
        const startMinute = parseInt(slot.startTime.split(":")[1]);
        const endHour = parseInt(slot.endTime.split(":")[0]);
        const endMinute = parseInt(slot.endTime.split(":")[1]);

        const startTotalMinutes = startHour * 60 + startMinute;
        const endTotalMinutes = endHour * 60 + endMinute;

        return startTotalMinutes >= endTotalMinutes;
      });

      if (invalidTimeRanges.length > 0) {
        const invalidRanges = invalidTimeRanges
          .map((slot) => `${slot.startTime}-${slot.endTime}`)
          .join(", ");
        newErrors.timeSlots = `Thời gian "Từ" phải nhỏ hơn thời gian "Đến": ${invalidRanges}`;
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    const maintenanceData: MaintenanceData = {
      type: maintenanceType,
      subFieldIds: selectedFields,
      date: selectedDate,
      reason: reason.trim(),
      estimatedCompletion: estimatedCompletion || undefined,
      timeSlots:
        maintenanceType === "time-slot" ? selectedTimeSlots : undefined,
    };

    try {
      await onConfirm(maintenanceData);
      handleClose();
    } catch (error) {
      console.error("Error in advanced maintenance modal:", error);
    }
  };

  const handleClose = () => {
    setMaintenanceType("time-slot");
    setSelectedFields([]);
    setSelectedDate("");
    setReason("");
    setEstimatedCompletion("");
    setSelectedTimeSlots([]);
    setErrors({});
    onClose();
  };

  const toggleField = (fieldId: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldId)
        ? prev.filter((id) => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const addTimeSlot = () => {
    setSelectedTimeSlots((prev) => [
      ...prev,
      { startTime: "09:00", endTime: "10:00" },
    ]);
  };

  const removeTimeSlot = (index: number) => {
    setSelectedTimeSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTimeSlot = (
    index: number,
    field: "startTime" | "endTime",
    value: string
  ) => {
    setSelectedTimeSlots((prev) =>
      prev.map((slot, i) => {
        if (i === index) {
          const updatedSlot = { ...slot, [field]: value };

          // Validate that startTime < endTime
          const startHour = parseInt(updatedSlot.startTime.split(":")[0]);
          const startMinute = parseInt(updatedSlot.startTime.split(":")[1]);
          const endHour = parseInt(updatedSlot.endTime.split(":")[0]);
          const endMinute = parseInt(updatedSlot.endTime.split(":")[1]);

          const startTotalMinutes = startHour * 60 + startMinute;
          const endTotalMinutes = endHour * 60 + endMinute;

          if (startTotalMinutes >= endTotalMinutes) {
            console.warn(
              "⚠️ Invalid time slot: start time must be before end time",
              updatedSlot
            );
            // You could show a toast here or set an error state
          }

          return updatedSlot;
        }
        return slot;
      })
    );
  };

  const selectAllTimeSlots = () => {
    const allSlots = [];
    for (let i = 0; i < timeSlots.length; i++) {
      const startTime = timeSlots[i];
      const endTime = timeSlots[i + 1] || "23:00";
      allSlots.push({ startTime, endTime });
    }
    setSelectedTimeSlots(allSlots);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-orange-50 to-red-50 border-b border-orange-100 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-full shadow-sm">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  Cài đặt bảo trì nâng cao
                  <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
                    QUAN TRỌNG
                  </span>
                </h3>
                <p className="text-sm text-gray-600">
                  Đặt bảo trì theo khung giờ hoặc cả ngày - Sẽ tạm dừng booking
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
          {/* Maintenance Type Selection */}
          <div className="mb-6">
            <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
              <AlertTriangle className="w-4 h-4 text-orange-600 mr-1" />
              Loại bảo trì <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setMaintenanceType("time-slot")}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  maintenanceType === "time-slot"
                    ? "border-orange-500 bg-orange-50 shadow-md"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <span className="font-medium">Theo khung giờ</span>
                  {maintenanceType === "time-slot" && (
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Bảo trì trong các khung giờ cụ thể
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMaintenanceType("full-day")}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  maintenanceType === "full-day"
                    ? "border-orange-500 bg-orange-50 shadow-md"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="w-5 h-5 text-orange-600" />
                  <span className="font-medium">Cả ngày</span>
                  {maintenanceType === "full-day" && (
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  )}
                </div>
                <p className="text-sm text-gray-600">Bảo trì toàn bộ ngày</p>
              </button>
            </div>
            {maintenanceType === "full-day" && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="ml-2">
                    <p className="text-sm text-red-800 font-medium">
                      Cảnh báo: Bảo trì cả ngày
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      Tất cả các booking trong ngày sẽ bị hủy và không thể đặt booking mới
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Date Selection */}
          <div className="mb-6">
            <label
              htmlFor="maintenance-date"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              <Calendar className="w-4 h-4 inline mr-1" />
              Ngày bảo trì <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="maintenance-date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                errors.date ? "border-red-500" : "border-gray-300"
              }`}
              disabled={isLoading}
              min={new Date().toISOString().split("T")[0]}
            />
            {errors.date && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center">
                  <AlertTriangle className="w-4 h-4 text-red-600 mr-2 flex-shrink-0" />
                  <p className="text-sm text-red-600">{errors.date}</p>
                </div>
              </div>
            )}
          </div>

          {/* Field Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Chọn sân <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="select-all-fields"
                  checked={selectedFields.length === subFields.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedFields(subFields.map((field) => field.id));
                    } else {
                      setSelectedFields([]);
                    }
                  }}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  disabled={isLoading}
                />
                <label
                  htmlFor="select-all-fields"
                  className="text-sm font-medium text-gray-700"
                >
                  Chọn tất cả
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-lg p-3">
                {subFields.map((field) => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`field-${field.id}`}
                      checked={selectedFields.includes(field.id)}
                      onChange={() => toggleField(field.id)}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      disabled={isLoading}
                    />
                    <label
                      htmlFor={`field-${field.id}`}
                      className="text-sm text-gray-700"
                    >
                      {field.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            {errors.fields && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center">
                  <AlertTriangle className="w-4 h-4 text-red-600 mr-2 flex-shrink-0" />
                  <p className="text-sm text-red-600">{errors.fields}</p>
                </div>
              </div>
            )}
          </div>

          {/* Time Slots Selection (only for time-slot type) */}
          {maintenanceType === "time-slot" && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Chọn khung giờ <span className="text-red-500">*</span>
                </label>
                <div className="space-x-2">
                  <button
                    type="button"
                    onClick={selectAllTimeSlots}
                    className="text-sm text-orange-600 hover:text-orange-700"
                    disabled={isLoading}
                  >
                    Chọn tất cả
                  </button>
                  <button
                    type="button"
                    onClick={addTimeSlot}
                    className="text-sm bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700"
                    disabled={isLoading}
                  >
                    + Thêm khung giờ
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-48 overflow-y-auto border rounded-lg p-3">
                {selectedTimeSlots.length > 0 && (
                  <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-800">
                          Đã chọn {selectedTimeSlots.length} khung giờ bảo trì
                        </p>
                        <p className="text-amber-700 mt-1">
                          Tất cả booking trong các khung giờ này sẽ bị hủy và gửi thông báo cho khách hàng
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {selectedTimeSlots.map((slot, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg"
                  >
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">
                        Từ
                      </label>
                      <select
                        value={slot.startTime}
                        onChange={(e) =>
                          updateTimeSlot(index, "startTime", e.target.value)
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                        disabled={isLoading}
                      >
                        {timeSlots.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">
                        Đến
                      </label>
                      <select
                        value={slot.endTime}
                        onChange={(e) =>
                          updateTimeSlot(index, "endTime", e.target.value)
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                        disabled={isLoading}
                      >
                        {timeSlots.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                        <option value="23:00">23:00</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeTimeSlot(index)}
                      className="text-red-500 hover:text-red-700 p-1"
                      disabled={isLoading}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {selectedTimeSlots.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="flex flex-col items-center space-y-2">
                      <Clock className="w-8 h-8 text-gray-400" />
                      <p className="font-medium">Chưa có khung giờ nào được chọn</p>
                      <p className="text-sm">Nhấn "Thêm khung giờ" để bắt đầu</p>
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-center">
                          <AlertTriangle className="w-4 h-4 text-blue-600 mr-2" />
                          <p className="text-xs text-blue-800">
                            Cần chọn ít nhất 1 khung giờ để tiếp tục
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {errors.timeSlots && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-start">
                    <AlertTriangle className="w-4 h-4 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600">{errors.timeSlots}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Maintenance Reason */}
          <div className="mb-4">
            <label
              htmlFor="maintenance-reason"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              <FileText className="w-4 h-4 inline mr-1" />
              Lý do bảo trì <span className="text-red-500">*</span>
            </label>
            <textarea
              id="maintenance-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none ${
                errors.reason ? "border-red-500" : "border-gray-300"
              }`}
              rows={3}
              placeholder="Nhập lý do bảo trì (ví dụ: Sửa chữa cỏ nhân tạo, Bảo trì hệ thống tưới, Thay mới thiết bị...)"
              disabled={isLoading}
              maxLength={500}
            />
            {errors.reason && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center">
                  <AlertTriangle className="w-4 h-4 text-red-600 mr-2 flex-shrink-0" />
                  <p className="text-sm text-red-600">{errors.reason}</p>
                </div>
              </div>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {reason.length}/500 ký tự
            </p>
          </div>

          {/* Estimated Completion */}
          <div className="mb-6">
            <label
              htmlFor="maintenance-completion"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              <Clock className="w-4 h-4 inline mr-1" />
              Thời gian dự kiến hoàn thành (không bắt buộc)
            </label>
            <input
              type="datetime-local"
              id="maintenance-completion"
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

          {/* Summary */}
          <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-400 rounded-r-lg">
            <div className="flex items-center mb-2">
              <AlertTriangle className="w-5 h-5 text-orange-600 mr-2" />
              <h4 className="font-medium text-orange-900">
                Tóm tắt bảo trì - Xác nhận thông tin
              </h4>
            </div>
            <div className="space-y-1 text-sm text-orange-800">
              <p>
                <strong>Loại:</strong>{" "}
                {maintenanceType === "full-day"
                  ? "Bảo trì cả ngày"
                  : "Bảo trì theo khung giờ"}
                {maintenanceType === "full-day" && (
                  <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                    NGUY HIỂM
                  </span>
                )}
              </p>
              <p>
                <strong>Ngày:</strong>{" "}
                {selectedDate
                  ? new Date(selectedDate).toLocaleDateString("vi-VN")
                  : "Chưa chọn"}
              </p>
              <p>
                <strong>Số sân:</strong> {selectedFields.length} sân
              </p>
              {maintenanceType === "time-slot" && (
                <p>
                  <strong>Số khung giờ:</strong> {selectedTimeSlots.length}{" "}
                  khung
                </p>
              )}
              {(selectedFields.length > 0 || selectedTimeSlots.length > 0) && (
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-xs text-yellow-800 font-medium">
                    ⚠️ Ước tính booking bị ảnh hưởng: {selectedFields.length} sân × {maintenanceType === "time-slot" ? selectedTimeSlots.length : 24} khung giờ
                  </p>
                </div>
              )}
            </div>
          </div>

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
              className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg font-medium hover:from-orange-700 hover:to-red-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang xử lý...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Xác nhận bảo trì</span>
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdvancedMaintenanceModal;
