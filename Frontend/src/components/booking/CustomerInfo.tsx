import { useState } from 'react';
import { User, Mail, MessageSquare } from 'lucide-react';
import { Button } from '../ui/button';

interface CustomerInfoProps {
  onContinue: (customerInfo: CustomerInfo) => void;
  onBack: () => void;
}

export interface CustomerInfo {
  fullName: string;
  email: string;
  note?: string;
}

export function CustomerInfo({ onContinue, onBack }: CustomerInfoProps) {
  const [formData, setFormData] = useState<CustomerInfo>({
    fullName: '',
    email: '',
    note: ''
  });

  const [errors, setErrors] = useState<Partial<CustomerInfo>>({});

  const validateForm = () => {
    const newErrors: Partial<CustomerInfo> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Vui lòng nhập họ tên';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onContinue(formData);
    }
  };

  const handleInputChange = (field: keyof CustomerInfo, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Thông tin khách hàng</h2>
        <p className="text-gray-600">Vui lòng điền đầy đủ thông tin để hoàn tất đặt sân</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="w-4 h-4 inline mr-2" />
            Họ và tên *
          </label>
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) => handleInputChange('fullName', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
              errors.fullName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Nhập họ và tên của bạn"
          />
          {errors.fullName && (
            <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Mail className="w-4 h-4 inline mr-2" />
            Email *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Nhập địa chỉ email"
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
          )}
        </div>

        {/* Note */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MessageSquare className="w-4 h-4 inline mr-2" />
            Ghi chú (tùy chọn)
          </label>
          <textarea
            value={formData.note}
            onChange={(e) => handleInputChange('note', e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            placeholder="Thêm ghi chú về yêu cầu đặc biệt (nếu có)"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="flex-1"
          >
            Quay lại
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            Tiếp tục
          </Button>
        </div>
      </form>
    </div>
  );
}
