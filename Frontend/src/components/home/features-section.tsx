import {
  Calendar,
  CreditCard,
  MapPin,
  Clock,
  Shield,
  Smartphone,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: <Calendar className="w-10 h-10 text-green-600" />,
    title: "Đặt sân dễ dàng",
    description:
      "Đặt sân bóng trực tuyến chỉ với vài thao tác đơn giản, tiết kiệm thời gian và công sức.",
  },
  {
    icon: <MapPin className="w-10 h-10 text-green-600" />,
    title: "Tìm kiếm thông minh",
    description:
      "Tìm sân bóng gần bạn với bộ lọc thông minh theo vị trí, giá cả và tiện ích.",
  },
  {
    icon: <Clock className="w-10 h-10 text-green-600" />,
    title: "Lịch trình linh hoạt",
    description:
      "Xem lịch trống và đặt sân theo thời gian phù hợp với lịch trình của bạn.",
  },
  {
    icon: <CreditCard className="w-10 h-10 text-green-600" />,
    title: "Thanh toán an toàn",
    description:
      "Nhiều phương thức thanh toán an toàn và bảo mật, đảm bảo giao dịch của bạn luôn được bảo vệ.",
  },
  {
    icon: <Shield className="w-10 h-10 text-green-600" />,
    title: "Đảm bảo chất lượng",
    description:
      "Chỉ liên kết với các sân bóng đạt chuẩn chất lượng và được đánh giá tốt từ cộng đồng.",
  },
  {
    icon: <Smartphone className="w-10 h-10 text-green-600" />,
    title: "Ứng dụng di động",
    description:
      "Tải ứng dụng trên điện thoại để đặt sân, quản lý lịch đặt và nhận thông báo mọi lúc mọi nơi.",
  },
];

export default function FeaturesSection() {
  return (
    <div className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-2">
          Tính năng nổi bật
        </h2>
        <p className="text-gray-600 text-center mb-12">
          Chúng tôi cung cấp các tính năng tiện lợi giúp việc đặt sân bóng trở
          nên dễ dàng và hiệu quả hơn
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border border-gray-100">
              <CardHeader className="pb-2">
                <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
