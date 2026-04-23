import { BadgeRating } from "@/components/ui/badge-rating";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  rating: number;
  comment: string;
  avatar: string;
}

const testimonials: Testimonial[] = [
  {
    id: "1",
    name: "Nguyễn Văn A",
    role: "Đội trưởng CLB Sao Đỏ",
    rating: 5,
    comment:
      "Nền tảng đặt sân bóng này thực sự tiện lợi và dễ sử dụng. Tôi có thể dễ dàng tìm kiếm và đặt sân cho đội bóng của mình mà không gặp bất kỳ khó khăn nào.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
  },
  {
    id: "2",
    name: "Trần Thị B",
    role: "Người chơi thường xuyên",
    rating: 4,
    comment:
      "Tôi rất hài lòng với dịch vụ đặt sân bóng này. Giao diện thân thiện, dễ sử dụng và có nhiều sân bóng chất lượng để lựa chọn.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
  },
  {
    id: "3",
    name: "Lê Văn C",
    role: "Quản lý giải đấu phong trào",
    rating: 5,
    comment:
      "Đây là nền tảng tuyệt vời để tìm và đặt sân bóng cho các giải đấu phong trào. Tôi đặc biệt thích tính năng xem trước sân và đánh giá từ người dùng khác.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
  },
];

export default function Testimonials() {
  return (
    <div className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-2">
          Khách hàng nói gì về chúng tôi
        </h2>
        <p className="text-gray-600 text-center mb-12">
          Hàng ngàn người dùng đã tin tưởng và sử dụng dịch vụ đặt sân bóng của
          chúng tôi
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm"
            >
              <BadgeRating rating={testimonial.rating} className="mb-4" />
              <p className="text-gray-700 mb-6">"{testimonial.comment}"</p>
              <div className="flex items-center">
                <img
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <h4 className="font-bold">{testimonial.name}</h4>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-8">
          <Button variant="outline" size="icon" className="mr-2">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
