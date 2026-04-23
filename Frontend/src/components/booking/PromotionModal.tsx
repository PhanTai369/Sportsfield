import React, { useState, useEffect } from 'react';
import { Button } from "../ui/button";
import { X, Tag, Calendar, Percent } from "lucide-react";
import { formatCurrencyValue } from "../../utils/shared/currencyUtils";

interface Promotion {
  id: string;
  title: string;
  discount_percent: number;
  valid_from: string;
  valid_to: string;
  field_id: string;
  field: {
    id: string;
    name: string;
    price_per_hour: number;
  };
}

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  fieldId: string;
  onPromotionSelect: (promotion: Promotion) => void;
  selectedPromotion?: Promotion | null;
}

export function PromotionModal({ 
  isOpen, 
  onClose, 
  fieldId, 
  onPromotionSelect,
  selectedPromotion 
}: PromotionModalProps) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://football-field-booking-backend.onrender.com/api';

  useEffect(() => {
    if (isOpen && fieldId) {
      fetchPromotions();
    }
  }, [isOpen, fieldId]);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/promotions/field/${fieldId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setPromotions(data.data);
      } else {
        setError(data.error?.message || 'Có lỗi xảy ra khi tải ưu đãi');
      }
    } catch (error) {
      console.error('Error fetching promotions:', error);
      setError('Không thể tải danh sách ưu đãi');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handlePromotionSelect = (promotion: Promotion) => {
    onPromotionSelect(promotion);
    onClose();
  };

  const handleRemovePromotion = () => {
    onPromotionSelect(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-green-600 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Chọn ưu đãi áp dụng</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-green-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[calc(90vh-8rem)] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
              <span className="ml-2 text-gray-600">Đang tải ưu đãi...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500 mb-2">⚠️ {error}</div>
              <Button 
                onClick={fetchPromotions}
                variant="outline"
                size="sm"
              >
                Thử lại
              </Button>
            </div>
          ) : promotions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Tag className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">Không có ưu đãi nào</p>
              <p className="text-sm">Hiện tại sân này chưa có chương trình ưu đãi nào.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Current promotion info */}
              {selectedPromotion && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-green-600 font-medium mb-1">Ưu đãi đang áp dụng:</p>
                      <p className="font-semibold text-green-800">{selectedPromotion.title}</p>
                      <p className="text-sm text-green-600">Giảm {selectedPromotion.discount_percent}%</p>
                    </div>
                    <Button
                      onClick={handleRemovePromotion}
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      Bỏ ưu đãi
                    </Button>
                  </div>
                </div>
              )}

              {/* Available promotions */}
              <h3 className="font-medium text-gray-900 mb-3">Ưu đãi có sẵn:</h3>
              {promotions.map((promotion) => (
                <div
                  key={promotion.id}
                  className={`border rounded-lg p-4 transition-all cursor-pointer hover:shadow-md ${
                    selectedPromotion?.id === promotion.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                  onClick={() => handlePromotionSelect(promotion)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{promotion.title}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Percent className="h-4 w-4" />
                          <span>Giảm {promotion.discount_percent}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {formatDate(promotion.valid_from)} - {formatDate(promotion.valid_to)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-bold">
                        -{promotion.discount_percent}%
                      </div>
                    </div>
                  </div>
                  
                  {/* Price calculation example */}
                  <div className="bg-gray-50 rounded p-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Giá gốc:</span>
                      <span className="line-through text-gray-500">
                        {formatCurrencyValue(promotion.field.price_per_hour)} đ/giờ
                      </span>
                    </div>
                    <div className="flex justify-between items-center font-semibold text-green-600">
                      <span>Giá sau ưu đãi:</span>
                      <span>
                        {formatCurrencyValue(
                          promotion.field.price_per_hour * (1 - promotion.discount_percent / 100)
                        )} đ/giờ
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex justify-end gap-3">
            <Button
              onClick={onClose}
              variant="outline"
            >
              Đóng
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
