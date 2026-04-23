import { Link } from "react-router-dom";
import {
  Facebook,
  Twitter,
  Instagram,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Footer() {
  return (
    <footer id="lien-he" className="bg-gray-900 text-white pt-16 pb-8">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img 
                src="/logoSportFields.png" 
                alt="Sport Fields Logo" 
                className="h-8 w-auto"
              />
              <span className="text-white font-bold text-lg">
                SPORTSFIELD
              </span>
            </div>
            <p className="text-gray-400 mb-4">
              Nền tảng đặt sân bóng đá trực tuyến hàng đầu Việt Nam. Kết nối
              người chơi với các sân bóng chất lượng trên toàn quốc.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <Instagram size={20} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4">Liên kết nhanh</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-400 hover:text-white">
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link to="/san-bong" className="text-gray-400 hover:text-white">
                  Sân bóng
                </Link>
              </li>
              <li>
                <Link
                  to="/tinh-nang"
                  className="text-gray-400 hover:text-white"
                >
                  Tính năng
                </Link>
              </li>
              <li>
                <Link to="/danh-gia" className="text-gray-400 hover:text-white">
                  Đánh giá
                </Link>
              </li>
              <li>
                <Link
                  to="/tro-thanh-doi-tac"
                  className="text-gray-400 hover:text-white"
                >
                  Trở thành đối tác
                </Link>
              </li>
              <li>
                <Link
                  to="/chinh-sach-bao-mat"
                  className="text-gray-400 hover:text-white"
                >
                  Chính sách bảo mật
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4">Đăng ký nhận tin</h3>
            <p className="text-gray-400 mb-4">
              Nhận thông tin về khuyến mãi và sân bóng mới nhất.
            </p>
            <div className="flex">
              <Input
                type="email"
                placeholder="Email của bạn"
                className="bg-gray-800 border-gray-700 text-white"
              />
              <Button className="ml-2 bg-green-600 hover:bg-green-700">
                Đăng ký
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4">Liên hệ</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <MapPin className="h-5 w-5 mr-2 text-gray-400" />
                <span className="text-gray-400">
                  73 Nguyễn Tạo, Hoà Hải, Ngũ Hành Sơn, Đà Nẵng
                </span>
              </li>
              <li className="flex items-center">
                <Phone className="h-5 w-5 mr-2 text-gray-400" />
                <span className="text-gray-400">0123 456 789</span>
              </li>
              <li className="flex items-center">
                <Mail className="h-5 w-5 mr-2 text-gray-400" />
                <span className="text-gray-400">bookingfootball247@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
          <p>© 2025 SPORTSFIELD. Tất cả các quyền được bảo lưu.</p>
        </div>
      </div>
    </footer>
  );
}
