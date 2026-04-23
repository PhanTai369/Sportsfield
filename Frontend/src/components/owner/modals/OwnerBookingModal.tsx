import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Phone,
  Mail,
  Clock,
  Calendar,
  CreditCard,
  Check,
  AlertCircle,
} from "lucide-react";
import { Button } from "../../ui/button";
import { toast } from "sonner";

interface OwnerBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bookingData: OwnerBookingData) => Promise<void>;
  timeSlot: {
    time: string;
    endTime: string;
    fieldId: string;
    fieldName: string;
    date: string;
  } | null;
  fieldPrice: number;
  isLoading: boolean;
  isPeakHour?: boolean; // Add flag to indicate peak hour
}

export interface OwnerBookingData {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  paymentMethod: "cash";
  notes?: string;
  time: string;
  endTime: string;
  fieldId: string;
  fieldName: string;
  date: string;
  totalAmount: number;
  isPaidInFull: boolean;
  depositAmount?: number;
}

const OwnerBookingModal: React.FC<OwnerBookingModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  timeSlot,
  fieldPrice,
  isLoading,
  isPeakHour = false,
}) => {
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    paymentMethod: "cash" as "cash",
    notes: "",
    isPaidInFull: true,
    depositAmount: 0,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && timeSlot) {
      // Reset form when modal opens
      setFormData({
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        paymentMethod: "cash",
        notes: "",
        isPaidInFull: true,
        depositAmount: 0,
      });
      setErrors({});
    }
  }, [isOpen, timeSlot]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.customerName.trim()) {
      newErrors.customerName = "Tên khách hàng là bắt buộc";
    }

    if (!formData.customerPhone.trim()) {
      newErrors.customerPhone = "Số điện thoại là bắt buộc";
    } else if (!/^(\+84|0)[3-9]\d{8}$/.test(formData.customerPhone.trim())) {
      newErrors.customerPhone = "Số điện thoại không hợp lệ";
    }

    if (!formData.customerEmail.trim()) {
      newErrors.customerEmail = "Email là bắt buộc";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail.trim())
    ) {
      newErrors.customerEmail = "Email không hợp lệ";
    }

    if (!formData.isPaidInFull && formData.depositAmount <= 0) {
      newErrors.depositAmount = "Số tiền đặt cọc phải lớn hơn 0";
    }

    if (!formData.isPaidInFull && formData.depositAmount >= fieldPrice) {
      newErrors.depositAmount = "Số tiền đặt cọc phải nhỏ hơn tổng tiền";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !timeSlot) return;

    setIsSubmitting(true);

    try {
      const bookingData: OwnerBookingData = {
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        customerEmail: formData.customerEmail.trim(), // Sẽ được xử lý thành null trên server nếu rỗng
        paymentMethod: formData.paymentMethod,
        notes: formData.notes.trim(),
        time: timeSlot.time,
        endTime: timeSlot.endTime,
        fieldId: timeSlot.fieldId,
        fieldName: timeSlot.fieldName,
        date: timeSlot.date,
        totalAmount: Math.round(fieldPrice), // Đảm bảo là số nguyên
        isPaidInFull: formData.isPaidInFull,
        depositAmount: formData.isPaidInFull
          ? Math.round(fieldPrice)
          : Math.round(formData.depositAmount),
      };

      console.log("📋 Owner booking data being sent:", bookingData);

      await onConfirm(bookingData);
      onClose();
      toast.success("Đặt sân hộ khách hàng thành công!");
    } catch (error: any) {
      console.error("Error creating owner booking:", error);
      toast.error(error.message || "Có lỗi xảy ra khi đặt sân");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount) + " ₫";
  };

  if (!isOpen || !timeSlot) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <User className="w-5 h-5 mr-2 text-blue-600" />
              Đặt sân hộ khách hàng
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Tạo booking mới cho khách hàng trực tiếp
            </p>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-gray-600"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Booking Info */}
        <div className="p-6 bg-blue-50 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center text-sm">
              <Calendar className="w-4 h-4 mr-2 text-blue-600" />
              <span className="text-gray-600">Ngày:</span>
              <span className="ml-2 font-medium">
                {new Date(timeSlot.date).toLocaleDateString("vi-VN")}
              </span>
            </div>
            <div className="flex items-center text-sm">
              <Clock className="w-4 h-4 mr-2 text-blue-600" />
              <span className="text-gray-600">Giờ:</span>
              <span className="ml-2 font-medium">
                {timeSlot.time} - {timeSlot.endTime}
              </span>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-4 h-4 mr-2 bg-green-500 rounded"></div>
              <span className="text-gray-600">Sân:</span>
              <span className="ml-2 font-medium">{timeSlot.fieldName}</span>
            </div>
            <div className="flex items-center text-sm">
              <CreditCard className="w-4 h-4 mr-2 text-blue-600" />
              <span className="text-gray-600">Giá:</span>
              <span
                className={`ml-2 font-medium ${
                  isPeakHour ? "text-orange-600" : "text-green-600"
                }`}
              >
                {formatCurrency(fieldPrice)}
                {isPeakHour && (
                  <span className="text-xs ml-1">(Giờ cao điểm)</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Customer Info */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-4">
                Thông tin khách hàng
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên khách hàng *
                  </label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) =>
                      handleInputChange("customerName", e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.customerName ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Nhập tên khách hàng"
                    disabled={isSubmitting}
                  />
                  {errors.customerName && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.customerName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số điện thoại *
                  </label>
                  <input
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) =>
                      handleInputChange("customerPhone", e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.customerPhone
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    placeholder="Nhập số điện thoại"
                    disabled={isSubmitting}
                  />
                  {errors.customerPhone && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.customerPhone}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) =>
                    handleInputChange("customerEmail", e.target.value)
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.customerEmail ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Nhập email"
                  disabled={isSubmitting}
                />
                {errors.customerEmail && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.customerEmail}
                  </p>
                )}
              </div>
            </div>

            {/* Payment Info */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-4">
                Thông tin thanh toán
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phương thức thanh toán
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cash"
                        checked={formData.paymentMethod === "cash"}
                        onChange={(e) =>
                          handleInputChange("paymentMethod", e.target.value)
                        }
                        className="mr-2"
                        disabled={isSubmitting}
                      />
                      <span className="text-sm">Tiền mặt</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.isPaidInFull}
                      onChange={(e) =>
                        handleInputChange("isPaidInFull", e.target.checked)
                      }
                      className="rounded border-gray-300"
                      disabled={isSubmitting}
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Thanh toán toàn bộ ({formatCurrency(fieldPrice)})
                    </span>
                  </label>
                </div>

                {!formData.isPaidInFull && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Số tiền đặt cọc *
                    </label>
                    <input
                      type="number"
                      value={formData.depositAmount}
                      onChange={(e) =>
                        handleInputChange(
                          "depositAmount",
                          Number(e.target.value)
                        )
                      }
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.depositAmount
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      placeholder="Nhập số tiền đặt cọc"
                      min="0"
                      max={fieldPrice - 1}
                      disabled={isSubmitting}
                    />
                    {errors.depositAmount && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.depositAmount}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      Còn lại:{" "}
                      {formatCurrency(fieldPrice - formData.depositAmount)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ghi chú
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Ghi chú thêm (không bắt buộc)"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Đang tạo...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Tạo booking
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OwnerBookingModal;
