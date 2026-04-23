import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../../contexts/authContext";
import Navbar from "../home/navbar";
import Footer from "../home/footer";
import { Camera } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { showToast } from "../../utils/toast";
import { toast } from "sonner";

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  address: string;
  gender: "Nam" | "Nữ" | "Khác";
  dateOfBirth: string;
  bio: string;
  role: string;
  profileImage: string;
  is_active: boolean;
  created_at: string;
}

const Profile: React.FC = () => {
  const location = useLocation();
  const isOwner = location.pathname.startsWith("/owner");
  const [activeTab, setActiveTab] = useState("thongtin");
  const [isEditing, setIsEditing] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState<ProfileData>({
    name: "",
    email: "",
    phone: "",
    address: "",
    gender: "Nam",
    dateOfBirth: "",
    bio: "",
    role: "",
    profileImage: "",
    is_active: true,
    created_at: "",
  });

  // Thêm state để backup dữ liệu gốc
  const [originalProfileData, setOriginalProfileData] = useState<ProfileData>({
    name: "",
    email: "",
    phone: "",
    address: "",
    gender: "Nam",
    dateOfBirth: "",
    bio: "",
    role: "",
    profileImage: "",
    is_active: true,
    created_at: "",
  });

  // Thêm state cho form đổi mật khẩu
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (isInitialLoad) {
      fetchProfileData();
      setIsInitialLoad(false);
    }
  }, [user, navigate, isInitialLoad]);

  const fetchProfileData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found in localStorage");
        navigate("/auth");
        return;
      }

      // Use different endpoints based on user role
      const endpoint = isOwner ? "/owners/profile" : "/users/profile";
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}${endpoint}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        console.error("Unauthorized access - invalid or expired token");
        localStorage.removeItem("token");
        navigate("/auth");
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { data } = await response.json();

      const profileDataFromServer = {
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
        gender:
          data.gender === "male"
            ? "Nam" as const
            : data.gender === "female"
            ? "Nữ" as const
            : "Khác" as const,
        dateOfBirth: data.dateOfBirth || "",
        bio: data.bio || "",
        role: data.role || "",
        profileImage: data.profileImage || "",
        is_active: data.is_active || true,
        created_at: data.created_at || "",
      };

      setProfileData(profileDataFromServer);
      // Lưu backup dữ liệu gốc
      setOriginalProfileData(profileDataFromServer);

      if (data.profileImage && user) {
        updateUser({ ...user, profileImage: data.profileImage });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      showToast.profile.fetchError();
    }
  };

  const handleSubmit = async () => {
    if (loading) return;

    setLoading(true);
    toast.dismiss();
    const loadingToast = toast.loading("Đang cập nhật thông tin...", {
      description: "Vui lòng đợi trong giây lát",
      duration: 3000,
    });

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.dismiss(loadingToast);
        showToast.auth.sessionExpired();
        navigate("/auth");
        return;
      }

      // Use different endpoints based on user role
      const endpoint = isOwner ? "/owners/profile" : "/users/profile";
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}${endpoint}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: profileData.name,
            phone: profileData.phone,
            address: profileData.address,
            gender:
              profileData.gender === "Nam"
                ? "male"
                : profileData.gender === "Nữ"
                ? "female"
                : "other",
            dateOfBirth: profileData.dateOfBirth,
            bio: profileData.bio,
          }),
        }
      );

      toast.dismiss(loadingToast);

      if (response.status === 401) {
        showToast.auth.sessionExpired();
        localStorage.removeItem("token");
        navigate("/auth");
        return;
      }

      const { success, data } = await response.json();

      if (success) {
        showToast.profile.updateSuccess();
        setIsEditing(false);
        
        setProfileData({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          gender:
            data.gender === "male"
              ? "Nam" as const
              : data.gender === "female"
              ? "Nữ" as const
              : "Khác" as const,
          dateOfBirth: data.dateOfBirth || "",
          bio: data.bio || "",
          role: data.role || "",
          profileImage: data.profileImage || "",
          is_active: data.is_active || true,
          created_at: data.created_at || "",
        });

        // Cập nhật backup data sau khi save thành công
        setOriginalProfileData({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          gender:
            data.gender === "male"
              ? "Nam" as const
              : data.gender === "female"
              ? "Nữ" as const
              : "Khác" as const,
          dateOfBirth: data.dateOfBirth || "",
          bio: data.bio || "",
          role: data.role || "",
          profileImage: data.profileImage || "",
          is_active: data.is_active || true,
          created_at: data.created_at || "",
        });

        if (data.profileImage && user) {
          updateUser({
            ...user,
            profileImage: data.profileImage,
          });
        }
      } else {
        throw new Error("Failed to update profile");
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      showToast.profile.updateError();
    } finally {
      setLoading(false);
      toast.dismiss(loadingToast);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      showToast.error("Vui lòng chọn một ảnh để tải lên");
      return;
    }

    // Kiểm tra kích thước file (giới hạn 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast.error("Kích thước ảnh quá lớn", "Vui lòng chọn ảnh dưới 5MB");
      return;
    }

    // Kiểm tra định dạng file
    const validTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!validTypes.includes(file.type)) {
      showToast.error(
        "Định dạng ảnh không hợp lệ",
        "Chỉ chấp nhận định dạng JPEG, PNG hoặc GIF"
      );
      return;
    }

    setImageLoading(true);
    // Lưu ID của toast loading để có thể dismiss nó sau khi hoàn thành
    const toastId = toast.loading("Đang tải ảnh lên...", {
      description: "Vui lòng đợi trong giây lát",
    });

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.dismiss(toastId);
        showToast.auth.sessionExpired();
        navigate("/auth");
        return;
      }

      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/users/profile/image`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      // Dismiss loading toast
      toast.dismiss(toastId);

      if (response.status === 401) {
        showToast.auth.sessionExpired();
        localStorage.removeItem("token");
        navigate("/auth");
        return;
      }

      const data = await response.json();

      if (data.success && data.data.profileImage) {
        // Cập nhật state ngay lập tức với URL ảnh mới
        setProfileData((prev) => ({
          ...prev,
          profileImage: data.data.profileImage,
        }));

        // Cập nhật backup data
        setOriginalProfileData((prev) => ({
          ...prev,
          profileImage: data.data.profileImage,
        }));

        // Cập nhật user context
        if (user) {
          updateUser({
            ...user,
            profileImage: data.data.profileImage,
          });
        }

        // Hiển thị toast thành công
        showToast.profile.imageUploadSuccess();
      } else {
        throw new Error(data.message || "Failed to upload image");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      // Đảm bảo loading toast được dismiss trong trường hợp có lỗi
      toast.dismiss(toastId);
      showToast.profile.imageUploadError(
        error instanceof Error ? error.message : undefined
      );
    } finally {
      setImageLoading(false);
      // Reset input file để có thể upload lại cùng một ảnh nếu muốn
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteImage = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found in localStorage");
        navigate("/auth");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/users/profile/image`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Cập nhật state ngay lập tức, xóa ảnh
        setProfileData((prev) => ({
          ...prev,
          profileImage: "",
        }));

        // Cập nhật backup data
        setOriginalProfileData((prev) => ({
          ...prev,
          profileImage: "",
        }));

        // Cập nhật user context
        if (user) {
          updateUser({
            ...user,
            profileImage: "",
          });
        }

        showToast.profile.imageDeleteSuccess();
      } else {
        throw new Error(data.message || "Failed to delete image");
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      showToast.profile.imageDeleteError();
    }
  };

  const formatRole = (role: string) => {
    switch (role) {
      case "customer":
        return "Người dùng";
      case "owner":
        return "Chủ sân";
      case "admin":
        return "Quản trị viên";
      default:
        return role;
    }
  };

  const formatDate = (date: string) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("vi-VN");
  };

  const getJoinedDuration = (created_at: string) => {
    if (!created_at) return "";
    const joinDate = new Date(created_at);
    const now = new Date();
    const diffMonths =
      (now.getFullYear() - joinDate.getFullYear()) * 12 +
      (now.getMonth() - joinDate.getMonth());
    return `${diffMonths} tháng`;
  };

  // Thêm hàm xử lý đổi mật khẩu
  const handlePasswordChange = async () => {
    if (!validatePasswordForm()) return;

    setIsSubmitting(true);
    toast.dismiss();
    const loadingToast = toast.loading("Đang cập nhật mật khẩu...", {
      description: "Vui lòng đợi trong giây lát",
      duration: 3000,
    });

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.dismiss(loadingToast);
        showToast.auth.sessionExpired();
        navigate("/auth");
        return;
      }

      // Kiểm tra token có hợp lệ không
      const tokenParts = token.split(".");
      if (tokenParts.length !== 3) {
        toast.dismiss(loadingToast);
        showToast.auth.invalidSession();
        localStorage.removeItem("token");
        navigate("/auth");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/users/change-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword,
          }),
        }
      );

      // Dismiss loading toast before showing result
      toast.dismiss(loadingToast);

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Đổi mật khẩu thành công", {
          duration: 2000,
        });
        // Reset form
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        // Xử lý các trường hợp lỗi cụ thể
        if (response.status === 401) {
          if (data.message === "Current password is incorrect") {
            toast.error("Mật khẩu hiện tại không đúng", {
              duration: 2000,
            });
          } else {
            showToast.auth.sessionExpired();
            localStorage.removeItem("token");
            navigate("/auth");
          }
        } else {
          toast.error(data.message || "Đổi mật khẩu thất bại", {
            duration: 2000,
          });
        }
      }
    } catch (error) {
      console.error("Error changing password:", error);
      toast.dismiss(loadingToast);
      toast.error("Đổi mật khẩu thất bại", {
        duration: 2000,
      });
    } finally {
      setIsSubmitting(false);
      // Ensure loading toast is dismissed in any case
      toast.dismiss(loadingToast);
    }
  };

  // Thêm hàm validate form mật khẩu
  const validatePasswordForm = () => {
    const errors = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };
    let isValid = true;

    if (!passwordForm.currentPassword) {
      errors.currentPassword = "Vui lòng nhập mật khẩu hiện tại";
      isValid = false;
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = "Vui lòng nhập mật khẩu mới";
      isValid = false;
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = "Mật khẩu mới phải có ít nhất 8 ký tự";
      isValid = false;
    } else if (!/[A-Z]/.test(passwordForm.newPassword)) {
      errors.newPassword = "Mật khẩu mới phải có ít nhất 1 chữ hoa";
      isValid = false;
    } else if (!/[a-z]/.test(passwordForm.newPassword)) {
      errors.newPassword = "Mật khẩu mới phải có ít nhất 1 chữ thường";
      isValid = false;
    } else if (!/[0-9]/.test(passwordForm.newPassword)) {
      errors.newPassword = "Mật khẩu mới phải có ít nhất 1 số";
      isValid = false;
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = "Vui lòng xác nhận mật khẩu mới";
      isValid = false;
    } else if (passwordForm.confirmPassword !== passwordForm.newPassword) {
      errors.confirmPassword = "Mật khẩu xác nhận không khớp";
      isValid = false;
    }

    if (!isValid) {
      // Hiển thị lỗi đầu tiên tìm thấy
      const firstError = Object.values(errors).find((error) => error !== "");
      if (firstError) {
        showToast.error(firstError);
      }
    }

    setPasswordErrors(errors);
    return isValid;
  };

  const handleFacebookLink = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        showToast.auth.sessionExpired();
        navigate("/auth");
        return;
      }

      // Mở cửa sổ popup để đăng nhập Facebook
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      window.open(
        `${import.meta.env.VITE_API_URL}/auth/facebook`,
        "FacebookAuth",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Lắng nghe sự kiện từ popup
      window.addEventListener("message", async (event) => {
        if (event.origin !== import.meta.env.VITE_API_URL) return;

        if (event.data.success) {
          showToast.success("Liên kết Facebook thành công");
          // Cập nhật thông tin user nếu cần
        } else {
          showToast.error("Không thể liên kết Facebook", event.data.message);
        }
      });
    } catch (error) {
      showToast.error(
        "Không thể liên kết Facebook",
        "Đã có lỗi xảy ra, vui lòng thử lại sau"
      );
    }
  };

  const handleGoogleUnlink = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        showToast.auth.sessionExpired();
        navigate("/auth");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/google/unlink`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        showToast.success("Hủy liên kết Google thành công");
        // Cập nhật thông tin user nếu cần
      } else {
        const data = await response.json();
        throw new Error(data.message);
      }
    } catch (error) {
      showToast.error(
        "Không thể hủy liên kết Google",
        "Đã có lỗi xảy ra, vui lòng thử lại sau"
      );
    }
  };
  
  return (
    <>
      {!isOwner && <Navbar />}
      <div className="container mx-auto px-4 py-8 mt-16">
        {/* Profile Banner */}
        <div className="bg-gradient-to-r from-green-400 to-green-600 rounded-lg p-6 mb-6 text-white">
          <div className="flex flex-col md:flex-row items-start md:items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="relative">
                <img
                  src={
                    profileData.profileImage ||
                    "https://readdy.ai/api/search-image?query=professional%20sports%20field%20at%20sunset%20with%20stadium%20lights%2C%20vibrant%20green%20grass%2C%20high%20quality%2C%20photorealistic%2C%20detailed%20texture&width=100&height=100&seq=1&orientation=squarish"
                  }
                  alt="Profile"
                  className="w-16 h-16 rounded-full object-cover border-2 border-white"
                />
                <div className="absolute bottom-0 right-0 flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.click();
                      }
                    }}
                    className="bg-white text-green-600 rounded-full p-1 hover:bg-gray-100 border border-green-600"
                    disabled={imageLoading}
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-bold">{profileData.name}</h2>
                <p className="text-sm text-white/80">
                  {profileData.bio || "Chưa có giới thiệu"}
                </p>
                <div className="flex items-center mt-1 space-x-2">
                  <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">
                    {formatRole(profileData.role)}
                  </span>
                  <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">
                    Đã tham gia {getJoinedDuration(profileData.created_at)}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 md:mt-0 md:ml-auto flex flex-col items-end">
              <div className="flex items-center mb-2">
                <span className="text-sm mr-2">
                  Mức độ hoàn thành hồ sơ: 100%
                </span>
              </div>
              <div className="w-60 bg-white/30 rounded-full h-2">
                <div
                  className="bg-white h-2 rounded-full"
                  style={{ width: "100%" }}
                ></div>
              </div>
              <button className="mt-2 bg-white/20 hover:bg-white/30 text-white text-sm px-3 py-1 rounded !rounded-button whitespace-nowrap cursor-pointer">
                Xem trước hồ sơ
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b dark:border-gray-700">
          <div className="flex space-x-6">
            <button
              className={`pb-2 px-1 ${
                activeTab === "thongtin"
                  ? "text-green-600 border-b-2 border-green-600 font-medium"
                  : "text-gray-500 dark:text-gray-400"
              } cursor-pointer`}
              onClick={() => handleTabChange("thongtin")}
            >
              <i className="fas fa-user-circle mr-2"></i>
              Thông tin
            </button>
            <button 
              className={`pb-2 px-1 ${activeTab === 'baomat' ? 'text-green-600 border-b-2 border-green-600 font-medium' : 'text-gray-500 dark:text-gray-400'} cursor-pointer`}
              onClick={() => handleTabChange('baomat')}
            >
              <i className="fas fa-shield-alt mr-2"></i>
              Bảo mật
            </button>
          </div>
        </div>

        {/* Personal Information Form */}
        {activeTab === "thongtin" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center text-green-600">
                <i className="fas fa-user-edit mr-2"></i>
                <h3 className="text-lg font-medium dark:text-white">
                  Thông tin cá nhân
                </h3>
              </div>
              <div className="flex gap-3">
                {isEditing && (
                  <button
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 !rounded-button whitespace-nowrap cursor-pointer"
                    onClick={() => {
                      setIsEditing(false);
                      // Reset form data về trạng thái gốc từ backup
                      setProfileData(originalProfileData);
                    }}
                  >
                    <i className="fas fa-times mr-1"></i>
                    Hủy
                  </button>
                )}
                <button
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 !rounded-button whitespace-nowrap cursor-pointer"
                  onClick={() =>
                    isEditing ? handleSubmit() : setIsEditing(true)
                  }
                  disabled={loading}
                >
                  <i
                    className={`fas ${isEditing ? "fa-save" : "fa-edit"} mr-1`}
                  ></i>
                  {isEditing ? "Lưu thay đổi" : "Chỉnh sửa"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                  <i className="fas fa-user mr-2"></i>
                  Họ và tên
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-1 focus:ring-green-500"
                  value={profileData.name}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  disabled={!isEditing}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                  <i className="fas fa-envelope mr-2"></i>
                  Email
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-1 focus:ring-green-500"
                  value={profileData.email}
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                  <i className="fas fa-phone-alt mr-2"></i>
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-1 focus:ring-green-500"
                  value={profileData.phone}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  disabled={!isEditing}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                  <i className="fas fa-calendar-alt mr-2"></i>
                  Ngày sinh
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-1 focus:ring-green-500"
                  value={profileData.dateOfBirth}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      dateOfBirth: e.target.value,
                    }))
                  }
                  disabled={!isEditing}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                  <i className="fas fa-venus-mars mr-2"></i>
                  Giới tính
                </label>
                <div className="flex space-x-4 mt-2">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="gender-male"
                      name="gender"
                      className="w-4 h-4 text-green-600 border-gray-300 dark:border-gray-600 focus:ring-green-500"
                      checked={profileData.gender === "Nam"}
                      onChange={() =>
                        setProfileData((prev) => ({ ...prev, gender: "Nam" }))
                      }
                      disabled={!isEditing}
                    />
                    <label
                      htmlFor="gender-male"
                      className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      Nam
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="gender-female"
                      name="gender"
                      className="w-4 h-4 text-green-600 border-gray-300 dark:border-gray-600 focus:ring-green-500"
                      checked={profileData.gender === "Nữ"}
                      onChange={() =>
                        setProfileData((prev) => ({ ...prev, gender: "Nữ" }))
                      }
                      disabled={!isEditing}
                    />
                    <label
                      htmlFor="gender-female"
                      className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      Nữ
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="gender-other"
                      name="gender"
                      className="w-4 h-4 text-green-600 border-gray-300 dark:border-gray-600 focus:ring-green-500"
                      checked={profileData.gender === "Khác"}
                      onChange={() =>
                        setProfileData((prev) => ({ ...prev, gender: "Khác" }))
                      }
                      disabled={!isEditing}
                    />
                    <label
                      htmlFor="gender-other"
                      className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      Khác
                    </label>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                  <i className="fas fa-map-marker-alt mr-2"></i>
                  Địa chỉ
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-1 focus:ring-green-500"
                  value={profileData.address}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  disabled={!isEditing}
                />
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                    <i className="fas fa-info-circle mr-2"></i>
                    Giới thiệu bản thân
                  </label>
                  <span className="text-xs text-gray-400">
                    Tối đa 500 ký tự
                  </span>
                </div>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 h-32"
                  value={profileData.bio}
                  onChange={(e) =>
                    setProfileData((prev) => ({ ...prev, bio: e.target.value }))
                  }
                  disabled={!isEditing}
                ></textarea>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab Content */}
        {activeTab === "baomat" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center text-green-600 mb-4">
              <i className="fas fa-shield-alt mr-2"></i>
              <h3 className="text-lg font-medium dark:text-white">
                Đổi mật khẩu
              </h3>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              Cập nhật mật khẩu của bạn. Mật khẩu mới phải có ít nhất 8 ký tự.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                  <i className="fas fa-lock mr-2"></i>
                  Mật khẩu hiện tại
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    className={`w-full px-3 py-2 pr-10 border ${
                      passwordErrors.currentPassword
                        ? "border-red-500"
                        : "border-gray-300 dark:border-gray-600"
                    } dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-1 focus:ring-green-500`}
                    placeholder="Nhập mật khẩu hiện tại"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        currentPassword: e.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center z-10 hover:text-gray-600"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    <i
                      className={`fas ${
                        showCurrentPassword ? "fa-eye-slash" : "fa-eye"
                      } text-gray-400`}
                    ></i>
                  </button>
                </div>
                {passwordErrors.currentPassword && (
                  <p className="text-red-500 text-xs mt-1">
                    {passwordErrors.currentPassword}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                  <i className="fas fa-key mr-2"></i>
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    className={`w-full px-3 py-2 pr-10 border ${
                      passwordErrors.newPassword
                        ? "border-red-500"
                        : "border-gray-300 dark:border-gray-600"
                    } dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-1 focus:ring-green-500`}
                    placeholder="Nhập mật khẩu mới"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center z-10 hover:text-gray-600"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    <i
                      className={`fas ${
                        showNewPassword ? "fa-eye-slash" : "fa-eye"
                      } text-gray-400`}
                    ></i>
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <p className="text-red-500 text-xs mt-1">
                    {passwordErrors.newPassword}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                  <i className="fas fa-check-circle mr-2"></i>
                  Xác nhận mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className={`w-full px-3 py-2 pr-10 border ${
                      passwordErrors.confirmPassword
                        ? "border-red-500"
                        : "border-gray-300 dark:border-gray-600"
                    } dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-1 focus:ring-green-500`}
                    placeholder="Nhập lại mật khẩu mới"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center z-10 hover:text-gray-600"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <i
                      className={`fas ${
                        showConfirmPassword ? "fa-eye-slash" : "fa-eye"
                      } text-gray-400`}
                    ></i>
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">
                    {passwordErrors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 !rounded-button whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handlePasswordChange}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    Đang cập nhật...
                  </>
                ) : (
                  <>
                    Cập nhật mật khẩu
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
      {!isOwner && <Footer />}
    </>
  );
};

export default Profile;
