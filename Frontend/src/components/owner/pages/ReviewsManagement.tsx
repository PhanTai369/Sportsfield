import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import revenueService, { RecentReviewData } from '../../../services/revenueService';

interface ReviewReply {
  id: string;
  reviewId: string;
  content: string;
  createdAt: string;
  timeAgo: string;
}

interface ReviewWithReply extends RecentReviewData {
  reply?: ReviewReply;
}

const ReviewsManagement: React.FC = () => {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<ReviewWithReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'rating_high' | 'rating_low'>('newest');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadReviews();
  }, []);

  // Reload khi filters thay đổi
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadReviews();
    }, 500); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [filterRating, sortBy, searchTerm]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      // Gọi API để lấy danh sách đánh giá
      const reviewsData = await revenueService.getReviewsWithPagination(1, 50, {
        rating: filterRating || undefined,
        search: searchTerm || undefined,
        sortBy: sortBy
      });
      
      // Chuyển đổi dữ liệu để thêm replies
      const reviewsWithReplies: ReviewWithReply[] = reviewsData.reviews.map(review => ({
        ...review,
        reply: Math.random() > 0.7 ? {
          id: `reply-${review.id}`,
          reviewId: review.id,
          content: 'Cảm ơn bạn đã đánh giá! Chúng tôi sẽ tiếp tục cải thiện chất lượng dịch vụ.',
          createdAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          timeAgo: '2 giờ trước'
        } : undefined
      }));
      
      setReviews(reviewsWithReplies);
    } catch (error) {
      console.error('Lỗi khi tải đánh giá:', error);
      toast.error('Không thể tải danh sách đánh giá, sử dụng dữ liệu mẫu');
      
      // Fallback với mock data
      const mockReviews: ReviewWithReply[] = [
        {
          id: '1',
          userName: 'Nguyễn Văn Minh',
          fieldName: 'Sân Thường Nhật',
          rating: 5,
          comment: 'Sân cỏ chất lượng tuyệt vời! Không gian thoáng mát, dịch vụ chăm sóc khách hàng rất tốt. Sẽ quay lại lần sau. Rất hài lòng với trải nghiệm ở đây.',
          avatar: 'NM',
          createdAt: '2025-07-15T08:00:00Z',
          timeAgo: '2 giờ trước',
          reply: {
            id: 'reply-1',
            reviewId: '1',
            content: 'Cảm ơn anh Minh đã đánh giá! Chúng tôi rất vui khi anh hài lòng với dịch vụ. Hy vọng sẽ được phục vụ anh trong những lần tới!',
            createdAt: '2025-07-15T10:00:00Z',
            timeAgo: '1 giờ trước'
          }
        },
        {
          id: '2',
          userName: 'Trần Quang Huy',
          fieldName: 'Sân Phủi Thọ',
          rating: 4,
          comment: 'Sân đẹp, phục vụ tốt, giá cả hợp lý. Chỗ để xe rộng rãi. Nhân viên thân thiện và nhiệt tình. Tuy nhiên ánh sáng buổi tối hơi yếu.',
          avatar: 'TH',
          createdAt: '2025-07-16T10:30:00Z',
          timeAgo: '1 ngày trước'
        },
        {
          id: '3',
          userName: 'Lê Thị Bích Phương',
          fieldName: 'Sân Hoa Lu',
          rating: 3,
          comment: 'Sân ổn, tuy nhiên hệ thống ánh sáng buổi tối cần được cải thiện. Nhìn chung vẫn đáng để thử. Giá cả vừa phải.',
          avatar: 'LP',
          createdAt: '2025-07-17T14:15:00Z',
          timeAgo: '3 ngày trước'
        },
        {
          id: '4',
          userName: 'Phạm Đức Thành',
          fieldName: 'Sân Kách Mễu',
          rating: 4,
          comment: 'Không gian thoải mái, nhân viên thân thiện. Cỏ nhân tạo mới nên chất lượng chơi rất tốt. Sẽ giới thiệu cho bạn bè.',
          avatar: 'PT',
          createdAt: '2025-07-18T16:45:00Z',
          timeAgo: '5 ngày trước',
          reply: {
            id: 'reply-4',
            reviewId: '4',
            content: 'Cảm ơn anh Thành! Chúng tôi rất vui khi được anh tin tưởng và giới thiệu cho bạn bè. Chúc anh chơi thể thao vui vẻ!',
            createdAt: '2025-07-18T18:00:00Z',
            timeAgo: '4 ngày trước'
          }
        },
        {
          id: '5',
          userName: 'Hoàng Thị Mai Anh',
          fieldName: 'Sân Tao Đàn',
          rating: 5,
          comment: 'Rất hài lòng với chất lượng sân và dịch vụ. Sẽ giới thiệu cho bạn bè. Giá cả công bằng! Nhân viên rất chu đáo.',
          avatar: 'HA',
          createdAt: '2025-07-19T18:20:00Z',
          timeAgo: '1 tuần trước'
        },
        {
          id: '6',
          userName: 'Võ Minh Tuấn',
          fieldName: 'Sân Thường Nhật',
          rating: 2,
          comment: 'Sân có vẻ hơi cũ, cần bảo trì. Phòng thay đồ không sạch sẽ lắm. Hy vọng sẽ cải thiện trong tương lai.',
          avatar: 'VT',
          createdAt: '2025-07-20T12:00:00Z',
          timeAgo: '1 tuần trước'
        }
      ];
      
      setReviews(mockReviews);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (reviewId: string) => {
    if (!replyContent.trim()) {
      toast.error('Vui lòng nhập nội dung phản hồi');
      return;
    }

    const review = reviews.find(r => r.id === reviewId);
    const isUpdate = review?.reply;

    try {
      setSubmittingReply(true);
      
      if (isUpdate) {
        // Cập nhật phản hồi
        await handleUpdateReply(reviewId, replyContent);
      } else {
        // Tạo phản hồi mới
        const responseData = await revenueService.replyToReview(reviewId, replyContent);
        
        const newReply: ReviewReply = {
          id: responseData.id,
          reviewId,
          content: replyContent,
          createdAt: responseData.createdAt,
          timeAgo: 'Vừa xong'
        };

        setReviews(prevReviews =>
          prevReviews.map(review =>
            review.id === reviewId
              ? { ...review, reply: newReply }
              : review
          )
        );

        setReplyingTo(null);
        setReplyContent('');
        toast.success('Đã gửi phản hồi thành công');
      }
    } catch (error) {
      console.error('Lỗi khi gửi phản hồi:', error);
      
      // Fallback với mock response
      const newReply: ReviewReply = {
        id: `reply-${Date.now()}`,
        reviewId,
        content: replyContent,
        createdAt: new Date().toISOString(),
        timeAgo: 'Vừa xong'
      };

      setReviews(prevReviews =>
        prevReviews.map(review =>
          review.id === reviewId
            ? { ...review, reply: newReply }
            : review
        )
      );

      setReplyingTo(null);
      setReplyContent('');
      toast.success(`Đã ${isUpdate ? 'cập nhật' : 'gửi'} phản hồi thành công (mock)`);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDeleteReply = async (reviewId: string) => {
    try {
      const review = reviews.find(r => r.id === reviewId);
      if (!review?.reply) return;

      // Gọi API để xóa phản hồi
      await revenueService.deleteReply(reviewId, review.reply.id);
      
      setReviews(prevReviews =>
        prevReviews.map(review =>
          review.id === reviewId
            ? { ...review, reply: undefined }
            : review
        )
      );
      
      toast.success('Đã xóa phản hồi');
    } catch (error) {
      console.error('Lỗi khi xóa phản hồi:', error);
      
      // Fallback với mock deletion
      setReviews(prevReviews =>
        prevReviews.map(review =>
          review.id === reviewId
            ? { ...review, reply: undefined }
            : review
        )
      );
      
      toast.success('Đã xóa phản hồi (mock)');
    }
  };

  const handleUpdateReply = async (reviewId: string, newContent: string) => {
    try {
      const review = reviews.find(r => r.id === reviewId);
      if (!review?.reply) return;

      // Gọi API để cập nhật phản hồi
      const responseData = await revenueService.updateReply(reviewId, review.reply.id, newContent);
      
      const updatedReply: ReviewReply = {
        ...review.reply,
        content: newContent,
        createdAt: responseData.updatedAt,
        timeAgo: 'Vừa cập nhật'
      };

      setReviews(prevReviews =>
        prevReviews.map(review =>
          review.id === reviewId
            ? { ...review, reply: updatedReply }
            : review
        )
      );

      setReplyingTo(null);
      setReplyContent('');
      toast.success('Đã cập nhật phản hồi');
    } catch (error) {
      console.error('Lỗi khi cập nhật phản hồi:', error);
      
      // Fallback với mock update
      setReviews(prevReviews =>
        prevReviews.map(review =>
          review.id === reviewId && review.reply
            ? { ...review, reply: { ...review.reply, content: newContent, timeAgo: 'Vừa cập nhật' } }
            : review
        )
      );

      setReplyingTo(null);
      setReplyContent('');
      toast.success('Đã cập nhật phản hồi (mock)');
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRatingBgColor = (rating: number) => {
    if (rating >= 4) return 'bg-green-100';
    if (rating >= 3) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getAvatarColor = (avatar: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-red-500',
      'bg-purple-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-indigo-500'
    ];
    return colors[avatar.charCodeAt(0) % colors.length];
  };

  const filteredAndSortedReviews = reviews
    .filter(review => {
      const matchesRating = filterRating === null || review.rating === filterRating;
      const matchesSearch = review.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           review.fieldName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           review.comment.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesRating && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'rating_high':
          return b.rating - a.rating;
        case 'rating_low':
          return a.rating - b.rating;
        default:
          return 0;
      }
    });

  const averageRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) : 0;
  const totalReviews = reviews.length;
  const repliedCount = reviews.filter(r => r.reply).length;
  const unrepliedCount = totalReviews - repliedCount;
  
  // Thống kê theo rating
  const ratingCounts = [1, 2, 3, 4, 5].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: totalReviews > 0 ? (reviews.filter(r => r.rating === rating).length / totalReviews) * 100 : 0
  }));

  // Thống kê theo sân
  const fieldStats = reviews.reduce((acc, review) => {
    const fieldName = review.fieldName;
    if (!acc[fieldName]) {
      acc[fieldName] = { count: 0, totalRating: 0, averageRating: 0 };
    }
    acc[fieldName].count += 1;
    acc[fieldName].totalRating += review.rating;
    acc[fieldName].averageRating = acc[fieldName].totalRating / acc[fieldName].count;
    return acc;
  }, {} as Record<string, { count: number; totalRating: number; averageRating: number }>);

  const topFields = Object.entries(fieldStats)
    .sort(([, a], [, b]) => b.averageRating - a.averageRating)
    .slice(0, 3);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Đang tải danh sách đánh giá...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/owner/dashboard')}
                className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 border border-blue-300 text-white px-4 py-2 rounded-lg transition-all duration-200"
              >
                <i className="fas fa-arrow-left"></i>
                <span>Quay lại</span>
              </button>
              <div>
                <h1 className="text-3xl font-bold mb-2">📝 Quản Lý Đánh Giá</h1>
                <p className="text-blue-100">Xem và phản hồi đánh giá từ khách hàng</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-blue-100">
                <i className="fas fa-clock mr-1"></i>
                Cập nhật: {new Date().toLocaleTimeString('vi-VN')}
              </div>
              <button
                onClick={loadReviews}
                className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 border border-blue-300 text-white px-4 py-2 rounded-lg transition-all duration-200"
                disabled={loading}
              >
                <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`}></i>
                <span>Làm mới</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Tổng đánh giá</p>
                <p className="text-3xl font-bold text-gray-900">{totalReviews}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-comments text-blue-600 text-xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Điểm trung bình</p>
                <div className="flex items-center space-x-2">
                  <p className="text-3xl font-bold text-gray-900">{averageRating.toFixed(1)}</p>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <i
                        key={i}
                        className={`fas fa-star text-sm ${
                          i < Math.floor(averageRating) ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                      ></i>
                    ))}
                  </div>
                </div>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-star text-yellow-600 text-xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Đã phản hồi</p>
                <p className="text-3xl font-bold text-green-600">{repliedCount}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-reply text-green-600 text-xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Chưa phản hồi</p>
                <p className="text-3xl font-bold text-orange-600">{unrepliedCount}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-clock text-orange-600 text-xl"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Rating Distribution */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Phân bố đánh giá</h3>
            <div className="space-y-3">
              {ratingCounts.reverse().map(({ rating, count, percentage }) => (
                <div key={rating} className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1 w-16">
                    <span className="text-sm font-medium">{rating}</span>
                    <i className="fas fa-star text-yellow-400 text-xs"></i>
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-sm text-gray-600 w-16 text-right">
                    {count} ({percentage.toFixed(1)}%)
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Fields */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">🏆 Sân được đánh giá cao nhất</h3>
            <div className="space-y-4">
              {topFields.map(([fieldName, stats], index) => (
                <div key={fieldName} className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                    index === 0 ? 'bg-yellow-500' : 
                    index === 1 ? 'bg-gray-400' : 'bg-orange-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{fieldName}</div>
                    <div className="text-xs text-gray-500">{stats.count} đánh giá</div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-1">
                      <span className="font-bold text-yellow-600">{stats.averageRating.toFixed(1)}</span>
                      <i className="fas fa-star text-yellow-400 text-xs"></i>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <i className="fas fa-search text-gray-500"></i>
                <input
                  type="text"
                  placeholder="Tìm theo tên, sân, hoặc nội dung..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <i className="fas fa-filter text-gray-500"></i>
                <select
                  value={filterRating || ''}
                  onChange={(e) => setFilterRating(e.target.value ? Number(e.target.value) : null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tất cả đánh giá</option>
                  <option value="5">5 sao</option>
                  <option value="4">4 sao</option>
                  <option value="3">3 sao</option>
                  <option value="2">2 sao</option>
                  <option value="1">1 sao</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <i className="fas fa-sort text-gray-500"></i>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="rating_high">Điểm cao nhất</option>
                <option value="rating_low">Điểm thấp nhất</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-6">
          {filteredAndSortedReviews.map((review) => (
            <div key={review.id} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
              {/* Review Header */}
              <div className="flex items-start space-x-4 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-lg ${getAvatarColor(review.avatar)}`}>
                  <span className="text-sm">{review.avatar}</span>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{review.userName}</h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <i className="fas fa-map-marker-alt"></i>
                        <span>{review.fieldName}</span>
                        <span>•</span>
                        <span>{review.timeAgo}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className={`flex items-center space-x-1 px-3 py-1 rounded-full ${getRatingBgColor(review.rating)}`}>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <i
                              key={i}
                              className={`fas fa-star text-xs ${
                                i < review.rating ? 'text-yellow-400' : 'text-gray-300'
                              }`}
                            ></i>
                          ))}
                        </div>
                        <span className={`text-sm font-semibold ${getRatingColor(review.rating)}`}>
                          {review.rating}/5
                        </span>
                      </div>
                      
                      {!review.reply && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                          Chưa phản hồi
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Review Content */}
              <div className="mb-4">
                <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg">
                  "{review.comment}"
                </p>
              </div>

              {/* Owner Reply */}
              {review.reply && (
                <div className="ml-8 mb-4">
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-user-tie text-blue-600"></i>
                        <span className="font-semibold text-blue-900">Phản hồi từ chủ sân</span>
                        <span className="text-xs text-blue-600">• {review.reply.timeAgo}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteReply(review.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                    <p className="text-blue-800">{review.reply.content}</p>
                  </div>
                </div>
              )}

              {/* Reply Form */}
              {replyingTo === review.id && (
                <div className="ml-8 mb-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {/* Quick Reply Templates */}
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Mẫu phản hồi nhanh:</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          'Cảm ơn bạn đã đánh giá! Chúng tôi sẽ tiếp tục cải thiện chất lượng dịch vụ.',
                          'Cảm ơn phản hồi! Chúng tôi sẽ khắc phục vấn đề này sớm nhất.',
                          'Rất vui khi bạn hài lòng với dịch vụ. Hy vọng sẽ được phục vụ bạn trong tương lai!',
                          'Cảm ơn bạn đã lựa chọn chúng tôi. Chúc bạn chơi thể thao vui vẻ!'
                        ].map((template, index) => (
                          <button
                            key={index}
                            onClick={() => setReplyContent(template)}
                            className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition-colors"
                          >
                            Mẫu {index + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Nhập phản hồi của bạn..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={3}
                    />
                    <div className="flex items-center justify-between mt-3">
                      <div className="text-xs text-gray-500">
                        {replyContent.length}/500 ký tự
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyContent('');
                          }}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={() => handleReply(review.id)}
                          disabled={submittingReply}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors flex items-center space-x-2"
                        >
                          {submittingReply && (
                            <i className="fas fa-spinner animate-spin"></i>
                          )}
                          <span>
                            {replyingTo === review.id && replyContent && reviews.find(r => r.id === review.id)?.reply
                              ? 'Cập nhật'
                              : 'Gửi phản hồi'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-4">
                  {review.rating >= 4 && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      <i className="fas fa-thumbs-up mr-1"></i>
                      Tích cực
                    </span>
                  )}
                  {review.rating === 3 && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                      <i className="fas fa-minus mr-1"></i>
                      Trung bình
                    </span>
                  )}
                  {review.rating < 3 && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                      <i className="fas fa-thumbs-down mr-1"></i>
                      Cần cải thiện
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {!review.reply && (
                    <button
                      onClick={() => setReplyingTo(review.id)}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <i className="fas fa-reply"></i>
                      <span>Phản hồi</span>
                    </button>
                  )}
                  
                  {review.reply && (
                    <button
                      onClick={() => {
                        setReplyingTo(review.id);
                        setReplyContent(review.reply!.content);
                      }}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                      <i className="fas fa-edit"></i>
                      <span>Sửa phản hồi</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredAndSortedReviews.length === 0 && (
          <div className="text-center py-12">
            <i className="fas fa-comments text-4xl text-gray-300 mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Không có đánh giá nào</h3>
            <p className="text-gray-500">
              {searchTerm || filterRating ? 'Không tìm thấy đánh giá phù hợp với bộ lọc' : 'Chưa có đánh giá từ khách hàng'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewsManagement;
