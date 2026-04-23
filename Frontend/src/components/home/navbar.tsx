import { Link, useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "../ui/navigation-menu";
import { cn } from "../../lib/utils";
import { useState, useEffect } from "react";
import { useSocket } from "../../hooks/useSocket";
import axios from "axios";
import { useAuth } from "../../contexts/authContext";
import { usePermissions } from "../../hooks/usePermissions";
import { useSmoothScroll } from "../../hooks/useSmoothScroll";
import { Bell, Heart, History, User, LogOut, Star } from "lucide-react";
import { toast } from "../ui/use-toast";
import { SmoothDropdown, DropdownItem } from "../ui/smooth-dropdown";
import { API_BASE_URL } from "../../config/api";

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { canFavorite } = usePermissions();
  const { on } = useSocket();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasNotifications, setHasNotifications] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  // Lấy danh sách notification khi user đăng nhập
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!user || !token) return;
    axios
      .get(`${API_BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setNotifications(res.data.data || []);
        setHasNotifications((res.data.data || []).some((n: any) => !n.is_read));
      });
  }, [user, localStorage.getItem("token")]);

  // Lắng nghe socket event new_notification
  useEffect(() => {
    if (!user) return;
    const handleNewNotification = (notification: any) => {
      setNotifications((prev) => {
        const exists = prev.find((n) => n.id === notification.id);
        if (exists) {
          // Nếu đã có, cập nhật lại notification đó
          return prev.map((n) => (n.id === notification.id ? notification : n));
        }
        // Nếu chưa có, thêm mới vào đầu danh sách
        return [notification, ...prev];
      });
      setHasNotifications(true);
    };
    on && on("new_notification", handleNewNotification);
    return () => {
      // Nếu có hàm off thì off("new_notification", handleNewNotification)
    };
  }, [user, on]);

  // Initialize the smooth scrolling
  useSmoothScroll();

  const handleFavoritesClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      toast({
        title: "Bạn cần đăng nhập",
        description: "Vui lòng đăng nhập để xem danh sách yêu thích.",
        variant: "destructive",
      });
    }
  };
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 bg-white py-4 px-6 transition-all duration-300",
        isScrolled ? "shadow-md" : "shadow-sm"
      )}
    >
      <div className="container mx-auto flex items-center justify-between relative">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/logoSportFields.png"
              alt="Sport Fields Logo"
              className="h-10 w-auto"
            />
            <span className="text-green-600 font-bold text-xl">
              SPORTSFIELD
            </span>
          </Link>
        </div>
        <div className="hidden md:block">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link to="/">
                  <NavigationMenuLink
                    className={cn(
                      "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    )}
                  >
                    Trang chủ
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <a href="#san-noi-bat">
                  <NavigationMenuLink
                    className={cn(
                      "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    )}
                  >
                    Sân bóng
                  </NavigationMenuLink>
                </a>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link to="/fields">
                  <NavigationMenuLink
                    className={cn(
                      "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    )}
                  >
                    Đặt sân
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Dịch vụ</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid gap-3 p-4 md:w-[400px] md:grid-cols-2">
                    <li>
                      <NavigationMenuLink asChild>
                        <Link
                          to="/tinh-nang"
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="text-sm font-medium">Tính năng</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            Khám phá các tính năng đặc biệt
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink asChild>
                        <Link
                          to="/danh-gia"
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="text-sm font-medium">Đánh giá</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            Xem đánh giá từ người dùng
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <a href="#lien-he">
                  <NavigationMenuLink
                    className={cn(
                      "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    )}
                  >
                    Liên hệ
                  </NavigationMenuLink>
                </a>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>{" "}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <div className="relative">
                <Button
                  variant="ghost"
                  className="text-gray-800 relative"
                  onClick={() => {
                    setShowNotifications((v) => {
                      if (!v) setIsMenuOpen(false); // Đóng dropdown user nếu mở
                      return !v;
                    });
                  }}
                >
                  <Bell className="h-5 w-5" />
                  {hasNotifications && (
                    <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                  )}
                </Button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white shadow-xl rounded-xl z-50 max-h-96 min-w-[320px] border border-gray-100">
                    <div className="flex items-center px-5 py-3 border-b bg-gradient-to-r from-green-50 to-white rounded-t-xl">
                      <span className="font-semibold text-lg text-green-700">
                        Thông báo
                      </span>
                    </div>
                    {notifications.length === 0 ? (
                      <div className="p-6 text-gray-400 text-center">
                        Không có thông báo
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto custom-scrollbar">
                        {notifications.map((n, idx) => {
                          const handleNotificationClick = async () => {
                            setShowNotifications(false);
                            // Đánh dấu đã đọc notification
                            if (!n.is_read) {
                              try {
                                const token = localStorage.getItem("token");
                                await axios.put(`${API_BASE_URL}/notifications/${n.id}/read`, {}, {
                                    headers: {
                                      Authorization: `Bearer ${token}`,
                                    },
                                  }
                                );
                                setNotifications((prev) =>
                                  prev.map((item) =>
                                    item.id === n.id
                                      ? { ...item, is_read: true }
                                      : item
                                  )
                                );
                                setHasNotifications((prev) => {
                                  // Kiểm tra còn notification chưa đọc không
                                  return (
                                    prev &&
                                    notifications.some(
                                      (item) =>
                                        item.id !== n.id && !item.is_read
                                    )
                                  );
                                });
                              } catch (err) {
                                // Có thể toast lỗi nếu cần
                              }
                            }
                            if (n.title === "Tin nhắn mới") {
                              // Extract chatId from notification message
                              const chatIdMatch = n.message.match(
                                /chat:([a-f0-9\-]{36})/
                              );
                              const chatId = chatIdMatch
                                ? chatIdMatch[1]
                                : null;

                              if (user?.role === "owner") {
                                if (chatId) {
                                  navigate("/owner/chat", {
                                    state: { selectedChatId: chatId },
                                  });
                                } else {
                                  navigate("/owner/chat");
                                }
                              } else {
                                if (chatId) {
                                  navigate("/chat", {
                                    state: { selectedChatId: chatId },
                                  });
                                } else {
                                  navigate("/chat");
                                }
                              }
                            } else if (
                              n.title &&
                              n.title.toLowerCase().includes("đặt sân")
                            ) {
                              navigate("/booking-history");
                            }
                          };
                          return (
                            <button
                              type="button"
                              key={n.id || idx}
                              className={`w-full text-left px-5 py-4 bg-transparent outline-none border-0 transition-colors duration-150 group cursor-pointer ${
                                !n.is_read ? "bg-green-50" : "hover:bg-gray-50"
                              }`}
                              onClick={handleNotificationClick}
                              tabIndex={0}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={`inline-block w-2 h-2 rounded-full ${
                                    !n.is_read ? "bg-green-500" : "bg-gray-300"
                                  }`}
                                ></span>
                                <span className="font-medium text-gray-800 group-hover:text-green-700 text-base">
                                  {n.title}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 group-hover:text-gray-800">
                                {n.message
                                  .replace(/\s*\([^)]*\)\s*$/, "")
                                  .trim()}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                {n.created_at
                                  ? new Date(n.created_at).toLocaleString(
                                      "vi-VN",
                                      {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                      }
                                    )
                                  : ""}
                              </div>
                            </button>
                          );
                        })}
                        {notifications.length > 3 && (
                          <div className="flex justify-center py-2 bg-white sticky bottom-0 z-10">
                            <span className="text-xs text-green-600 font-medium">
                              Lăn chuột để xem thêm...
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <SmoothDropdown
                align="end"
                trigger={
                  <Button
                    variant="ghost"
                    className="text-gray-800 flex items-center gap-2 hover:bg-gray-100 transition-colors"
                    onClick={() => {
                      setIsMenuOpen((v) => {
                        if (!v) setShowNotifications(false); // Đóng dropdown thông báo nếu mở
                        return !v;
                      });
                    }}
                  >
                    <User className="h-5 w-5" />
                    <span className="hidden sm:inline truncate max-w-24">
                      {user.name}
                    </span>
                  </Button>
                }
              >
                <DropdownItem>
                  <Link
                    to="/profile"
                    className="flex items-center gap-3 w-full"
                  >
                    <User className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium">Tài Khoản</span>
                  </Link>
                </DropdownItem>

                {user?.role === "customer" && (
                  <DropdownItem>
                    <Link
                      to="/booking-history"
                      className="flex items-center gap-3 w-full"
                    >
                      <History className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium">
                        Lịch sử đặt sân
                      </span>
                    </Link>
                  </DropdownItem>
                )}

                {canFavorite && (
                  <DropdownItem>
                    <Link
                      to="/wishlist"
                      className="flex items-center gap-3 w-full"
                      onClick={handleFavoritesClick}
                    >
                      <Heart className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium">Sân yêu thích</span>
                    </Link>
                  </DropdownItem>
                )}

                <div className="border-t border-gray-100 my-1"></div>

                <DropdownItem variant="danger" onClick={() => logout()}>
                  <div className="flex items-center gap-3">
                    <LogOut className="h-4 w-4" />
                    <span className="text-sm font-medium">Đăng xuất</span>
                  </div>
                </DropdownItem>
              </SmoothDropdown>
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="ghost" className="text-gray-800">
                  Đăng nhập
                </Button>
              </Link>
              <Link to="/auth">
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  Đăng ký
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
