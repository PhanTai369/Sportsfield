import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { Camera } from 'lucide-react';

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  bio: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth: string;
  address: string;
  profileImage: string;
}

interface PasswordChange {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function EditProfile() {
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    phone: '',
    bio: '',
    gender: 'other',
    dateOfBirth: '',
    address: '',
    profileImage: '',
  });
  const [passwordData, setPasswordData] = useState<PasswordChange>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    toast.dismiss(); // Dismiss any existing toasts
    try {
      console.log(localStorage.getItem('token'));
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          bio: data.bio || '',
          gender: data.gender || 'other',
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split('T')[0] : '',
          address: data.address || '',
          profileImage: data.profileImage || '',
        });
      }
    } catch (error) {
      toast.error('Không thể tải thông tin hồ sơ', {
        duration: 2000,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    let loadingToast;
    try {
      
      toast.dismiss();
      loadingToast = toast.loading('Đang cập nhật thông tin...', {
        duration: 3000, 
      });

      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });

      const data = await response.json();

      if (response.ok) {

        if (loadingToast) {
          toast.dismiss(loadingToast);
        }
        
        toast.success('Cập nhật thông tin thành công', {
          duration: 2000,
        });
        await fetchProfile(); 
      } else {
        throw new Error(data.message || 'Cập nhật thông tin thất bại');
      }
    } catch (error) {

      if (loadingToast) {
        toast.dismiss(loadingToast);
      }

      toast.error(error instanceof Error ? error.message : 'Cập nhật thông tin thất bại', {
        duration: 2000,
      });
    } finally {

      setLoading(false);
      

      if (loadingToast) {
        toast.dismiss(loadingToast);
      }
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageLoading(true);
    toast.dismiss(); // Dismiss any existing toasts
    const loadingToast = toast.loading('Đang tải ảnh lên...', {
      duration: Infinity,
    });

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/profile/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      const data = await response.json();
      toast.dismiss(loadingToast);

      if (response.ok) {
        setProfile(prev => ({ ...prev, profileImage: data.profileImage }));
        toast.success('Cập nhật ảnh đại diện thành công', {
          duration: 2000,
        });
      } else {
        toast.error(data.message || 'Tải ảnh lên thất bại', {
          duration: 2000,
        });
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Tải ảnh lên thất bại', {
        duration: 2000,
      });
    } finally {
      setImageLoading(false);
    }
  };

  const handleDeleteImage = async () => {
    toast.dismiss(); // Dismiss any existing toasts
    const loadingToast = toast.loading('Đang xóa ảnh...', {
      duration: Infinity,
    });

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/profile/image`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      toast.dismiss(loadingToast);
      
      if (response.ok) {
        setProfile(prev => ({ ...prev, profileImage: '' }));
        toast.success('Xóa ảnh thành công', {
          duration: 2000,
        });
      } else {
        const data = await response.json();
        toast.error(data.message || 'Xóa ảnh thất bại', {
          duration: 2000,
        });
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Xóa ảnh thất bại', {
        duration: 2000,
      });
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Mật khẩu mới không khớp', {
        duration: 2000,
      });
      return;
    }

    setPasswordLoading(true);
    toast.dismiss(); // Dismiss any existing toasts
    const loadingToast = toast.loading('Đang đổi mật khẩu...', {
      duration: Infinity,
    });

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await response.json();
      toast.dismiss(loadingToast);

      if (response.ok) {
        toast.success('Đổi mật khẩu thành công', {
          duration: 2000,
        });
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        toast.error(data.message || 'Đổi mật khẩu thất bại', {
          duration: 2000,
        });
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Đổi mật khẩu thất bại', {
        duration: 2000,
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Edit Profile</h1>

        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div className="relative">
              {profile.profileImage ? (
                <img
                  src={profile.profileImage}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">No Image</span>
                </div>
              )}
              <button
                type="button"
                onClick={triggerFileInput}
                className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full hover:bg-primary/90"
              >
                <Camera className="w-5 h-5" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            {profile.profileImage && (
              <Button
                variant="destructive"
                onClick={handleDeleteImage}
                className="mt-4"
              >
                Delete Image
              </Button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <Input
              value={profile.name}
              onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <Input
              type="email"
              value={profile.email}
              disabled
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <Input
              value={profile.phone}
              onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Bio</label>
            <Textarea
              value={profile.bio}
              onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
              className="h-24"
              placeholder="Write something about yourself..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Gender</label>
            <Select
              value={profile.gender}
              onValueChange={(value: 'male' | 'female' | 'other') => 
                setProfile(prev => ({ ...prev, gender: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
            <Input
              type="date"
              value={profile.dateOfBirth}
              onChange={(e) => setProfile(prev => ({ ...prev, dateOfBirth: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <Input
              value={profile.address}
              onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Enter your address"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>

        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Change Password</h2>
          <form onSubmit={handlePasswordChange} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Current Password</label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  required
                  className="pr-10 w-full"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center z-10 hover:text-gray-600"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  <i className={`fas ${showCurrentPassword ? 'fa-eye-slash' : 'fa-eye'} text-gray-400`}></i>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">New Password</label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  required
                  className="pr-10 w-full"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center z-10 hover:text-gray-600"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  <i className={`fas ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'} text-gray-400`}></i>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                  className="pr-10 w-full"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center z-10 hover:text-gray-600"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} text-gray-400`}></i>
                </button>
              </div>
            </div>

            <Button type="submit" disabled={passwordLoading} className="w-full">
              {passwordLoading ? 'Changing Password...' : 'Change Password'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
} 