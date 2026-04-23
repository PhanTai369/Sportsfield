import { Check } from "lucide-react"

interface BookingStepsProps {
  currentStep: number
}

export function BookingSteps({ currentStep }: BookingStepsProps) {
  const steps = [
    {
      id: 1,
      title: "Chọn sân & giờ",
      subtitle: "Chọn sân bóng và thời gian",
    },
    {
      id: 2,
      title: "Xem lại",
      subtitle: "Xem thông tin đặt sân",
    },
    {
      id: 3,
      title: "Thanh toán",
      subtitle: "Thanh toán an toàn",
    },
    {
      id: 4,
      title: "Hoàn thành",
      subtitle: "Đặt sân thành công",
    },
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
      <h2 className="text-2xl font-semibold text-green-600 text-center mb-8">Đặt sân bóng đá</h2>
      <p className="text-gray-600 text-center mb-8">Chọn sân, chọn giờ, và tận hưởng trận đấu của bạn</p>

      <div className="flex justify-center items-center space-x-8 booking-steps-container">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center booking-steps-item">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center booking-step-indicator ${
                  step.id <= currentStep 
                    ? "bg-green-500 text-white booking-step-active" 
                    : "bg-gray-200 text-gray-500"
                } ${
                  step.id === currentStep ? "pulse-green" : ""
                }`}
              >
                {step.id < currentStep ? <Check className="w-6 h-6 success-checkmark" /> : <span>{step.id}</span>}
              </div>
              <div className="text-center mt-2">
                <div className={`font-medium text-sm ${
                  step.id <= currentStep ? "text-green-600" : "text-gray-500"
                }`}>
                  {step.title}
                </div>
                <div className="text-xs text-gray-500">{step.subtitle}</div>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-16 h-0.5 transition-all duration-500 ${
                step.id < currentStep ? "bg-green-500" : "bg-gray-200"
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
