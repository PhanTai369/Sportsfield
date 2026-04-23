import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { MapPin, Search, Loader2, X, MapPinned, MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { BadgeRating } from "@/components/ui/badge-rating";
import { formatCurrency } from "@/utils/formatCurrency";
import { API_BASE_URL } from "../config/api";
import Navbar from "@/components/home/navbar";
import Footer from "@/components/home/footer";

interface Location {
  address_text: string;
  city: string;
  district: string;
  ward: string;
  latitude?: number;
  longitude?: number;
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
  distance?: number; // For location-based search results
}

// Function to format distance display with appropriate color
const getDistanceBadgeColor = (distance: number) => {
  if (distance <= 1) return 'bg-green-50 text-green-700'; // Very close
  if (distance <= 3) return 'bg-emerald-50 text-emerald-700'; // Close
  if (distance <= 5) return 'bg-blue-50 text-blue-700'; // Moderate
  if (distance <= 10) return 'bg-amber-50 text-amber-700'; // Far
  return 'bg-gray-50 text-gray-700'; // Very far
};

// Function to format distance with appropriate unit
const formatDistance = (distance: number): string => {
  if (distance < 1) {
    // Convert to meters for distances less than 1km
    const meters = Math.round(distance * 1000);
    return `${meters} m`;
  }
  return `${distance.toFixed(1)} km`;
};

const AdvancedSearchPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [fieldType, setFieldType] = useState(""); // Thêm state cho loại sân
  const [addressInput, setAddressInput] = useState("");
  const [radius, setRadius] = useState(5); // Default 5km radius
  const [fields, setFields] = useState<FootballField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<"name" | "location">("name");
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [sortByDistance, setSortByDistance] = useState(true);
  
  // States cho bộ lọc
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]); // Giá từ 0 đến 1,000,000 VND
  const [minRating, setMinRating] = useState<number>(0); // Rating tối thiểu (0-5)
  const [sortCriteria, setSortCriteria] = useState<string>("newest"); // Tiêu chí sắp xếp (newest, price-asc, price-desc, rating)
  const [originalFields, setOriginalFields] = useState<FootballField[]>([]); // Lưu trữ kết quả gốc trước khi lọc
  const navigate = useNavigate();

  // Helper function to calculate distance if not provided by API
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; // Distance in km
  };

  // Handle search by name and field type
  const handleSearchByName = async () => {
    if (!searchTerm.trim() && !fieldType) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_BASE_URL}/fields/search`, {
        params: { 
          name: searchTerm.trim() || undefined,
          field_type: fieldType || undefined
        }
      });
      
      console.log("Search by name response:", response.data);
      
      if (response.data.success) {
        const fieldsData = response.data.data;
        let processedFields = [];
        
        if (Array.isArray(fieldsData)) {
          processedFields = fieldsData;
        } else if (fieldsData) {
          // Kiểm tra cấu trúc dữ liệu và trích xuất mảng fields
          if (fieldsData.items && Array.isArray(fieldsData.items)) {
            processedFields = fieldsData.items;
          } else if (fieldsData.fields && Array.isArray(fieldsData.fields)) {
            processedFields = fieldsData.fields;
          } else if (fieldsData.data && Array.isArray(fieldsData.data)) {
            processedFields = fieldsData.data;
          }
        }
        
        // Lưu kết quả gốc và hiển thị
        setOriginalFields(processedFields);
        setFields(processedFields);
        
        // Reset bộ lọc khi có kết quả tìm kiếm mới
        setPriceRange([0, 1000000]);
        setMinRating(0);
        setSortCriteria("newest");
      } else {
        setError("Không thể tìm kiếm sân bóng");
        setFields([]);
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.response?.data?.error?.message || "Có lỗi xảy ra khi tìm kiếm");
      setFields([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle geocoding address to coordinates
  const handleGeocode = async () => {
    if (!addressInput.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log("Geocoding address:", addressInput.trim());
        const response = await axios.post(`${API_BASE_URL}/fields/geocode`, {
        address: addressInput.trim()
      });
        console.log("Geocoding response:", response.data);
      
      if (response.data.success && response.data.data) {
        // Lấy dữ liệu tọa độ từ response
        // Backend có thể trả về latitude, longitude trực tiếp hoặc bên trong coordinates
        let latitude, longitude;
        
        const data = response.data.data;
        console.log("Geocoding data structure:", data);
        
        if (data.coordinates && typeof data.coordinates === 'object') {
          // Nếu tọa độ nằm trong đối tượng coordinates
          latitude = data.coordinates.latitude || data.coordinates[0];
          longitude = data.coordinates.longitude || data.coordinates[1];
        } else if (Array.isArray(data.coordinates)) {
          // Nếu coordinates là một mảng [lng, lat] hoặc [lat, lng]
          latitude = data.coordinates[0];
          longitude = data.coordinates[1];
        } else {
          // Nếu tọa độ được trả về trực tiếp
          latitude = data.latitude;
          longitude = data.longitude;
        }
        
        console.log("Extracted coordinates:", { latitude, longitude });
        
        // Kiểm tra tọa độ hợp lệ
        if (latitude !== undefined && longitude !== undefined && 
            !isNaN(Number(latitude)) && !isNaN(Number(longitude))) {
          // Đảm bảo tọa độ là số
          const lat = typeof latitude === 'string' ? parseFloat(latitude) : Number(latitude);
          const lng = typeof longitude === 'string' ? parseFloat(longitude) : Number(longitude);
          
          console.log("Parsed coordinates:", { lat, lng });
          setCoordinates({ lat, lng });
          handleSearchByLocation(lat, lng, radius);
        } else {
          setError("Tọa độ không hợp lệ từ API geocode");
          setLoading(false);
        }
      } else {
        setError("Không thể xác định tọa độ từ địa chỉ này");
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Geocoding error:', err);
      setError(err.response?.data?.error?.message || "Có lỗi xảy ra khi xác định tọa độ");
      setLoading(false);
    }
  };  // Handle search by location (coordinates + radius)
  const handleSearchByLocation = async (lat: number, lng: number, radiusKm: number) => {
    try {
      console.log("Searching by location:", { lat, lng, radiusKm });
      setLoading(true);
      setError(null);
      
      // Validate coordinates
      if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
        setError("Tọa độ không hợp lệ");
        setLoading(false);
        return;
      }
      
      const response = await axios.get(`${API_BASE_URL}/fields/search/location`, {
        params: { 
          latitude: lat,
          longitude: lng,
          radius: radiusKm
        }
      });
      
      console.log("Location search response:", response.data);
      
      if (response.data.success) {
        const fieldsData = response.data.data;
        if (Array.isArray(fieldsData)) {
          console.log("Fields found:", fieldsData.length);
          
          // Xử lý trường hợp không có distance trong kết quả
          let fieldsWithDistance = fieldsData.map(field => {
            // If API didn't provide distance or distance is 0, calculate it ourselves
            if ((field.distance === undefined || field.distance === 0) && 
                field.location?.latitude && field.location?.longitude) {
              return {
                ...field,
                distance: calculateDistance(
                  lat, 
                  lng, 
                  parseFloat(field.location.latitude), 
                  parseFloat(field.location.longitude)
                )
              };
            }
            return field;
          });
          
          // Log field distances for debugging
          fieldsWithDistance.forEach(field => {
            console.log(`Field ${field.name} distance: ${field.distance?.toFixed(2)} km`);
          });
          
          // Sắp xếp theo khoảng cách nếu người dùng chọn
          if (sortByDistance) {
            fieldsWithDistance = fieldsWithDistance.sort((a, b) => {
              const distanceA = a.distance !== undefined ? a.distance : Number.MAX_VALUE;
              const distanceB = b.distance !== undefined ? b.distance : Number.MAX_VALUE;
              return distanceA - distanceB;
            });
            console.log("Fields sorted by distance");
          } else {
            console.log("Fields NOT sorted by distance (user preference)");
          }
          
          // Lưu kết quả gốc và hiển thị
          setOriginalFields(fieldsWithDistance);
          setFields(fieldsWithDistance);
          
          // Reset bộ lọc khi có kết quả tìm kiếm mới
          setPriceRange([0, 1000000]);
          setMinRating(0);
          setSortCriteria("newest");
        } else if (fieldsData && typeof fieldsData === 'object') {
          // Kiểm tra các cấu trúc dữ liệu khác nhau có thể có
          let processedFields = [];
          
          if (fieldsData.items && Array.isArray(fieldsData.items)) {
            processedFields = fieldsData.items;
          } else if (fieldsData.fields && Array.isArray(fieldsData.fields)) {
            processedFields = fieldsData.fields;
          }
          
          // Add distance calculation for these fields too
          const fieldsWithDistance = processedFields.map(field => {
            if (field.location?.latitude && field.location?.longitude) {
              return {
                ...field,
                distance: calculateDistance(
                  lat, 
                  lng, 
                  parseFloat(field.location.latitude), 
                  parseFloat(field.location.longitude)
                )
              };
            }
            return field;
          });
          
          // Sort by distance if needed
          if (sortByDistance) {
            fieldsWithDistance.sort((a, b) => {
              const distanceA = a.distance !== undefined ? a.distance : Number.MAX_VALUE;
              const distanceB = b.distance !== undefined ? b.distance : Number.MAX_VALUE;
              return distanceA - distanceB;
            });
          }
          
          setFields(fieldsWithDistance);
        } else {
          setFields([]);
        }
      } else {
        setError("Không thể tìm kiếm sân bóng gần vị trí này");
        setFields([]);
      }
    } catch (err: any) {
      console.error('Location search error:', err);
      setError(err.response?.data?.error?.message || "Có lỗi xảy ra khi tìm kiếm theo vị trí");
      setFields([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle enter key press for search inputs
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, searchFunction: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchFunction();
    }
  };

  // Reset state when switching search mode
  const setSearchModeWithReset = (mode: "name" | "location") => {
    if (mode !== searchMode) {
      // Reset state khi chuyển chế độ tìm kiếm
      setSearchMode(mode);
      setFields([]);
      setError(null);
      setOriginalFields([]);
      resetFilters(); // Reset all filters
      
      if (mode === "name") {
        setCoordinates(null);
      } else {
        // Khi chuyển sang tìm theo vị trí, reset các giá trị tìm theo tên
        setSearchTerm("");
        setFieldType("");
      }
    }
  };
  // Lấy vị trí hiện tại của người dùng
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Trình duyệt của bạn không hỗ trợ định vị vị trí");
      return;
    }
    
    setIsGettingLocation(true);
    setLocationError(null);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log("Current location acquired:", { latitude, longitude });
        
        // Store coordinates
        setCoordinates({ lat: latitude, lng: longitude });
        setUseCurrentLocation(true);
        
        try {
          // Get address via reverse geocoding
          await reverseGeocode(latitude, longitude);
          
          // Auto search with current location
          await handleSearchByLocation(latitude, longitude, radius);
        } catch (err) {
          console.error("Error in location processing:", err);
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setIsGettingLocation(false);
        
        let errorMessage = "Không thể xác định vị trí của bạn";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Bạn đã từ chối quyền truy cập vị trí. Vui lòng cấp quyền trong cài đặt trình duyệt và thử lại.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Thông tin vị trí không khả dụng. Vui lòng đảm bảo GPS/định vị đã được bật.";
            break;
          case error.TIMEOUT:
            errorMessage = "Yêu cầu vị trí đã hết thời gian chờ. Vui lòng thử lại.";
            break;
        }
        
        setLocationError(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };
    // Reverse geocoding để lấy địa chỉ từ tọa độ
  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      console.log("Reverse geocoding coordinates:", { latitude, longitude });
      const response = await axios.post(`${API_BASE_URL}/fields/geocode/reverse`, {
        latitude,
        longitude
      });
      
      console.log("Reverse geocoding response:", response.data);
      
      if (response.data.success && response.data.data) {
        const addressData = response.data.data;
        const displayAddress = addressData.address || addressData.formatted_address;
        
        if (displayAddress) {
          setAddressInput(displayAddress);
        } else {
          // Fallback - build address from components if available
          const addressParts = [];
          if (addressData.district) addressParts.push(addressData.district);
          if (addressData.city) addressParts.push(addressData.city);
          
          if (addressParts.length > 0) {
            setAddressInput(addressParts.join(', '));
          } else {
            // Last resort - show coordinates
            setAddressInput(`Vị trí (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`);
          }
        }
      } else {
        // Nếu API không trả về địa chỉ, hiển thị tọa độ
        setAddressInput(`Vị trí hiện tại (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`);
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      // Fallback nếu không thể reverse geocode
      setAddressInput(`Vị trí hiện tại (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`);
    }
  };
  // Handle radius or sort preference change and re-search or re-sort if coordinates are available
  useEffect(() => {
    if (coordinates && searchMode === "location") {
      // If we already have fields and only the sort preference changed, just re-sort
      if (fields.length > 0 && !isGettingLocation && !loading) {
        let sortedFields = [...fields];
        
        if (sortByDistance) {
          sortedFields = sortedFields.sort((a, b) => {
            const distanceA = a.distance !== undefined ? a.distance : Number.MAX_VALUE;
            const distanceB = b.distance !== undefined ? b.distance : Number.MAX_VALUE;
            return distanceA - distanceB;
          });
          console.log("Re-sorted fields by distance due to preference change");
        }
        
        setFields(sortedFields);
      } else {
        // For radius changes or initial load, do a new search
        handleSearchByLocation(coordinates.lat, coordinates.lng, radius);
      }
    }
  }, [radius, sortByDistance]);

  // Handle view detail navigation
  const handleViewDetail = (fieldId: string) => {
    navigate(`/fields/${fieldId}`);
  };

  // Handle booking navigation
  const handleBooking = (fieldId: string) => {
    navigate(`/booking/${fieldId}`);
  };

  // Áp dụng tất cả các bộ lọc lên kết quả tìm kiếm
  const applyFilters = () => {
    if (originalFields.length === 0) return;
    
    let filteredResults = [...originalFields];
    
    // Lọc theo khoảng giá
    filteredResults = filteredResults.filter(field => 
      field.price_per_hour >= priceRange[0] && field.price_per_hour <= priceRange[1]
    );
    
    // Lọc theo rating tối thiểu (giả định rating là 4.5 cho tất cả sân vì hiện tại không có data thực)
    if (minRating > 0) {
      filteredResults = filteredResults.filter(field => 4.5 >= minRating); // Sử dụng rating thực tế khi có
    }
    
    // Sắp xếp kết quả - luôn áp dụng tiêu chí sắp xếp đã chọn
    switch (sortCriteria) {
      case "newest":
        filteredResults.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "price-asc":
        filteredResults.sort((a, b) => a.price_per_hour - b.price_per_hour);
        console.log("Sorting by price ascending");
        break;
      case "price-desc":
        filteredResults.sort((a, b) => b.price_per_hour - a.price_per_hour);
        console.log("Sorting by price descending");
        break;
      case "rating":
        // Giả định rating đều là 4.5, sắp xếp theo rating thực tế khi có
        // filteredResults.sort((a, b) => b.rating - a.rating);
        break;
      case "distance":
        if (searchMode === "location") {
          filteredResults.sort((a, b) => {
            const distanceA = a.distance !== undefined ? a.distance : Number.MAX_VALUE;
            const distanceB = b.distance !== undefined ? b.distance : Number.MAX_VALUE;
            return distanceA - distanceB;
          });
          console.log("Sorting by distance");
        }
        break;
    }
    
    // Chỉ ưu tiên sắp xếp theo khoảng cách nếu người dùng đã chọn và không có tiêu chí sắp xếp cụ thể khác
    if (searchMode === "location" && sortByDistance && sortCriteria === "newest") {
      // Chỉ override khi người dùng chưa chọn tiêu chí sắp xếp cụ thể
      filteredResults.sort((a, b) => {
        const distanceA = a.distance !== undefined ? a.distance : Number.MAX_VALUE;
        const distanceB = b.distance !== undefined ? b.distance : Number.MAX_VALUE;
        return distanceA - distanceB;
      });
      console.log("Override: Sorting by distance due to sortByDistance preference");
    }
    
    setFields(filteredResults);
  };

  // Reset tất cả các bộ lọc về mặc định
  const resetFilters = () => {
    setPriceRange([0, 1000000]);
    setMinRating(0);
    setSortCriteria("newest");
    
    // Khôi phục kết quả ban đầu
    if (originalFields.length > 0) {
      setFields(originalFields);
    }
  };

  // Áp dụng bộ lọc khi có thay đổi
  useEffect(() => {
    if (originalFields.length > 0) {
      console.log("Applying filters with sortCriteria:", sortCriteria);
      applyFilters();
    }
  }, [priceRange, minRating, sortCriteria, sortByDistance]);

  // Lưu kết quả gốc trước khi lọc
  useEffect(() => {
    if (fields.length > 0 && originalFields.length === 0) {
      setOriginalFields(fields);
    }
  }, [fields]);

  return (
    <div className="min-h-screen bg-gray-50 mt-8">
      <Navbar />
      
      {/* Hero Section */}
      <div className="bg-green-600 text-black py-16">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl font-bold mb-4">Tìm kiếm nâng cao</h1>
          <p className="text-xl">
            Tìm kiếm sân bóng theo tên hoặc theo vị trí địa lý
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Search Options */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-4">
              <Button
                variant={searchMode === "name" ? "default" : "outline"}
                className={searchMode === "name" ? "bg-green-600 hover:bg-green-700" : ""}
                onClick={() => setSearchModeWithReset("name")}
              >
                <Search className="mr-2 h-4 w-4" />
                Tìm theo tên
              </Button>
              <Button
                variant={searchMode === "location" ? "default" : "outline"}
                className={searchMode === "location" ? "bg-green-600 hover:bg-green-700" : ""}
                onClick={() => setSearchModeWithReset("location")}
              >
                <MapPin className="mr-2 h-4 w-4" />
                Tìm theo vị trí
              </Button>
            </div>
            
            {/* Filter Toggle Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center text-blue-600 border-blue-600 hover:bg-blue-50"
            >
              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 6H21M10 12H21M17 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M3 12H7M3 18H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M8 9L8 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M5 15L5 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M12 21L12 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {showFilters ? "Ẩn bộ lọc" : "Hiển thị bộ lọc"}
            </Button>
          </div>

          {searchMode === "name" ? (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    placeholder="Nhập tên sân bóng..."
                    className="pl-10 py-6 text-lg text-gray-900 bg-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, handleSearchByName)}
                  />
                </div>
                <div className="w-44">
                  <select
                    value={fieldType}
                    onChange={(e) => setFieldType(e.target.value)}
                    className="w-full h-[52px] py-2 px-4 text-lg text-gray-900 bg-white rounded-md border-2 border-gray-200 focus:border-gray-400 hover:border-gray-300 transition-colors focus:outline-none"
                  >
                    <option value="">Loại sân</option>
                    <option value="5vs5">Sân 5vs5</option>
                    <option value="7vs7">Sân 7vs7</option>
                  </select>
                </div>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-black px-8 py-6 text-lg"
                  onClick={handleSearchByName}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang tìm...
                    </span>
                  ) : "Tìm kiếm"}
                </Button>
              </div>
              <div className="text-sm text-gray-500">
                Tìm kiếm sân theo tên hoặc theo loại sân (5vs5, 7vs7)
              </div>
            </div>
          ) : (            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    placeholder="Nhập địa chỉ để tìm sân gần đó..."
                    className="pl-10 py-6 text-lg"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, handleGeocode)}
                  />
                  {addressInput && (
                    <button
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      onClick={() => setAddressInput("")}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-black px-8 py-6 text-lg"
                  onClick={handleGeocode}
                  disabled={loading || isGettingLocation}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang tìm...
                    </span>
                  ) : "Tìm kiếm"}
                </Button>
              </div>
                <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  variant={useCurrentLocation ? "default" : "outline"}
                  className={`flex items-center justify-center ${useCurrentLocation ? "bg-green-600 hover:bg-green-700 text-black" : ""}`}
                  disabled={isGettingLocation}
                  onClick={getCurrentLocation}
                >
                  {isGettingLocation ? (
                    <span className="flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xác định...
                    </span>
                  ) : (
                    <>
                      <MapPinned className="mr-2 h-4 w-4" />
                      {useCurrentLocation ? "Đang dùng vị trí hiện tại" : "Sử dụng vị trí hiện tại"}
                    </>
                  )}
                </Button>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="sort-by-distance"
                    checked={sortByDistance}
                    onChange={(e) => setSortByDistance(e.target.checked)}
                    className="mr-2 h-4 w-4"
                  />
                  <label htmlFor="sort-by-distance" className="text-sm text-gray-600">
                    Sắp xếp kết quả theo khoảng cách gần nhất
                  </label>
                </div>
              </div>
                {locationError && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm">
                  <div className="flex items-start">
                    <svg className="h-5 w-5 mr-2 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="font-medium mb-1">Không thể sử dụng vị trí</p>
                      <p>{locationError}</p>
                      {locationError.includes("từ chối quyền") && (
                        <div className="mt-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-xs"
                            onClick={() => window.open('https://support.google.com/chrome/answer/142065', '_blank')}
                          >
                            Xem hướng dẫn cấp quyền
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}{coordinates && (
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center">
                      <MapPinned className="h-5 w-5 text-green-600 mr-2" />
                      <span className="font-medium">
                        {useCurrentLocation ? "Vị trí hiện tại của bạn:" : "Vị trí tìm kiếm:"}
                      </span>
                    </div>
                    {addressInput && (
                      <Badge variant="outline" className="text-sm py-1 px-2">
                        {addressInput.length > 40 ? addressInput.substring(0, 40) + '...' : addressInput}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                      <span className="text-sm text-gray-500 block mb-1">Bán kính tìm kiếm: <span className="font-medium text-gray-700">{radius} km</span></span>
                      <Slider
                        defaultValue={[radius]}
                        value={[radius]}
                        min={1}
                        max={20}
                        step={1}
                        onValueChange={(value) => setRadius(value[0])}
                        className="py-2"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>1 km</span>
                        <span>10 km</span>
                        <span>20 km</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 bg-white p-2 rounded border border-gray-200">
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1">
                          <span className="w-16 text-gray-500">Vĩ độ:</span> 
                          <span className="font-medium">{coordinates.lat.toFixed(6)}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-16 text-gray-500">Kinh độ:</span> 
                          <span className="font-medium">{coordinates.lng.toFixed(6)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filters Section */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-lg">Bộ lọc nâng cao</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={resetFilters}
                className="text-gray-500 hover:text-gray-700"
              >
                Đặt lại
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Lọc theo giá */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Khoảng giá</label>
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">₫</span>
                    <Input 
                      type="text" 
                      className="pl-6"
                      inputMode="numeric"
                      value={priceRange[0] === 0 ? "" : priceRange[0].toLocaleString('vi-VN')}
                      onChange={(e) => {
                        // Chỉ lấy các ký tự số từ input
                        const numericValue = e.target.value.replace(/[^\d]/g, '');
                        const newValue = numericValue === '' ? 0 : parseInt(numericValue);
                        setPriceRange([newValue, priceRange[1]]);
                      }}
                      placeholder="0 ₫"
                    />
                  </div>
                  <span className="text-gray-400">-</span>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">₫</span>
                    <Input 
                      type="text" 
                      className="pl-6"
                      inputMode="numeric"
                      value={priceRange[1] === 0 ? "" : priceRange[1].toLocaleString('vi-VN')}
                      onChange={(e) => {
                        // Chỉ lấy các ký tự số từ input
                        const numericValue = e.target.value.replace(/[^\d]/g, '');
                        const newValue = numericValue === '' ? 0 : parseInt(numericValue);
                        setPriceRange([priceRange[0], newValue]);
                      }}
                      placeholder="1.000.000 ₫"
                    />
                  </div>
                </div>
              </div>

              {/* Lọc theo đánh giá */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Đánh giá tối thiểu</label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setMinRating(rating)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        minRating >= rating 
                          ? 'bg-yellow-400 text-black' 
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                  {minRating > 0 && (
                    <button
                      onClick={() => setMinRating(0)}
                      className="text-xs text-blue-600 ml-2"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </div>

              {/* Sắp xếp theo */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Sắp xếp theo</label>
                <select
                  value={sortCriteria}
                  onChange={(e) => setSortCriteria(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="newest">Mới nhất</option>
                  <option value="price-asc">Giá: Thấp đến cao</option>
                  <option value="price-desc">Giá: Cao đến thấp</option>
                  <option value="rating">Đánh giá cao nhất</option>
                  {searchMode === "location" && (
                    <option value="distance">Khoảng cách</option>
                  )}
                </select>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
              {fields.length} kết quả được hiển thị từ tổng số {originalFields.length} kết quả
            </div>
          </div>
        )}

        {/* Results Section */}
        {error && (
          <div className="p-4 text-center text-red-600 bg-red-50 rounded-md mb-4">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-green-600" />
            <p className="mt-4 text-gray-600">Đang tìm kiếm sân bóng...</p>
          </div>
        )}

        {!loading && !error && fields.length === 0 && (
          <div className="p-8 text-center text-gray-500 bg-white rounded-lg shadow-sm">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-lg font-medium">Không tìm thấy sân bóng nào</p>
            <p className="mt-1 text-sm text-gray-500">Vui lòng thử tìm kiếm với từ khóa khác hoặc điều chỉnh bán kính tìm kiếm</p>
          </div>
        )}        {!loading && fields.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Kết quả tìm kiếm</h3>
              <div className="flex items-center flex-wrap gap-2">
                <p className="text-sm text-gray-500">{fields.length} sân được tìm thấy</p>
                {searchMode === "location" && (
                  <Badge variant="outline" className="bg-green-50">
                    <MapIcon className="h-3 w-3 mr-1" />
                    Bán kính {radius} km
                  </Badge>
                )}
                {/* Hiển thị các bộ lọc đang áp dụng */}
                {priceRange[0] > 0 && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    Giá từ {formatCurrency(priceRange[0])}
                  </Badge>
                )}
                {priceRange[1] < 1000000 && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    Giá đến {formatCurrency(priceRange[1])}
                  </Badge>
                )}
                {minRating > 0 && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 flex items-center">
                    <span className="mr-1">{minRating}+</span>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </Badge>
                )}
                {sortCriteria !== "newest" && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700">
                    {sortCriteria === "price-asc" && "Giá thấp đến cao"}
                    {sortCriteria === "price-desc" && "Giá cao đến thấp"}
                    {sortCriteria === "rating" && "Đánh giá cao nhất"}
                    {sortCriteria === "distance" && "Khoảng cách gần nhất"}
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {fields.map((field) => (
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
                      </div>                      {field.distance !== undefined && (
                        <div className="mb-3">
                          <Badge variant="outline" className={getDistanceBadgeColor(field.distance)}>
                            <MapIcon className="h-3 w-3 mr-1" />
                            {useCurrentLocation ? 'Cách bạn Khoảng ' : 'Cách '} 
                            {formatDistance(field.distance)}
                          </Badge>
                        </div>
                      )}
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
                          className="bg-green-600 hover:bg-green-700 text-black px-4 rounded-md"
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

      <Footer />
    </div>
  );
};

export default AdvancedSearchPage;
