import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { MapPin } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { BadgeRating } from "../ui/badge-rating";
import { formatCurrency } from "@/utils/formatCurrency";
import { useAuth } from "@/contexts/authContext";
import { showToast } from "@/utils/toast";
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

export default function HeroSection() {
  const [searchTerm, setSearchTerm] = useState("");
  const [fieldType, setFieldType] = useState("");
  const [searchResults, setSearchResults] = useState<FootballField[]>([]);
  const [suggestions, setSuggestions] = useState<FootballField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSuggestions = async (value: string) => {
    setSearchTerm(value);
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      // Tạo object params với name và field_type (nếu có)
      const params: { name?: string; field_type?: string } = {
        name: value.trim()
      };
      
      // Thêm field_type vào params nếu đã chọn
      if (fieldType) {
        params.field_type = fieldType;
      }
      
      const response = await axios.get(`${API_BASE_URL}/fields/search`, { params });

      if (response.data.success) {
        const fields = response.data.data;
        if (Array.isArray(fields)) {
          setSuggestions(fields);
        } else if (fields) {
          const fieldsArray = fields.fields || fields.data || [];
          setSuggestions(Array.isArray(fieldsArray) ? fieldsArray : []);
        } else {
          setSuggestions([]);
        }
        setShowDropdown(true);
      }
    } catch (err) {
      console.error('Suggestion error:', err);
      setSuggestions([]);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim() && !fieldType) return;

    setLoading(true);
    setError(null);
    setShowResults(true);
    setShowDropdown(false);

    try {
      const response = await axios.get(`${API_BASE_URL}/fields/search`, {
        params: { 
          name: searchTerm.trim(),
          field_type: fieldType || undefined
        },
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        const fields = response.data.data;
        if (Array.isArray(fields)) {
          setSearchResults(fields);
        } else if (fields) {
          const fieldsArray = fields.fields || fields.data || [];
          setSearchResults(Array.isArray(fieldsArray) ? fieldsArray : []);
        } else {
          setSearchResults([]);
        }
      } else {
        setError("Không thể tìm kiếm sân bóng");
        setSearchResults([]);
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.response?.data?.error?.message || "Có lỗi xảy ra khi tìm kiếm");
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (fieldId: string) => {
    navigate(`/fields/${fieldId}`);
    setShowDropdown(false);
  };

  const handleBooking = (fieldId: string) => {
    if (!user) {
      showToast.error("Yêu cầu đăng nhập", "Vui lòng đăng nhập để đặt sân bóng.");
      setTimeout(() => {
        navigate('/auth');
      }, 2500); // Thay đổi thời gian timeout nếu cần
      return;
    }
    navigate(`/booking/${fieldId}`);
  };

  const handleAdvancedSearch = () => {
    navigate('/advanced-search');
  };

  // Debounce suggestions - tìm lại khi searchTerm hoặc fieldType thay đổi
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Chỉ gọi khi có searchTerm
      if (searchTerm.trim()) {
        handleSuggestions(searchTerm);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, fieldType]);

  return (
    <>
      <div className="relative w-full h-[600px] bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&q=80')",
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-50">
          <div className="container mx-auto h-full flex flex-col justify-center px-6">
            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Đặt sân bóng đá dễ dàng và nhanh chóng
              </h1>
              <p className="text-white text-lg mb-8">
                Nền tảng đặt sân bóng đá trực tuyến hàng đầu Việt Nam. Tìm kiếm,
                so sánh và đặt sân bóng đá chỉ với vài thao tác đơn giản.
              </p>
              <div className="flex gap-4">
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  Đặt sân ngay
                </Button>
                <Button
                  variant="outline"
                  className="bg-white text-gray-800 hover:bg-gray-100"
                >
                  Tìm hiểu thêm
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-6" style={{ marginTop: '-80px' }}>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-2">
            <div className="ml-20">
              <h2 className="text-2xl font-bold mb-2">Tìm và đặt sân bóng</h2>
              <p className="text-gray-600 text-sm">Nhập tên sân bóng bạn muốn tìm</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              className="text-blue-600 border-blue-600 hover:bg-blue-50 mr-20"
              onClick={handleAdvancedSearch}
            >
              Tìm kiếm nâng cao
            </Button>
          </div>

          <div className="ml-20 mr-20 mt-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1" ref={searchRef}>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input 
                      className="pl-12 pr-4 py-6 text-lg rounded-md border-2 border-gray-200 focus:border-gray-400 hover:border-gray-300 transition-colors"
                      placeholder="Nhập tên sân bóng..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onFocus={() => setShowDropdown(true)}
                    />
                  </div>
                  
                  {/* Suggestions Dropdown */}
                  {showDropdown && suggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-md shadow-xl border border-gray-100 max-h-[300px] overflow-y-auto">
                      {Array.isArray(suggestions) && suggestions.map((field) => (
                        <div 
                          key={field.id} 
                          className="p-4 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 transition-colors"
                          onClick={() => {
                            setSearchTerm(field.name);
                            setShowDropdown(false);
                          }}
                        >
                          <div className="flex items-center space-x-4">
                            <img
                              src={field.images1 || "https://via.placeholder.com/50"}
                              alt={field.name}
                              className="w-14 h-14 object-cover rounded-md"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-base truncate">{field.name}</h4>
                              <div className="flex items-center text-sm text-gray-500 mt-1">
                                <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                                <span className="truncate">{field.location.address_text}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="w-44">
                  <select
                    value={fieldType}
                    onChange={(e) => setFieldType(e.target.value)}
                    className="w-full h-[52px] py-2 px-4 text-lg rounded-md border-2 border-gray-200 focus:border-gray-400 hover:border-gray-300 transition-colors focus:outline-none"
                  >
                    <option value="">Loại sân</option>
                    <option value="5vs5">Sân 5vs5</option>
                    <option value="7vs7">Sân 7vs7</option>
                  </select>
                </div>

                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg rounded-md transition-colors"
                  onClick={handleSearch}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Đang tìm...
                    </span>
                  ) : "Tìm sân"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Search Results */}
        {showResults && (
          <div className="mt-4 bg-white rounded-md shadow-lg p-6">
            {error && (
              <div className="p-4 text-center text-red-600 bg-red-50 rounded-md mb-4">
                {error}
              </div>
            )}

            {!loading && !error && Array.isArray(searchResults) && searchResults.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <div className="mb-4">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="text-lg font-medium">Không tìm thấy sân bóng nào</p>
                <p className="mt-1 text-sm text-gray-500">Vui lòng thử tìm kiếm với từ khóa khác</p>
              </div>
            )}

            {Array.isArray(searchResults) && searchResults.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold">Kết quả tìm kiếm</h3>
                  <p className="text-sm text-gray-500">{searchResults.length} sân được tìm thấy</p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {searchResults.map((field) => (
                    <div 
                      key={field.id} 
                      className="bg-white rounded-md border border-gray-200 p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                      onClick={() => handleViewDetail(field.id)}
                    >
                      <div className="flex items-start space-x-4">
                        <img
                          src={field.images1 || "https://via.placeholder.com/150"}
                          alt={field.name}
                          className="w-28 h-28 object-cover rounded-md"
                        />
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg mb-2">{field.name}</h4>
                          <div className="flex items-center text-sm text-gray-600 mb-3">
                            <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                            <span>{field.location.address_text}, {field.location.district}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <BadgeRating rating={4.5} reviewCount={10} />
                            <span className="font-medium text-green-600 text-lg">
                              {formatCurrency(field.price_per_hour)}/giờ
                            </span>
                          </div>
                          <div className="mt-3 flex justify-end space-x-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="px-4 rounded-md"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetail(field.id);
                              }}
                            >
                              Chi tiết
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white px-4 rounded-md"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBooking(field.id);
                              }}
                            >
                              Đặt sân
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
