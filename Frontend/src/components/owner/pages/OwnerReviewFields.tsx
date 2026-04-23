// src/components/ReviewList.tsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { API_BASE_URL } from '../../../config/api';

interface Review {
  id: string;
  user_id: string;
  field_id: string;
  rating: number;
  content: string;
  comment: string;
  created_at: string;
  user: { id: string; name: string; profileImage?: string };
  field: { id: string; name: string };
  likes?: number;
  dislikes?: number;
  replies?: number;
}

interface ReviewListProps {
  field_id?: string; // Make field_id optional
}

const OwnerReviewFields: React.FC = () => {
  const { pitchId } = useParams(); // Lấy field_id từ URL params
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

    const API_URL = `${API_BASE_URL}/reviews`; // URL backend từ config
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      try {
        const url = pitchId
          ? `${API_URL}/field/${pitchId}`
          : `${API_URL}/owner/fields-reviews`;
          
        const response = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (response.data.success) {
          setReviews(response.data.data);
          setCanReview(!!pitchId && response.data.canReview);
          setHasReviewed(!!pitchId && response.data.hasReviewed);
        } else {
          setError(response.data.message || "Không thể tải đánh giá");
        }
      } catch (err) {
        setError("Lỗi khi lấy danh sách đánh giá");
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [pitchId]);
  const filteredReviews = reviews.filter((review) => {
    // Lọc theo rating
    if (activeFilter !== "all" && review.rating !== parseInt(activeFilter)) {
      return false;
    }
    
    // Lọc theo từ khóa tìm kiếm
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const hasMatchInComment = review.comment?.toLowerCase().includes(searchLower);
      const hasMatchInContent = review.content?.toLowerCase().includes(searchLower);
      const hasMatchInUserName = review.user.name.toLowerCase().includes(searchLower);
      const hasMatchInFieldName = review.field.name.toLowerCase().includes(searchLower);
      
      if (!hasMatchInComment && !hasMatchInContent && !hasMatchInUserName && !hasMatchInFieldName) {
        return false;
      }
    }
    
    return true;
  });

  const sortedReviews = [...filteredReviews].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "oldest":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "highest":
        return b.rating - a.rating;
      case "lowest":
        return a.rating - b.rating;
      default:
        return 0;
    }
  });

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <i
          key={i}
          className={`fa${i <= rating ? "s" : "r"} fa-star`}
          style={{ color: i <= rating ? "#ffc107" : "#e4e5e9" }}
        ></i>
      );
    }
    return stars;
  };

  const handleCreateReview = async (reviewData: { rating: number; content: string }) => {
    try {
      const response = await axios.post(
        `${API_URL}/create`,
        { field_id: pitchId, ...reviewData },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        const updatedReviews = await axios.get(`${API_URL}/field/${pitchId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setReviews(updatedReviews.data.data);
        setCanReview(false);
        setHasReviewed(true);
      }
    } catch (err) {
      setError("Lỗi khi gửi đánh giá");
    }
  };

  return (
    <div className="flex flex-col h-screen">
        <div className="flex-1 overflow-y-auto">
        <div className="bg-white p-4 border-b border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none !rounded-button whitespace-nowrap"
                >
                  <i className="fas fa-filter mr-2"></i>
                  Lọc theo đánh giá
                  <i className="fas fa-chevron-down ml-2 text-xs"></i>
                </button>
                {showFilterMenu && (
                  <div className="absolute z-10 mt-1 w-48 bg-white shadow-lg rounded-md py-1 text-sm">
                    <button
                      onClick={() => {
                        setActiveFilter("all");
                        setShowFilterMenu(false);
                      }}
                      className={`block px-4 py-2 text-gray-700 hover:bg-gray-100 w-full text-left ${activeFilter === "all" ? "bg-gray-100" : ""}`}
                    >
                      Tất cả đánh giá
                    </button>
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => {
                          setActiveFilter(rating.toString());
                          setShowFilterMenu(false);
                        }}
                        className={`block px-4 py-2 text-gray-700 hover:bg-gray-100 w-full text-left ${activeFilter === rating.toString() ? "bg-gray-100" : ""}`}
                      >
                        {rating} {renderStars(rating)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none pr-8 !rounded-button whitespace-nowrap"
                >
                  <option value="newest">Mới nhất</option>
                  <option value="oldest">Cũ nhất</option>
                  <option value="highest">Đánh giá cao nhất</option>
                  <option value="lowest">Đánh giá thấp nhất</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <i className="fas fa-chevron-down text-xs"></i>
                </div>
              </div>
            </div>
            <div className="relative flex-grow max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-search text-gray-400"></i>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                placeholder="Tìm kiếm đánh giá..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50">
          {loading ? (
            <div className="col-span-full flex justify-center py-12">
              <p className="text-gray-500">Đang tải...</p>
            </div>
          ) : error ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12">
              <i className="fas fa-exclamation-circle text-red-500 text-5xl mb-4"></i>
              <p className="text-gray-500 text-lg">{error}</p>
            </div>
          ) : sortedReviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedReviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-transform duration-300 hover:shadow-md hover:scale-[1.02]"
                >
                  <div className="p-4">
                    <div className="flex items-start">
                      <img
                        src={review.user.profileImage || "/default-avatar.png"}
                        alt={review.user.name}
                        className="w-12 h-12 rounded-full object-cover mr-3"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-gray-800">
                              {review.user.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {new Date(review.created_at).toLocaleDateString('vi-VN')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center mt-1">
                          {renderStars(review.rating)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      {review.comment && (
                        <div className="text-gray-700 text-sm mb-2">
                          {review.comment}
                        </div>
                      )}
                      {!review.comment && review.content && (
                        <div className="text-gray-700 text-sm mb-2">
                          {review.content}
                        </div>
                      )}
                      {!review.comment && !review.content && (
                        <div className="text-gray-500 text-sm italic mb-2">
                          Không có bình luận
                        </div>
                      )}
                    </div>
                    
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-12">
              <i className="far fa-comment-dots text-gray-300 text-5xl mb-4"></i>
              <p className="text-gray-500 text-lg">
                Không tìm thấy đánh giá nào phù hợp
              </p>
              <button
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer !rounded-button whitespace-nowrap"
                onClick={() => {
                  setActiveFilter("all");
                  setSearchTerm("");
                }}
              >
                Xem tất cả đánh giá
              </button>
            </div>
          )}
          {sortedReviews.length > 0 && (
            <div className="mt-8 flex justify-center">
              <button className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer !rounded-button whitespace-nowrap">
                Xem thêm đánh giá
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerReviewFields;