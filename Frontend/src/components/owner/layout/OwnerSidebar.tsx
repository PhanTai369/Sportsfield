import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/authContext';
import './OwnerSidebar.css';

const OwnerSidebar: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Load collapsed state from localStorage
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  // Save collapsed state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Keyboard shortcut to toggle sidebar (Ctrl + B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsed, isAnimating]);  const navItems = [
    { icon: 'fas fa-tachometer-alt', label: 'Tổng quan', path: '/owner/dashboard', keywords: ['dashboard', 'tong quan', 'overview'] },
    { icon: 'fas fa-futbol', label: 'Sân bóng', path: '/owner/pitches', keywords: ['san bong', 'field', 'pitch'] },
    { icon: 'fas fa-comments', label: 'Chat Khách hàng', path: '/owner/chat', keywords: ['chat', 'khach hang', 'customer', 'message'] },
    { icon: 'fas fa-chart-line', label: 'Báo cáo & Thống kê', path: '/owner/reports', keywords: ['bao cao', 'thong ke', 'report', 'analytics', 'doanh thu', 'revenue'] },
    { icon: 'fas fa-percent', label: 'Ưu đãi', path: '/owner/promotions', keywords: ['uu dai', 'promotion', 'discount'] },
    { icon: 'fas fa-users', label: 'Khách hàng', path: '/owner/booking-statistics', keywords: ['khach hang', 'customer', 'user'] },
    { icon: 'fas fa-credit-card', label: 'Gói dịch vụ', path: '/owner/service-plans', keywords: ['goi dich vu', 'service', 'plan', 'package'] },
  ];

  // Filter nav items based on search term
  const filteredNavItems = navItems.filter(item => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      item.label.toLowerCase().includes(searchLower) ||
      item.keywords.some(keyword => keyword.includes(searchLower))
    );
  });const toggleSidebar = () => {
    if (isAnimating) return; // Prevent multiple clicks during animation
    
    setIsAnimating(true);
    setIsCollapsed(!isCollapsed);
    
    // Haptic feedback for mobile devices
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    // Optional: Play a subtle sound effect
    // const audio = new Audio('/sounds/click.mp3');
    // audio.volume = 0.1;
    // audio.play().catch(() => {}); // Fail silently if audio doesn't load
    
    // Reset animation state after animation completes
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
  };return (
    <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 flex flex-col animate-slideInLeft hover-glow transition-all duration-300 ease-in-out relative ${isAnimating ? (isCollapsed ? 'sidebar-expanded' : 'sidebar-collapsed') : ''}`}>
      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        disabled={isAnimating}
        className={`absolute -right-3 top-6 z-10 bg-white border border-gray-200 rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300 hover:bg-green-50 group sidebar-toggle-btn ${isAnimating ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
        title={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
      >
        <i className={`fas ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'} text-xs text-gray-600 group-hover:text-green-600 transition-all duration-300 ${isAnimating ? 'animate-pulse' : ''}`}></i>
      </button>      <div className="p-4 border-b border-gray-200 animate-fadeInDown">
        <div className={`text-xs text-gray-500 uppercase font-semibold tracking-wider transition-all duration-300 hover:text-green-600 ${isCollapsed ? 'text-center' : ''}`}>
          {isCollapsed ? (
            <img 
              src="/logoSportFields.png" 
              alt="Sport Fields Logo" 
              className="h-8 w-auto mx-auto" 
              title="Football Field Management"
            />
          ) : (
            <div className={`flex items-center gap-2 ${!isAnimating ? 'text-fade-in' : ''}`}>
              <img 
                src="/logoSportFields.png" 
                alt="Sport Fields Logo" 
                className="h-6 w-auto"
              />
              <span>FOOTBALL FIELD</span>
            </div>
          )}
        </div>
      </div>
        <div className={`p-4 border-b border-gray-200 flex items-center text-green-600 font-medium animate-fadeInDown animation-delay-100 ${isCollapsed ? 'justify-center' : ''}`}>
        <i className="fas fa-chart-bar animate-pulse"></i>
        {!isCollapsed && (
          <span className={`ml-2 transition-all duration-300 ${!isAnimating ? 'text-fade-in' : ''}`}>
            Quản lý sân bóng
          </span>
        )}
      </div><div className="p-4 animate-fadeInDown animation-delay-200">        {!isCollapsed && (
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm kiếm... (Ctrl+B để thu gọn)"
              className="search-input search-enhanced w-full py-2 pl-8 pr-3 text-sm border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300 hover:border-green-400 gpu-accelerated"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm transition-colors duration-300 icon-hover"></i>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-300"
                title="Xóa tìm kiếm"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            )}
          </div>
        )}
      </div>
        <nav className="flex-1 overflow-y-auto">        <div className="p-2">
          {filteredNavItems.length > 0 ? (
            filteredNavItems.map((item, index) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `p-2 mb-1 transition-all duration-300 transform hover:scale-105 hover:translate-x-1 ${
                    isActive 
                      ? 'bg-green-50 text-green-600 border-r-3 border-green-500 shadow-sm nav-item-active' 
                      : 'hover:bg-gray-100 text-gray-700 hover:shadow-sm nav-item-hover'
                  } 
                  rounded-l flex items-center cursor-pointer animate-fadeInUp nav-item-stagger ${isCollapsed ? 'justify-center tooltip collapsed-nav-item enhanced-tooltip' : ''} gpu-accelerated`
                }
                style={{ animationDelay: `${index * 50}ms` }}
                title={isCollapsed ? item.label : ''}
                data-tooltip={isCollapsed ? item.label : ''}
              >
                <i className={`${item.icon} ${isCollapsed ? 'text-base' : 'w-5'} transition-transform duration-300 hover:rotate-12 icon-hover`}></i>
                {!isCollapsed && (
                  <span className={`ml-2 transition-all duration-300 ${!isAnimating ? 'text-slide-in' : ''}`}>
                    {item.label}
                  </span>
                )}
              </NavLink>
            ))
          ) : (
            !isCollapsed && (
              <div className="p-4 text-center text-gray-500 text-sm animate-fadeInUp">
                <i className="fas fa-search-minus mb-2 text-lg"></i>
                <p>Không tìm thấy mục nào</p>
              </div>
            )
          )}
        </div>
      </nav>        <div className="p-4 border-t border-gray-200 animate-fadeInUp animation-delay-500">        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed ? (
            <>
              <NavLink
                to="/owner/profile"
                className={({ isActive }) =>
                  `p-2 transition-all duration-300 transform hover:scale-105 ${
                    isActive 
                      ? 'bg-green-50 text-green-600' 
                      : 'hover:bg-gray-100 text-gray-700'
                  } 
                  rounded flex items-center cursor-pointer hover:shadow-sm flex-1 mr-2 nav-item-hover`
                }
                title="Hồ sơ của tôi"
              >
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center transition-transform duration-300 hover:rotate-6">
                  {user?.profileImage ? (
                    <img src={user.profileImage} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <i className="fas fa-user text-gray-500 text-sm"></i>
                  )}
                </div>
                <span className={`ml-2 text-sm transition-all duration-300 truncate ${!isAnimating ? 'text-fade-in' : ''}`}>
                  {user?.name || 'Ông chủ sân'}
                </span>
              </NavLink>
              
              <div className="flex space-x-1">
                <button 
                  className="text-gray-500 hover:text-green-600 transition-all duration-300 transform hover:scale-110 hover:rotate-12 p-2 rounded-full hover:bg-green-50 icon-hover"
                  title="Chế độ tối"
                >
                  <i className="fas fa-moon text-sm"></i>
                </button>
                <button 
                  className="text-gray-500 hover:text-green-600 transition-all duration-300 transform hover:scale-110 hover:rotate-12 p-2 rounded-full hover:bg-green-50 icon-hover"
                  title="Cài đặt"
                >
                  <i className="fas fa-cog text-sm"></i>
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col space-y-2">
              <NavLink
                to="/owner/profile"
                className={({ isActive }) =>
                  `p-2 transition-all duration-300 transform hover:scale-105 ${
                    isActive 
                      ? 'bg-green-50 text-green-600' 
                      : 'hover:bg-gray-100 text-gray-700'
                  } 
                  rounded-full flex items-center justify-center cursor-pointer hover:shadow-sm tooltip collapsed-nav-item`
                }
                title={user?.name || 'Ông chủ sân'}
              >
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center transition-transform duration-300 hover:rotate-6">
                  {user?.profileImage ? (
                    <img src={user.profileImage} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <i className="fas fa-user text-gray-500 text-sm"></i>
                  )}
                </div>
              </NavLink>
              
              <div className="flex flex-col space-y-1">
                <button 
                  className="text-gray-500 hover:text-green-600 transition-all duration-300 transform hover:scale-110 hover:rotate-12 p-2 rounded-full hover:bg-green-50 tooltip collapsed-nav-item icon-hover" 
                  title="Chế độ tối"
                >
                  <i className="fas fa-moon text-sm"></i>
                </button>
                <button 
                  className="text-gray-500 hover:text-green-600 transition-all duration-300 transform hover:scale-110 hover:rotate-12 p-2 rounded-full hover:bg-green-50 tooltip collapsed-nav-item icon-hover" 
                  title="Cài đặt"
                >
                  <i className="fas fa-cog text-sm"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerSidebar; 