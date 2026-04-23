import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/contexts/authContext';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import Navbar from "@/components/home/navbar";
import Footer from '@/components/home/footer';
import { Link, useNavigate } from "react-router-dom";
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
  isFavorite?: boolean;
}

const Favorites: React.FC = () => {
  const [favorites, setFavorites] = useState<FootballField[]>([]);
  const [viewMode, setViewMode] = useState('grid');
  const [activeTab, setActiveTab] = useState('sân bóng');

  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isLoading: authLoading } = useAuth();
  const { canFavorite } = usePermissions();
  const navigate = useNavigate();
  // Fetch favorite fields
  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) {
        setError('Vui lòng đăng nhập để xem danh sách yêu thích');
        setLoading(false);
        return;
      }

      // Kiểm tra quyền truy cập
      if (!canFavorite) {
        setError('Bạn không có quyền truy cập vào tính năng này');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/favorites`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });

        if (response.data.success) {
          const favoriteFields = response.data.data.map((fav: any) => ({
            id: fav.field_id,
            name: fav.field?.name || 'Unknown Field',
            description: fav.field?.description || 'No description available',
            price_per_hour: fav.field?.price_per_hour || 0,
            images1: fav.field?.images1 || 'https://via.placeholder.com/800x480',
            images2: fav.field?.images2 || '',
            images3: fav.field?.images3 || '',
            is_verified: fav.field?.is_verified || false,
            created_at: fav.field?.created_at || new Date().toISOString(),
            location: fav.field?.location || {
              address_text: 'Unknown',
              city: 'Unknown',
              district: 'Unknown',
              ward: 'Unknown',
            },
            owner: fav.field?.owner || { id: '', name: 'Unknown', phone: '' },
            subfields: fav.field?.subfields || [],
            isFavorite: true,
          }));
          // Sort favorites based on sortOrder
          const sortedFields = [...favoriteFields].sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
          });
          setFavorites(sortedFields);
        } else {
          setError('Không thể tải danh sách sân yêu thích');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Không thể tải danh sách sân yêu thích');
      } finally {
        setLoading(false);
      }
    };    fetchFavorites();

  }, [user, sortOrder, canFavorite]); // Add canFavorite to dependency array


  // Handle sorting toggle
  const handleSortToggle = () => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };

  const handleViewDetail = (fieldId: string) => {
    navigate(`/fields/${fieldId}`);
  };

  // Handle adding/removing a field from favorites
  const handleFavoriteToggle = async (fieldId: string, isFavorite: boolean) => {
    console.log('Nút trái tim được bấm, Field ID:', fieldId, 'User:', user); // Log để kiểm tra
    if (!user || !user.id) {
      console.log('Triggering toast for unauthenticated user'); // Log để kiểm tra toast
      toast.error('Yêu cầu đăng nhập', {
        description: 'Vui lòng đăng nhập để quản lý danh sách yêu thích.',
        duration: 5000,
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      if (isFavorite) {
        await axios.delete(`${API_BASE_URL}/favorites/${fieldId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFavorites(favorites.filter((field) => field.id !== fieldId));
        toast.success('Thành công', {
          description: 'Đã xóa sân khỏi danh sách yêu thích',
          duration: 3000,
        });
      } else {
        await axios.post(
          `${API_BASE_URL}/favorites`,
          { field_id: fieldId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setFavorites((prevFavorites) =>
          prevFavorites.map((field) =>
            field.id === fieldId ? { ...field, isFavorite: true } : field
          )
        );
        toast.success('Thành công', {
          description: 'Đã thêm sân vào danh sách yêu thích',
          duration: 3000,
        });
      }
    } catch (err: any) {
      console.error('Error toggling favorite:', err);
      toast.error('Lỗi', {
        description: err.response?.data?.message || 'Không thể thực hiện thao tác',
        duration: 5000,
      });
    }
  };

  if (loading || authLoading) {
    return <div className="text-center py-24">Đang tải...</div>;
  }

  if (error) {
    return <div className="text-center py-24 text-red-600">{error}</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <Navbar />

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Sân bóng yêu thích</h2>
        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="relative w-full md:w-2/3">
            <input
              type="text"
              placeholder="Tìm kiếm sân bóng..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            />
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
          </div>
          <div className="flex items-center space-x-4 w-full md:w-auto justify-end">

            <div className="relative">
              <button
                onClick={handleSortToggle}
                className="flex items-center border border-gray-300 rounded-md px-3 py-2 bg-white text-sm cursor-pointer hover:bg-gray-100 transition"
              >
                <span>{sortOrder === 'desc' ? 'Mới nhất' : 'Cũ nhất'}</span>
                <i className="fas fa-chevron-down ml-2 text-xs"></i>
              </button>
            </div>
            <div className="flex border border-gray-300 rounded-md overflow-hidden">
              <button
                className={`p-2 ${viewMode === 'grid' ? 'bg-gray-200' : 'bg-white'} cursor-pointer`}
                onClick={() => setViewMode('grid')}
              >
                <i className="fas fa-th-large text-gray-700"></i>
              </button>
              <button
                className={`p-2 ${viewMode === 'list' ? 'bg-gray-200' : 'bg-white'} cursor-pointer`}
                onClick={() => setViewMode('list')}
              >
                <i className="fas fa-list text-gray-500"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Favorite Fields Grid */}
        {favorites.length === 0 ? (
          <div className="text-center text-gray-600">Bạn chưa có sân bóng yêu thích nào.</div>
        ) : (
          <div
            className={`${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-3 gap-6' : 'grid grid-cols-1 gap-6'}`}
          >
            {favorites.map((field) => (
              <div
                key={field.id}
                className={`bg-white rounded-lg shadow-md overflow-hidden ${viewMode === 'grid' ? 'flex flex-col' : 'flex'}`}
              >
                <div
                  className={`relative ${viewMode === 'grid' ? 'w-full h-48' : 'w-32 h-32 md:w-60 md:h-60'}`}
                >
                  <img
                    src={field.images1 || 'https://via.placeholder.com/800x480'}
                    alt={field.name}
                    className="w-full h-full object-cover object-top"
                  />
                  {field.is_verified && (
                    <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs">
                      Đã xác thực
                    </div>
                  )}
                  <button
                    className="absolute top-2 right-2 bg-white p-2 rounded-full shadow-md cursor-pointer"
                    onClick={() => {
                      console.log('Heart button clicked for field:', field.id); // Log để kiểm tra
                      handleFavoriteToggle(field.id, field.isFavorite || false);
                    }}
                  >
                    <i
                      className={`${field.isFavorite ? 'fas' : 'far'} fa-heart text-red-500`}
                    ></i>
                  </button>
                </div>
                <div className={`p-4 ${viewMode === 'grid' ? '' : 'flex-1'}`}>
                  <div className="flex items-start mb-2">
                    <i className="fas fa-map-marker-alt text-gray-500 mt-1 mr-2"></i>
                    <div>
                      <h3 className="font-semibold text-lg">{field.name}</h3>
                      <p className="text-gray-600 text-sm">
                        {field.location.address_text}, {field.location.district}, {field.location.city}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center mb-2">
                    <div className="flex items-center text-yellow-400 mr-2">
                      <span className="font-semibold">4.5</span>
                      <i className="fas fa-star ml-1"></i>
                    </div>
                    <span className="text-gray-500 text-sm">(10 đánh giá)</span>
                  </div>
                  <div className="text-gray-600 text-sm mb-2">
                    Sân: {field.subfields.length} người
                  </div>
                  <div className="text-green-600 font-medium mb-4">
                    {field.price_per_hour.toLocaleString()}đ/giờ
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      className="flex-1 py-2 border border-gray-300 rounded-md text-white whitespace-nowrap cursor-pointer text-sm"
                      onClick={() => handleViewDetail(field.id)}
                    >
                      Xem chi tiết
                    </Button>
                    <Button
                      className="flex-1 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition whitespace-nowrap cursor-pointer"
                    >
                      Đặt sân
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Favorites;