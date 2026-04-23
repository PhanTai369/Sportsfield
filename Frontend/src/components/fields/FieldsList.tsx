import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { BadgeRating } from "@/components/ui/badge-rating";
import { MapPin, Search, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrencyValue } from "../../utils/shared/currencyUtils";
import Navbar from "../home/navbar";
import Footer from "../home/footer";
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
}

export default function FieldsList() {
  const [fields, setFields] = useState<FootballField[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFields = async () => {
      try {
                const response = await axios.get(`${API_BASE_URL}/fields/all`);
        if (response.data.success) {
          setFields(response.data.data);
        } else {
          setError("Không thể tải danh sách sân");
        }
        setLoading(false);
      } catch (err: any) {
        setError(err.response?.data?.error?.message || "Không thể tải danh sách sân");
        setLoading(false);
      }
    };

    fetchFields();
  }, []);

  const handleViewDetail = (fieldId: string) => {
    navigate(`/fields/${fieldId}`);
  };

  const handleBooking = (fieldId: string) => {
    navigate(`/booking/${fieldId}`);
  };

  const filteredFields = fields.filter(field =>
    field.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    field.location.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    field.location.district.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="text-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải danh sách sân bóng...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="text-center py-24 text-red-600">
          <p className="text-lg">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-green-600 hover:bg-green-700"
          >
            Thử lại
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Hero Section */}
      <div className="bg-green-600 text-white py-16">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl font-bold mb-4">Danh sách sân bóng</h1>
          <p className="text-xl">
            Khám phá {fields.length} sân bóng chất lượng cao trên toàn quốc
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên sân hoặc địa điểm..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-4">
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Bộ lọc
              </Button>
              
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  className={`p-2 ${viewMode === 'grid' ? 'bg-green-600 text-white' : 'bg-white text-gray-600'}`}
                  onClick={() => setViewMode('grid')}
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm6 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V4zm-6 6a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zm6 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  className={`p-2 ${viewMode === 'list' ? 'bg-green-600 text-white' : 'bg-white text-gray-600'}`}
                  onClick={() => setViewMode('list')}
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 000 2h14a1 1 0 100-2H3zm0 4a1 1 0 000 2h14a1 1 0 100-2H3zm0 4a1 1 0 000 2h14a1 1 0 100-2H3z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-gray-600">
            Hiển thị {filteredFields.length} kết quả {searchTerm && `cho "${searchTerm}"`}
          </p>
        </div>

        {/* Fields Grid/List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFields.map((field) => (
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
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-2">{field.name}</h3>
                  <div className="flex items-center mt-1 text-gray-600">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span className="text-sm">
                      {field.location.district}, {field.location.city}
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
                      {formatCurrencyValue(field.price_per_hour)}/giờ
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
        ) : (
          <div className="space-y-4">
            {filteredFields.map((field) => (
              <div
                key={field.id}
                className="bg-white rounded-lg shadow-md p-6 flex gap-6"
              >
                <img
                  src={field.images1 || "https://via.placeholder.com/200x150"}
                  alt={field.name}
                  className="w-48 h-36 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-xl">{field.name}</h3>
                    {field.is_verified && (
                      <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs">
                        Đã xác thực
                      </span>
                    )}
                  </div>
                  <div className="flex items-center text-gray-600 mb-2">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{field.location.address_text}, {field.location.district}, {field.location.city}</span>
                  </div>
                  <div className="mb-3">
                    <BadgeRating rating={4.5} reviewCount={10} />
                  </div>
                  <p className="text-gray-600 mb-4 line-clamp-2">{field.description}</p>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold text-green-600 text-lg">
                        {formatCurrencyValue(field.price_per_hour)}/giờ
                      </span>
                      <span className="text-sm text-gray-500 ml-2">
                        • {field.subfields.length} sân con
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline"
                        onClick={() => handleViewDetail(field.id)}
                      >
                        Xem chi tiết
                      </Button>
                      <Button 
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleBooking(field.id)}
                      >
                        Đặt sân
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {filteredFields.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="h-24 w-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Không tìm thấy sân bóng nào</h3>
            <p className="text-gray-600 mb-4">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc của bạn</p>
            <Button onClick={() => setSearchTerm("")} variant="outline">
              Xóa bộ lọc
            </Button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
