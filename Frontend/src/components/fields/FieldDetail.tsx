import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../home/navbar';
import Footer from '../home/footer';
import { formatCurrencyValue as formatCurrency } from '@/utils/shared/currencyUtils';
import { Heart } from 'lucide-react';
import { useAuth } from '@/contexts/authContext';
import { usePermissions } from '@/hooks/usePermissions';
import { showToast } from '@/utils/toast';
import { API_BASE_URL } from '../../config/api';
import FieldReviews from './FieldDetail-Review'; 
import { chatService } from '@/services/chatService';


interface Location {
    id: string;
    address_text: string;
    latitude: number;
    longitude: number;
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

interface FieldDetail {
    id: string;
    name: string;
    description: string;
    price_per_hour: number;
    images1: string;
    images2: string;
    images3: string;
    is_verified: boolean;
    created_at: string;
    updated_at: string;
    location: Location;
    owner: Owner;
    subfields: SubField[];
    isFavorite: boolean;

}

const FieldDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');    const [field, setField] = useState<FieldDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();
    const { canFavorite } = usePermissions();
    // Handle chat with owner
    const handleChatWithOwner = async () => {
        if (!user) {
            showToast.error('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để nhắn tin với chủ sân.');
            return;
        }

        if (!field) return;

        if (user.id === field.owner.id) {
            showToast.warning('Thông báo', 'Bạn không thể nhắn tin với chính mình.');
            return;
        }

        try {
            // Create or get existing chat with field owner
            const chat = await chatService.createOrGetChat(field.owner.id);
            
            // Navigate to chat page or open chat interface
            navigate('/chat', { state: { selectedChatId: chat.id } });
            
            showToast.success('Thành công', `Đã mở cuộc trò chuyện với ${field.owner.name}`);
        } catch (error) {
            console.error('Error creating chat:', error);
            showToast.error('Lỗi', 'Không thể tạo cuộc trò chuyện. Vui lòng thử lại.');
        }
    };

    // Handle booking
    const handleBooking = () => {
        if (!user) {
            // Chuyển hướng đến trang login nếu chưa đăng nhập
            navigate('/auth');
            return;
        }
        // Chuyển đến trang đặt sân
        navigate(`/booking/${field.id}`);
    };

    // Handle share
    const handleShare = async () => {
        try {
            const currentUrl = window.location.href;
            await navigator.clipboard.writeText(currentUrl);
            showToast.success('Thành công', 'Đã sao chép đường link sân bóng. Bạn có thể chia sẻ cho bạn bè!');
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            showToast.error('Lỗi', 'Không thể sao chép đường link. Vui lòng thử lại.');
        }
    };


