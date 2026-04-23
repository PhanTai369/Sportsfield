import { Button } from "../ui/button"
import { ArrowRight, Tag } from "lucide-react"
// Import centralized currency utility
import { formatCurrencyValue } from "../../utils/shared/currencyUtils"

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

interface BookingSummaryProps {
  totalAmount: number
  hasSelection: boolean
  onContinue: () => void
  onPromotionClick?: () => void
  selectedPromotion?: Promotion | null
  originalAmount?: number
}

export function BookingSummary({ 
  totalAmount, 
  hasSelection, 
  onContinue,
  onPromotionClick,
  selectedPromotion,
  originalAmount
}: BookingSummaryProps) {
  return (
    <div className="pt-4 border-t border-gray-200">
      {/* Promotion section */}
      {hasSelection && onPromotionClick && (
        <div className="mb-4">
          <Button
            onClick={onPromotionClick}
            variant="outline"
            className="w-full border-green-300 text-green-700 hover:bg-green-50 flex items-center justify-center gap-2"
          >
            <Tag className="h-4 w-4" />
            {selectedPromotion ? 'Đổi ưu đãi' : 'Sử dụng ưu đãi'}
          </Button>
          
          {/* Promotion info */}
          {selectedPromotion && (
            <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">{selectedPromotion.title}</p>
                  <p className="text-xs text-green-600">Giảm {selectedPromotion.discount_percent}%</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 line-through">
                    {originalAmount ? formatCurrencyValue(originalAmount) : formatCurrencyValue(totalAmount)} đ
                  </p>
                  <p className="text-sm font-semibold text-green-600">
                    Tiết kiệm {formatCurrencyValue((originalAmount || totalAmount) - totalAmount)} đ
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div className="space-y-1">
          <div className="text-sm sm:text-md text-gray-600">Tổng đơn hàng:</div>
          {selectedPromotion && originalAmount && originalAmount > totalAmount && (
            <div className="text-sm text-gray-500 line-through">
              {formatCurrencyValue(originalAmount)} đ
            </div>
          )}
          <div className={`text-xl sm:text-2xl font-bold ${selectedPromotion ? 'text-green-600' : 'text-green-600'} price-counter booking-price-display ${hasSelection ? 'price-highlight' : ''}`}>
            {formatCurrencyValue(totalAmount)} đ
          </div>
          <div className="text-xs text-gray-500">
            {hasSelection 
              ? 'Vui lòng kiểm tra lại thông tin đặt sân trước khi tiếp tục' 
              : 'Vui lòng chọn ít nhất một khung giờ để tiếp tục'}
          </div>
        </div>
        <Button 
          className={`bg-green-500 hover:bg-green-600 text-white px-6 sm:px-8 py-3 sm:py-6 text-sm sm:text-base flex items-center justify-center gap-2 transition-all duration-300 booking-continue-btn ${
            hasSelection ? 'booking-slot-selected' : 'opacity-50'
          }`}
          disabled={!hasSelection}
          onClick={onContinue}
        >
          Tiếp tục
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Optional disclaimer */}
      {hasSelection && (
        <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200 fade-in">
          <p>Lưu ý: Bạn cần thanh toán đặt cọc hoặc thanh toán toàn bộ để hoàn tất đặt sân. Sân sẽ được giữ trong 15 phút sau khi bạn xác nhận đặt sân.</p>
        </div>
      )}
    </div>
  )
}
