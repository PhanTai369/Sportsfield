"use client"

import { useState } from "react"
import { DatePicker } from "./DatePicker"
import { TimeSlotGrid } from "./TimeSlotGrid"
import { BookingSummary } from "./BookingSummary"
import { PromotionModal } from "./PromotionModal"
import { parseSlotId, getSubfieldDetailsEnhanced, getFieldTypeDisplay } from '../../utils/slotFormatter'

interface FieldData {
  id: string;
  name: string;
  description: string;
  price_per_hour: number;
  images1: string;
  location: {
    address_text: string;
    city: string;
    district: string;
    ward: string;
  };
  owner: {
    id: string;
    name: string;
  };
  subfields: Array<{
    id: string;
    name: string;
    field_type: string;
  }>;
}

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

interface BookingModuleProps {
  selectedDate: number
  onDateSelect: (date: number) => void
  selectedSlots: string[]
  onSlotSelect: (fieldId: string, time: string) => void
  totalAmount: number
  originalAmount?: number
  onContinue: () => void
  fieldId?: string
  fieldData?: FieldData
  refreshTrigger?: number // Add this prop for triggering TimeSlotGrid refresh
  selectedPromotion?: Promotion | null
  onPromotionChange?: (promotion: Promotion | null) => void
}

export function BookingModule({
  selectedDate,
  onDateSelect,
  selectedSlots,
  onSlotSelect,
  totalAmount,
  originalAmount,
  onContinue,
  fieldId,
  fieldData,
  refreshTrigger,
  selectedPromotion,
  onPromotionChange
}: BookingModuleProps) {
  // Track the number of slots selected per field
  const [selectedCount, setSelectedCount] = useState<Record<string, number>>({});
  const [showPromotionModal, setShowPromotionModal] = useState(false);

  // Get field selection stats using enhanced utilities
  const getFieldSelections = () => {
    const fieldCounts: Record<string, { 
      count: number; 
      subfieldName: string;
      fieldType: string;
      displayType: string;
    }> = {};
    
    console.log('BookingModule - Processing selected slots:', selectedSlots);
    
    selectedSlots.forEach(slot => {
      if (!slot || typeof slot !== 'string') {
        console.warn('BookingModule - Invalid slot:', slot);
        return;
      }

      // Use utility function to parse slot ID
      const { subfieldId } = parseSlotId(slot);
      
      console.log('BookingModule - Processing slot:', { slot, subfieldId });

      // Use enhanced subfield details utility
      const subfieldDetails = getSubfieldDetailsEnhanced(subfieldId, fieldData?.subfields);
      
      if (!fieldCounts[subfieldId]) {
        fieldCounts[subfieldId] = { 
          count: 0, 
          subfieldName: subfieldDetails.name,
          fieldType: subfieldDetails.fieldType,
          displayType: getFieldTypeDisplay(subfieldDetails.fieldType)
        };
      }
      
      fieldCounts[subfieldId].count++;
      
      console.log('BookingModule - Processed field:', subfieldId, fieldCounts[subfieldId]);
    });
    
    return fieldCounts;
  };

  // Format the date for display
  const formatDate = (day: number) => {
    const today = new Date();
    const date = new Date(today.getFullYear(), today.getMonth(), day);
    return date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const handlePromotionSelect = (promotion: Promotion | null) => {
    if (onPromotionChange) {
      onPromotionChange(promotion);
    }
  };

  const handlePromotionClick = () => {
    setShowPromotionModal(true);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg booking-summary-card">
      {/* Header */}
      <div className="bg-green-600 text-white p-4 sm:p-5 rounded-t-lg booking-header">
        <h2 className="text-lg sm:text-xl font-semibold">Đặt sân bóng đá</h2>
        <p className="text-xs sm:text-sm mt-1 text-green-100">Ngày {formatDate(selectedDate)}</p>
      </div>
      
      <div className="p-4 sm:p-6">
        <DatePicker selectedDate={selectedDate} onDateSelect={onDateSelect} />

        <TimeSlotGrid 
          selectedSlots={selectedSlots} 
          onSlotSelect={onSlotSelect}
          fieldId={fieldId}
          selectedDate={selectedDate}
          refreshTrigger={refreshTrigger}
        />

        {/* Selection summary */}
        {selectedSlots.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 fade-in">
            <h3 className="font-medium text-green-700 mb-3 flex items-center gap-2 text-sm sm:text-base">
              <span className="w-2 h-2 bg-green-500 rounded-full pulse-green"></span>
              Tóm tắt đặt sân
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {Object.entries(getFieldSelections()).map(([fieldId, data]) => (
                <div key={fieldId} className="flex justify-between items-center bg-white rounded-lg px-2 sm:px-3 py-2 shadow-sm booking-slot-item">
                  <div className="flex flex-col">
                    <span className="text-gray-700 font-medium text-sm sm:text-base">{data.subfieldName}</span>
                    <span className="text-xs text-gray-500">{data.displayType}</span>
                  </div>
                  <span className="text-green-600 font-semibold price-counter text-sm sm:text-base">{data.count} giờ</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-green-200">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-gray-600">Tổng khung giờ đã chọn:</span>
                <span className="font-semibold text-green-700 price-highlight">{selectedSlots.length} giờ</span>
              </div>
            </div>
          </div>
        )}

        <BookingSummary 
          totalAmount={totalAmount} 
          originalAmount={originalAmount}
          hasSelection={selectedSlots.length > 0} 
          onContinue={onContinue}
          onPromotionClick={fieldId ? handlePromotionClick : undefined}
          selectedPromotion={selectedPromotion}
        />
      </div>

      {/* Promotion Modal */}
      {fieldId && (
        <PromotionModal
          isOpen={showPromotionModal}
          onClose={() => setShowPromotionModal(false)}
          fieldId={fieldId}
          onPromotionSelect={handlePromotionSelect}
          selectedPromotion={selectedPromotion}
        />
      )}
    </div>
  )
}