    useEffect(() => {
        const fetchFieldDetail = async () => {
            try {
                // Fetch field details
                const response = await axios.get(`${API_BASE_URL}/fields/${id}`);
                console.log('Field API Response:', response.data);
                if (!response.data.success) {
                    throw new Error('Không thể tải thông tin sân bóng');
                }


                let fieldData: FieldDetail = { ...response.data.data, isFavorite: false }; // Default isFavorite to false

                // If user is logged in, fetch favorite status
                if (user) {
                    try {
                        const token = localStorage.getItem('token');
                        console.log('Token:', token);

                        if (!token) {
                            throw new Error('No authentication token found');
                        }
                        const favoritesResponse = await axios.get(`${API_BASE_URL}/favorites`, {
                            headers: { Authorization: `Bearer ${token}` },
                        });
                        const favoriteFieldIds = favoritesResponse.data.data?.map((fav: any) => fav.field_id) || [];
                        fieldData = {
                            ...fieldData,
                            isFavorite: favoriteFieldIds.includes(fieldData.id),
                        };                    } catch (favError: any) {
                        console.error('Error fetching favorites:', favError);
                        showToast.error('Không thể tải danh sách sân yêu thích', 'Vui lòng thử lại sau.');
                    }
                }

                setField(fieldData);
                setLoading(false);
            } catch (err: any) {
                console.error('Error fetching field:', err);
                setError(err.response?.data?.error?.message || 'Có lỗi xảy ra khi tải thông tin sân bóng');
                setLoading(false);
            }
        };

        if (!id) {
            setError('ID sân bóng không hợp lệ');
            setLoading(false);
            return;
        }

        fetchFieldDetail();
    }, [id, user]);    const handleFavoriteToggle = async () => {
        if (!user) {
            showToast.error('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để thêm sân vào danh sách yêu thích.');
            return;
        }

        if (!field) return;

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }            if (field.isFavorite) {
                await axios.delete(`${API_BASE_URL}/favorites/${field.id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                showToast.success('Thành công', 'Đã xóa sân khỏi danh sách yêu thích');
            } else {
                await axios.post(
                    `${API_BASE_URL}/favorites`,
                    { field_id: field.id },
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                showToast.success('Thành công', 'Đã thêm sân vào danh sách yêu thích');
            }

            setField((prev) => (prev ? { ...prev, isFavorite: !prev.isFavorite } : prev));        } catch (err: any) {
            console.error('Error toggling favorite:', err);

            showToast.error('Lỗi', err.response?.data?.message || 'Không thể thực hiện thao tác');
        }
    };


    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Đang tải thông tin sân bóng...</p>
                </div>
            </div>
        );
    }

    if (error || !field) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600">{error || 'Không tìm thấy thông tin sân bóng'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <Navbar />
            <div className="relative">
                <div className="w-full h-96 relative overflow-hidden">
                    <img
                        src={field.images1 || 'https://via.placeholder.com/1440x600'}
                        alt={field.name}
                        className="w-full h-full object-cover object-top"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-40"></div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                        <h1 className="text-5xl font-bold text-white mb-4">{field.name}</h1>
                        <p className="text-white text-lg mb-6">
                            <i className="fas fa-map-marker-alt mr-2"></i>
                            {field.location.district}, {field.location.city}
                        </p>
                        <div className="flex items-center justify-center space-x-4">
                            <div className="flex items-center bg-white bg-opacity-20 rounded-full px-4 py-2">
                                <i className="fas fa-check-circle text-green-400 mr-2"></i>
                                <span className="text-white font-medium">{field.is_verified ? 'Đã xác thực' : 'Chưa xác thực'}</span>
                            </div>
                            <span className="text-white bg-green-600 px-4 py-2 rounded-full">
                                {formatCurrency(field.price_per_hour)}/giờ
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center text-sm">
                <a href="/" className="text-gray-500 hover:text-green-600">Trang chủ</a>
                <span className="mx-2 text-gray-400">/</span>
                <a href="/san-bong" className="text-gray-500 hover:text-green-600">Sân bóng</a>
                <span className="mx-2 text-gray-400">/</span>
                <span className="text-gray-700">{field.name}</span>
            </div>
            <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 min-h-[600px]">
                    <div className="border-b border-gray-200 mb-6">
                        <div className="flex space-x-8">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`py-4 font-medium text-sm border-b-2 ${activeTab === 'overview' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                Tổng quan
                            </button>
                            <button
                                onClick={() => setActiveTab('reviews')}
                                className={`py-4 font-medium text-sm border-b-2 ${activeTab === 'reviews' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                Đánh giá
                            </button>
                            <button
                                onClick={() => setActiveTab('contact')}
                                className={`py-4 font-medium text-sm border-b-2 ${activeTab === 'contact' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                Liên hệ
                            </button>
                            <button
                                onClick={() => setActiveTab('map')}
                                className={`py-4 font-medium text-sm border-b-2 ${activeTab === 'map' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                Bản đồ
                            </button>
                        </div>
                    </div>

                    {activeTab === 'overview' && (
                        <>
                            <div className="mb-8">
                                <h2 className="text-xl font-semibold mb-4">Mô tả</h2>
                                <p className="text-gray-700 leading-relaxed">{field.description}</p>
                            </div>
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-semibold">Hình ảnh chi tiết</h2>
                                    <span className="text-sm text-gray-500">1/3 ảnh</span>

                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    {field.images1 && (
                                        <div className="rounded-lg overflow-hidden">
                                            <img
                                                src={field.images1}
                                                alt={`${field.name} 1`}
                                                className="w-full h-48 object-cover object-top hover:opacity-90 transition-opacity cursor-pointer"
                                            />
                                        </div>
                                    )}
                                    {field.images2 && (
                                        <div className="rounded-lg overflow-hidden">
                                            <img
                                                src={field.images2}
                                                alt={`${field.name} 2`}
                                                className="w-full h-48 object-cover object-top hover:opacity-90 transition-opacity cursor-pointer"
                                            />
                                        </div>
                                    )}
                                    {field.images3 && (
                                        <div className="rounded-lg overflow-hidden">
                                            <img
                                                src={field.images3}
                                                alt={`${field.name} 3`}
                                                className="w-full h-48 object-cover object-top hover:opacity-90 transition-opacity cursor-pointer"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="mb-8">
                                <h2 className="text-xl font-semibold mb-4">Danh sách sân con</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {field.subfields.map((subfield) => (
                                        <div key={subfield.id} className="border rounded-lg p-4">
                                            <h3 className="font-medium">{subfield.name}</h3>
                                            <p className="text-sm text-gray-600">Loại sân: {subfield.field_type}</p>
                                        </div>
                                    ))}
                                </div>

                            </div>
                            <div className="mb-8">
                                <h2 className="text-xl font-semibold mb-4">Nội quy sân bóng</h2>
                                <ul className="space-y-2 text-gray-700">
                                    <li className="flex items-start">
                                        <i className="fas fa-circle text-xs text-green-600 mt-1.5 mr-2"></i>
                                        <span>Không hút thuốc trong khu vực sân</span>
                                    </li>
                                    <li className="flex items-start">
                                        <i className="fas fa-circle text-xs text-green-600 mt-1.5 mr-2"></i>
                                        <span>Không mang đồ ăn, thức uống vào sân</span>
                                    </li>
                                    <li className="flex items-start">
                                        <i className="fas fa-circle text-xs text-green-600 mt-1.5 mr-2"></i>
                                        <span>Mang giày đế bằng phù hợp</span>
                                    </li>
                                    <li className="flex items-start">
                                        <i className="fas fa-circle text-xs text-green-600 mt-1.5 mr-2"></i>
                                        <span>Giữ gìn vệ sinh chung</span>
                                    </li>
                                </ul>
                            </div>
                            <div className="mb-8">
                                <h2 className="text-xl font-semibold mb-4">Chính sách huỷ</h2>
                                <h3 className="font-medium mb-2">Hủy đặt sân đã thanh toán</h3>
                                <p className="text-gray-700 leading-relaxed mb-4">
                                    Vì bạn đã thanh toán thành công, chúng tôi sẽ hoàn tiền qua Stripe về thẻ bạn đã sử dụng. Thời gian hoàn tiền: 5-10 ngày làm việc.
                                </p>
                                <h3 className="font-medium mb-2">Chính sách hoàn tiền:</h3>
                                <ul className="space-y-2 text-gray-700">
                                    <li className="flex items-start">
                                        <i className="fas fa-circle text-xs text-green-600 mt-1.5 mr-2"></i>
                                        <span>Hoàn 100% nếu hủy trong vòng 10 phút kể từ khi đặt thành công.</span>
                                    </li>
                                    <li className="flex items-start">
                                        <i className="fas fa-circle text-xs text-green-600 mt-1.5 mr-2"></i>
                                        <span>Hoàn 100% nếu hủy từ 48 giờ trở lên trước giờ đá.</span>
                                    </li>
                                    <li className="flex items-start">
                                        <i className="fas fa-circle text-xs text-green-600 mt-1.5 mr-2"></i>
                                        <span>Hoàn 75% nếu hủy trong khoảng từ 48 giờ đến 24 giờ trước giờ đá.</span>
                                    </li>
                                    <li className="flex items-start">
                                        <i className="fas fa-circle text-xs text-green-600 mt-1.5 mr-2"></i>
                                        <span>Hoàn 50% nếu hủy trong khoảng từ 24 giờ đến 12 giờ trước giờ đá.</span>
                                    </li>
                                    <li className="flex items-start">
                                        <i className="fas fa-circle text-xs text-green-600 mt-1.5 mr-2"></i>
                                        <span>Không hoàn tiền nếu hủy trong vòng dưới 12 giờ trước giờ đá.</span>
                                    </li>
                                </ul>
                            </div>
                        </>
                    )}
                    {activeTab === 'reviews' && (
                        <FieldReviews fieldId={field.id} user={user} />
                    )}
                    {activeTab === 'contact' && (
                        <div className="mb-8">
                            <h2 className="text-xl font-semibold mb-4">Thông tin liên hệ</h2>
                            <div className="space-y-2">
                                <p className="text-gray-700">
                                    <span className="font-medium">Chủ sân:</span> {field.owner.name}
                                </p>
                                <p className="text-gray-700">
                                    <span className="font-medium">Số điện thoại:</span> {field.owner.phone}
                                </p>
                                <p className="text-gray-700">
                                    <span className="font-medium">Địa chỉ:</span> {field.location.address_text}, {field.location.ward}, {field.location.district}, {field.location.city}
                                </p>
                            </div>
                        </div>
                    )}
                    {activeTab === 'map' && (
                        <div className="mb-8">
                            <h2 className="text-xl font-semibold mb-4">Bản đồ</h2>
                            <div className="space-y-4">
                                <div className="bg-gray-100 rounded-lg p-4">
                                    <p className="text-gray-700 mb-2">
                                        <i className="fas fa-map-marker-alt text-green-600 mr-2"></i>
                                        <span className="font-medium">Địa chỉ:</span> {field.location.address_text}, {field.location.ward}, {field.location.district}, {field.location.city}
                                    </p>
                                    {field.location.latitude && field.location.longitude && (
                                        <p className="text-gray-600 text-sm">
                                            <i className="fas fa-crosshairs text-gray-500 mr-2"></i>
                                            Tọa độ: {field.location.latitude}, {field.location.longitude}
                                        </p>
                                    )}
                                </div>
                                
                                {field.location.latitude && field.location.longitude ? (
                                    <div className="relative">
                                        <iframe
                                            src={`https://maps.google.com/maps?q=${field.location.latitude},${field.location.longitude}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                            width="100%"
                                            height="400"
                                            style={{ border: 0 }}
                                            allowFullScreen={true}
                                            loading="lazy"
                                            referrerPolicy="no-referrer-when-downgrade"
                                            className="rounded-lg shadow-md"
                                        />
                                        <div className="mt-4 flex justify-center">
                                            <a
                                                href={`https://www.google.com/maps/dir/?api=1&destination=${field.location.latitude},${field.location.longitude}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                            >
                                                <i className="fas fa-route mr-2"></i>
                                                Chỉ đường đến sân
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-gray-100 rounded-lg p-8 text-center">
                                        <i className="fas fa-map-marked-alt text-gray-400 text-4xl mb-4"></i>
                                        <p className="text-gray-600">Thông tin vị trí chưa có sẵn</p>
                                        <p className="text-gray-500 text-sm mt-2">Bản đồ sẽ hiển thị khi có thông tin tọa độ</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow-lg p-6 sticky top-24">
                        <h2 className="text-xl font-semibold mb-6">Đặt sân</h2>
                        <div className="mb-4">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-700">Giá cơ bản:</span>
                                <span className="text-2xl font-bold text-green-600">
                                    {formatCurrency(field.price_per_hour)}/giờ
                                </span>
                            </div>
                        </div>
                        <div className="mb-4">
                            <div className="flex items-center text-gray-700 mb-2">
                                <i className="far fa-clock mr-2"></i>
                                <span>Giờ mở cửa: 06:00 - 22:00</span>
                            </div>
                        </div>
                        <button 
                            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors !rounded-button whitespace-nowrap cursor-pointer"
                            onClick={handleBooking}
                        >
                            Đặt sân ngay
                        </button>                        <div className="flex justify-between mt-6">
                            {canFavorite && (
                                <button
                                    onClick={handleFavoriteToggle}
                                    className="flex items-center justify-center w-1/3 text-gray-600 hover:text-green-600 cursor-pointer"
                                >
                                    <Heart
                                        className={`h-5 w-5 mr-1 ${field.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-500'}`}
                                    />
                                    <span className="text-sm">Thích</span>
                                </button>
                            )}

                            <button 
                                onClick={handleShare}
                                className="flex items-center justify-center w-1/3 text-gray-600 hover:text-green-600 cursor-pointer transition-colors"
                            >
                                <i className="fas fa-share-alt mr-1"></i>
                                <span className="text-sm">Chia sẻ</span>
                            </button>
                            <button 
                                onClick={handleChatWithOwner}
                                className="flex items-center justify-center w-1/3 text-gray-600 hover:text-green-600 cursor-pointer transition-colors"
                            >
                                <i className="far fa-comments mr-1"></i>
                                <span className="text-sm">Nhắn tin</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default FieldDetailPage;