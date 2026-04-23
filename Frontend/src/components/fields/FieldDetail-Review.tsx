import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config/api';

interface Review {
  id: string;
  user_id: string;
  field_id: string;
  rating: number;
  comment: string;
  images?: string[];
  created_at: string;
  user: {
    id: string;
    name: string;
    profileImage?: string;
  };
  reply?: {
    id: string;
    content: string;
    created_at: string;
    timeAgo: string;
  };
}

interface FieldReviewsProps {
  fieldId: string;
  user: any;
}

const FieldReviews: React.FC<FieldReviewsProps> = ({ fieldId, user }) => {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [canReview, setCanReview] = useState<boolean>(false);
  const [hasReviewed, setHasReviewed] = useState<boolean>(false);
  const [reviewLoading, setReviewLoading] = useState<boolean>(false);
  // Thêm state cho chỉnh sửa review
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editReviewId, setEditReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState<number>(0);
  const [editComment, setEditComment] = useState<string>('');
  const [editImageFiles, setEditImageFiles] = useState<File[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const reviewsPerPage = 5;
  const [imageFiles, setImageFiles] = useState<File[]>([]); // Lưu file ảnh
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setReviewLoading(true);
        // Lấy danh sách đánh giá
        const response = await axios.get(`${API_BASE_URL}/reviews/field/${fieldId}`, {
          headers: user?.id ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}
        });
        setReviews(response.data.data || []);
        setCanReview(response.data.canReview || false);
        // Không cần lấy booking_id nữa
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Lỗi khi tải dữ liệu đánh giá');
      } finally {
        setReviewLoading(false);
      }
    };
    if (fieldId) fetchReviews();
  }, [fieldId, user]);

  // Đảm bảo hasReviewed luôn đúng khi reload trang
  useEffect(() => {
    if (user?.id && reviews.length > 0) {
      setHasReviewed(reviews.some(r => r.user_id === user.id));
    } else if (!user?.id) {
      setHasReviewed(false);
    }
  }, [user, reviews]);

  const handlePinMyReview = () => {
    if (!user?.id) return;
    const idx = reviews.findIndex(r => r.user_id === user.id);
    if (idx !== -1) {
      setReviews(prev => {
        const updated = [...prev];
        const [myReview] = updated.splice(idx, 1);
        return [myReview, ...updated];
      });
    }
  };

  // Khi bấm chỉnh sửa review
  const handleEditMyReview = async () => {
    if (!user?.id) return;
    const myReview = reviews.find(r => r.user_id === user.id);
    if (myReview) {
      setEditReviewId(myReview.id);
      setEditRating(myReview.rating);
      setEditComment(myReview.comment || '');
      // Fetch các ảnh cũ về dạng File
      if (myReview.images && myReview.images.length > 0) {
        const files: File[] = await Promise.all(
          myReview.images.map(async (url, idx) => {
            const res = await fetch(url);
            const blob = await res.blob();
            const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
            return new File([blob], `review-img-${idx}.${ext}`, { type: blob.type });
          })
        );
        setEditImageFiles(files);
      } else {
        setEditImageFiles([]);
      }
      setEditMode(true);
    }
  };
  const handleCancelEdit = () => {
    setEditMode(false);
    setEditReviewId(null);
    setEditRating(0);
    setEditComment('');
    setEditImageFiles([]);
  };

  // Kéo thả ảnh
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length + imageFiles.length > 3) {
      toast.error('Chỉ được chọn tối đa 3 ảnh!');
      return;
    }
    setImageFiles(prev => [...prev, ...files].slice(0, 3));
  };
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const fileArr = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileArr.length + imageFiles.length > 3) {
      toast.error('Chỉ được chọn tối đa 3 ảnh!');
      return;
    }
    setImageFiles(prev => [...prev, ...fileArr].slice(0, 3));
  };
  const handleRemoveImage = (idx: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== idx));
  };
  const handleRemoveEditImage = (idx: number) => {
    setEditImageFiles(prev => prev.filter((_, i) => i !== idx));
  };

  // Handle file select for edit mode
  const handleEditFileSelect = (files: FileList | null) => {
    if (!files) return;
    const fileArr = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileArr.length + editImageFiles.length > 3) {
      toast.error('Chỉ được chọn tối đa 3 ảnh!');
      return;
    }
    setEditImageFiles(prev => [...prev, ...fileArr].slice(0, 3));
  };

  // Submit review: upload ảnh nếu có file, kết hợp với ảnh cũ (nếu đang edit)
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error('Vui lòng đăng nhập để gửi đánh giá');
      return;
    }
    if (!rating || rating < 1 || rating > 5) {
      toast.error('Vui lòng chọn điểm đánh giá từ 1 đến 5');
      return;
    }
    if (imageFiles.length > 3) {
      toast.error('Chỉ được upload tối đa 3 ảnh!');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Không tìm thấy token, vui lòng đăng nhập lại');
        return;
      }
      const formData = new FormData();
      formData.append('field_id', fieldId);
      formData.append('rating', rating.toString());
      formData.append('comment', comment);
      imageFiles.forEach(file => formData.append('images', file));
      const response = await axios.post(
        `${API_BASE_URL}/reviews/create`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      if (response.data && response.data.success) {
        setReviews((prev) => [response.data.data, ...prev]);
        setCanReview(false);
        setHasReviewed(true);
        setRating(0);
        setComment('');
        setImageFiles([]);
        toast.success('Đánh giá thành công');
      } else {
        toast.error(response.data?.message || 'Lỗi khi gửi đánh giá');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi gửi đánh giá');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editReviewId) return;
    if (!editRating || editRating < 1 || editRating > 5) {
      toast.error('Vui lòng chọn điểm đánh giá từ 1 đến 5');
      return;
    }
    if (editImageFiles.length > 3) {
      toast.error('Chỉ được upload tối đa 3 ảnh!');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Không tìm thấy token, vui lòng đăng nhập lại');
        return;
      }
      const formData = new FormData();
      formData.append('review_id', editReviewId);
      formData.append('field_id', fieldId);
      formData.append('rating', editRating.toString());
      formData.append('comment', editComment);
      editImageFiles.forEach(file => formData.append('images', file));
      const response = await axios.put(
        `${API_BASE_URL}/reviews/update`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      if (response.data && response.data.success) {
        setReviews(prev => {
          const updated = prev.map(r => r.id === editReviewId ? response.data.data : r);
          return [response.data.data, ...updated.filter(r => r.id !== editReviewId)];
        });
        setEditMode(false);
        setEditReviewId(null);
        setEditImageFiles([]);
        toast.success('Cập nhật đánh giá thành công');
      } else {
        toast.error(response.data?.message || 'Lỗi khi cập nhật đánh giá');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật đánh giá');
    }
  };

  // Tính điểm trung bình và phân bố đánh giá
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : '0.0';
  const ratingDistribution = [0, 0, 0, 0, 0];
  reviews.forEach((review) => {
    if (review.rating >= 1 && review.rating <= 5) {
      ratingDistribution[review.rating - 1]++;
    }
  });
  const totalReviews = reviews.length;
  const maxRatingCount = Math.max(...ratingDistribution, 1);

  const myReviewIdx = reviews.findIndex(r => user?.id && r.user_id === user.id);
  const myReview = myReviewIdx !== -1 ? reviews[myReviewIdx] : null;
  const otherReviews = myReviewIdx !== -1 ? reviews.filter((_, idx) => idx !== myReviewIdx) : reviews;
  const allReviews = myReview ? [myReview, ...otherReviews] : reviews;
  const paginatedReviews = allReviews.slice((currentPage - 1) * reviewsPerPage, currentPage * reviewsPerPage);
  const totalPages = Math.ceil(allReviews.length / reviewsPerPage);

  if (reviewLoading) {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Đang tải đánh giá...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
        <h2 className="text-xl font-bold mb-4">Đánh giá tổng quan</h2>
        <div className="flex items-center mb-6">
          <div className="text-4xl font-bold text-green-600 mr-6">{averageRating}</div>
          <div className="flex flex-col flex-1">
            <div className="flex items-center text-yellow-400 mb-1">
              {Array.from({ length: 5 }, (_, i) => {
                const fullStars = Math.floor(parseFloat(averageRating));
                const decimal = parseFloat(averageRating) - fullStars;

                if (i < fullStars) {
                  return <i key={i} className="fas fa-star"></i>;
                } else if (i === fullStars && decimal >= 0.25 && decimal < 0.75) {
                  return <i key={i} className="fas fa-star-half-alt"></i>;
                } else if (i === fullStars && decimal >= 0.75) {
                  return <i key={i} className="fas fa-star"></i>;
                } else {
                  return <i key={i} className="far fa-star"></i>;
                }
              })}
            </div>
            <div className="text-sm text-gray-500">{totalReviews} đánh giá</div>
          </div>
        </div>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((star) => (
            <div key={star} className="flex items-center">
              <div className="w-8 text-sm text-gray-600">{star}</div>
              <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden mr-2">
                <div
                  className="h-full bg-yellow-400 rounded-full"
                  style={{ width: `${(ratingDistribution[star - 1] / maxRatingCount) * 100}%` }}
                ></div>
              </div>
              <div className="w-8 text-sm text-gray-600 text-right">{ratingDistribution[star - 1]}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
        <h2 className="text-xl font-bold mb-4">Viết đánh giá</h2>
        {user?.id ? (
          hasReviewed ? (
            <p className="text-green-600 font-semibold">Bạn đã gửi đánh giá cho sân này.</p>
          ) : (
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Đánh giá của bạn</p>
                <div className="flex items-center space-x-1 text-2xl text-gray-300">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <i
                      key={star}
                      className={`fas fa-star cursor-pointer ${rating >= star ? 'text-yellow-400' : ''}`}
                      onClick={() => setRating(star)}
                    ></i>
                  ))}
                </div>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={4}
                placeholder="Chia sẻ trải nghiệm của bạn với sân bóng này..."
              ></textarea>
              {/* Upload ảnh giống AddFieldPage */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragActive ? 'border-blue-400 bg-blue-50' : imageFiles.length >= 3 ? 'border-gray-200 bg-gray-50' : 'border-gray-300'} ${imageFiles.length >= 3 ? 'opacity-50 cursor-not-allowed' : ''}`}
                onDragEnter={imageFiles.length < 3 ? handleDrag : undefined}
                onDragLeave={imageFiles.length < 3 ? handleDrag : undefined}
                onDragOver={imageFiles.length < 3 ? handleDrag : undefined}
                onDrop={imageFiles.length < 3 ? handleDrop : undefined}
              >
                <p className="text-lg font-medium mb-2">
                  {imageFiles.length >= 3 ? 'Đã đủ 3 ảnh - Không thể thêm nữa' : 'Kéo thả hình ảnh vào đây hoặc click để chọn'}
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={(e) => handleFileSelect(e.target.files)}
                  disabled={imageFiles.length >= 3}
                />
                <button
                  type="button"
                  className="mt-2 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  onClick={() => imageFiles.length < 3 && fileInputRef.current?.click()}
                  disabled={imageFiles.length >= 3}
                >
                  {imageFiles.length >= 3 ? 'Đã đủ ảnh' : 'Thêm hình ảnh'}
                </button>
              </div>
              <div className="flex gap-2 mt-2">
                {imageFiles.map((file, idx) => (
                  <div key={idx} className="relative w-20 h-20">
                    <img src={URL.createObjectURL(file)} alt="review-img" className="w-full h-full object-cover rounded" />
                    <button type="button" className="absolute top-0 right-0 bg-red-500 text-white rounded-full px-1 text-xs" onClick={() => handleRemoveImage(idx)}>x</button>
                  </div>
                ))}
              </div>
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg cursor-pointer"
              >
                Gửi đánh giá
              </button>
            </form>
          )
        ) : (
          <p className="text-gray-600">Vui lòng đăng nhập để gửi đánh giá.</p>
        )}
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold">Đánh giá từ người dùng</h2>
        {allReviews.length === 0 ? (
          <p className="text-gray-600">Chưa có đánh giá nào cho sân này.</p>
        ) : (
          paginatedReviews.map((review) => (
            <div key={review.id} className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-start mb-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 mr-4 overflow-hidden">
                  <img
                    src={review.user.profileImage || 'https://via.placeholder.com/48'}
                    alt={review.user.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold">{review.user.name}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(review.created_at).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <div className="flex text-yellow-400">
                  {Array.from({ length: 5 }, (_, i) => (
                    <i
                      key={i}
                      className={`${i < review.rating ? 'fas' : 'far'} fa-star`}
                    ></i>
                  ))}
                </div>
              </div>
              <p className="text-gray-700 mb-4">{review.comment || 'Không có bình luận'}</p>
              {/* Hiển thị ảnh nếu có */}
              {review.images && review.images.length > 0 && (
                <div className="flex gap-2 mb-4">
                  {review.images.map((url, idx) => (
                    <img key={idx} src={url} alt="review-img" className="w-20 h-20 object-cover rounded" />
                  ))}
                </div>
              )}
              
              {/* Phần phản hồi từ chủ sân */}
              {review.reply && (
                <div className="mt-4 ml-8 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center mr-3">
                      <i className="fas fa-user-tie text-white text-sm"></i>
                    </div>
                    <div>
                      <p className="font-semibold text-blue-900 text-sm">Phản hồi từ chủ sân</p>
                      <p className="text-xs text-blue-600">{review.reply.timeAgo}</p>
                    </div>
                  </div>
                  <p className="text-blue-800 text-sm leading-relaxed">{review.reply.content}</p>
                </div>
              )}
              
              <div className="flex justify-end text-sm">
                {review.user_id === user?.id ? (
                  <button
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-green-400 to-green-600 text-white font-semibold shadow hover:from-green-500 hover:to-green-700 transition-all duration-200"
                    onClick={handleEditMyReview}
                  >
                    <i className="fas fa-edit"></i>
                    <span>Chỉnh sửa đánh giá</span>
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            <button
              className="px-3 py-1 rounded border border-gray-300 bg-white disabled:opacity-50"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Trước
            </button>
            <span className="px-3 py-1 font-semibold">{currentPage} / {totalPages}</span>
            <button
              className="px-3 py-1 rounded border border-gray-300 bg-white disabled:opacity-50"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Tiếp
            </button>
          </div>
        )}
      </div>

      {/* Modal chỉnh sửa đánh giá */}
      {editMode && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-500" onClick={handleCancelEdit}>
              &times;
            </button>
            <h2 className="text-lg font-bold mb-4">Chỉnh sửa đánh giá</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Điểm đánh giá</p>
                <div className="flex items-center space-x-1 text-2xl text-gray-300">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <i
                      key={star}
                      className={`fas fa-star cursor-pointer ${editRating >= star ? 'text-yellow-400' : ''}`}
                      onClick={() => setEditRating(star)}
                    ></i>
                  ))}
                </div>
              </div>
              <textarea
                value={editComment}
                onChange={e => setEditComment(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={4}
                placeholder="Chia sẻ trải nghiệm của bạn với sân bóng này..."
              ></textarea>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Ảnh (tối đa 3):</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={e => handleEditFileSelect(e.target.files)}
                  disabled={editImageFiles.length >= 3}
                />
                <div className="flex gap-2 mt-2">
                  {editImageFiles.map((file, idx) => (
                    <div key={idx} className="relative w-20 h-20">
                      <img src={URL.createObjectURL(file)} alt="review-img" className="w-full h-full object-cover rounded" />
                      <button type="button" className="absolute top-0 right-0 bg-red-500 text-white rounded-full px-1 text-xs" onClick={() => handleRemoveEditImage(idx)}>x</button>
                    </div>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg cursor-pointer w-full"
              >
                Lưu thay đổi
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldReviews;