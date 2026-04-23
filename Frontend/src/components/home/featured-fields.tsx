import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { BadgeRating } from "@/components/ui/badge-rating";
import { MapPin, Heart } from "lucide-react";
import { useAuth } from "@/contexts/authContext"; 
import { usePermissions } from "@/hooks/usePermissions";
import { showToast } from "@/utils/toast"; 
import { Link, useNavigate } from "react-router-dom";
import { formatCurrencyValue as formatCurrency } from "@/utils/shared/currencyUtils";
import { API_BASE_URL } from '../../config/api';


interface Location {
  address_text: string;
  city: string;
  district: string;
  ward: string;
}

interface Owner {
  id: string;
  name: string;
  phone: string;
}

interface SubField {
  id: string;
  name: string;
  field_type: string;
}

interface FootballField {
  id: string;
  name: string;
  description: string;
  price_per_hour: number;
  images1: string;
  images2: string;
  images3: string;
  is_verified: boolean;
  created_at: string;
  location: Location;
  owner: Owner;
  subfields: SubField[];
  isFavorite?: boolean; // Thêm thuộc tính để theo dõi trạng thái yêu thích
}
export default function Fields() {
  const [fields, setFields] = useState<FootballField[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 3,
    total: 0,
    hasMore: false
  });
  const { user, isLoading: authLoading } = useAuth(); 
  const { canFavorite } = usePermissions();
  const navigate = useNavigate();

  const fetchFields = async (offset = 0, shouldAppend = false) => {
    try {
      shouldAppend ? setLoadingMore(true) : setLoading(true);
      
      // Lấy danh sách sân bóng với pagination
      const response = await axios.get(`${API_BASE_URL}/fields/all`, {
        params: {
          limit: pagination.limit,
          offset: offset
        }
      });
      
      if (response.data.success) {
        let fieldsData = response.data.data.fields;
        const paginationData = response.data.data.pagination;

        // Nếu người dùng đã đăng nhập, lấy danh sách sân yêu thích
        if (user) {
          try {
            const favoritesResponse = await axios.get(`${API_BASE_URL}/favorites`, {
              headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            const favoriteFieldIds = favoritesResponse.data.data.map((fav: any) => fav.field_id);

            // Gắn thuộc tính isFavorite cho các sân
            fieldsData = fieldsData.map((field: FootballField) => ({
              ...field,
              isFavorite: favoriteFieldIds.includes(field.id),
            }));
          } catch (favError) {
            // Nếu lỗi khi lấy favorites, vẫn hiển thị danh sách sân
            console.log("Could not fetch favorites:", favError);
          }
        }

        // Update fields state - either append or replace
        setFields(prevFields => shouldAppend ? [...prevFields, ...fieldsData] : fieldsData);
        
        // Update pagination state
        setPagination({
          offset: offset + fieldsData.length,
          limit: pagination.limit,
          total: paginationData.total,
          hasMore: paginationData.hasMore
        });
      } else {
        setError("Không thể tải danh sách sân");
      }
      
      shouldAppend ? setLoadingMore(false) : setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Không thể tải danh sách sân");
      shouldAppend ? setLoadingMore(false) : setLoading(false);
    }
  };

  useEffect(() => {
    // Chờ auth loading hoàn thành trước khi fetch fields
    if (authLoading) return;
    
    // Initial fetch with offset 0
    fetchFields(0, false);
  }, [user, authLoading]); // Thêm authLoading vào dependency
  
  const handleLoadMore = () => {
    fetchFields(pagination.offset, true);
  };



  // Hàm xử lý thêm/xóa sân yêu thích
  const handleFavoriteToggle = async (fieldId: string, isFavorite: boolean) => {
    if (!user) {
      showToast.error("Yêu cầu đăng nhập", "Vui lòng đăng nhập để thêm sân vào danh sách yêu thích.");
      return;
    }

    try {
      if (isFavorite) {
        // Xóa khỏi danh sách yêu thích
        await axios.delete(`${API_BASE_URL}/favorites/${fieldId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        showToast.success("Thành công", "Đã xóa sân khỏi danh sách yêu thích");
      } else {
        // Thêm vào danh sách yêu thích
        await axios.post(
          `${API_BASE_URL}/favorites`,
          { field_id: fieldId },
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        showToast.success("Thành công", "Đã thêm sân vào danh sách yêu thích");
      }

      // Cập nhật trạng thái isFavorite
      setFields((prevFields) =>
        prevFields.map((field) =>
          field.id === fieldId ? { ...field, isFavorite: !isFavorite } : field
        )
      );
    } catch (err: any) {
      showToast.error("Lỗi", err.response?.data?.message || "Không thể thực hiện thao tác");
    }
  };

  const handleBooking = (fieldId: string) => {
    navigate(`/booking/${fieldId}`);
  };

  const handleViewDetail = (fieldId: string) => {
    navigate(`/fields/${fieldId}`);
  };

  // Hiển thị loading khi đang tải auth hoặc đang tải fields lần đầu
  if (authLoading || loading) return <div className="text-center py-24">Đang tải...</div>;
  
  if (error) return <div className="text-center py-24 text-red-600">{error}</div>;

  return (
    <div id="san-noi-bat" className="py-24 bg-gray-50">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-2">Sân bóng nổi bật</h2>
        <p className="text-gray-600 text-center mb-10">
          Khám phá các sân bóng chất lượng cao được đánh giá tốt nhất bởi cộng đồng người chơi
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fields.map((field) => (
            <div
              key={field.id}
              className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="relative">
                <img
                  src={field.images1 || "https://via.placeholder.com/800x480"}
                  alt={field.name}
                  className="w-full h-48 object-cover"
                />
                {field.is_verified && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs">
                    Đã xác thực
                  </div>
                )}                {canFavorite && (
                  <button
                    onClick={() => handleFavoriteToggle(field.id, field.isFavorite || false)}
                    className="absolute top-2 left-2 p-2 rounded-full bg-white/80 hover:bg-white transition-colors"
                  >
                    <Heart
                      className={`h-5 w-5 ${field.isFavorite ? "fill-red-500 text-red-500" : "text-gray-500"}`}
                    />
                  </button>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg mb-2">{field.name}</h3>
                <div className="flex items-center mt-1 text-gray-600">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span className="text-sm">
                    {field.location.address_text}, {field.location.district}, {field.location.city}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <BadgeRating rating={4.5} reviewCount={10} />
                </div>
                <div className="mt-2 text-sm text-gray-600 line-clamp-2">
                  {field.description}
                </div>
                <div className="flex justify-between items-center mt-4">
                  <span className="font-bold text-green-600">
                    {formatCurrency(field.price_per_hour)}/giờ
                  </span>
                  <span className="text-sm text-gray-500">
                    {field.subfields.length} sân con
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <Button 
                    variant="outline" 
                    className="text-sm"
                    onClick={() => handleViewDetail(field.id)}
                  >
                    Xem chi tiết
                  </Button>
                  <Button 
                    className="bg-green-600 hover:bg-green-700 text-white text-sm"
                    onClick={() => handleBooking(field.id)}
                  >
                    Đặt sân
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-10">
          {pagination.hasMore ? (
            <Button
              variant="outline"
              className="border-green-600 text-green-600 hover:bg-green-50"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? 'Đang tải...' : 'Xem thêm sân bóng'}
            </Button>
          ) : fields.length > 0 ? (
            <span className="text-gray-500 text-sm">Đã hiển thị tất cả {pagination.total} sân bóng</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}