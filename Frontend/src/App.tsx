import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import Home from "./components/home/home";
import {
  AuthPage,
  VerificationSuccess,
  VerificationFailed,
} from "./components/auth";
import Profile from "./components/profile/Profile";
import Booking from "./components/booking";
import ProtectedRoute from "./lib/ProtectedRoute";
import ErrorBoundary from "./components/common/ErrorBoundary";
import ForgotPassword from "./components/auth/ForgotPassword";
import ResetPassword from "./components/auth/ResetPassword";
import EditProfile from "./components/profile/EditProfile";
import { SettingsProvider } from "./contexts/SettingsContext";
import OwnerLayout from "./components/owner/layout/OwnerLayout";
import OwnerDashboard from "./components/owner/pages/OwnerDashboard";
import PitchManagement from "./components/owner/pages/PitchManagement";
import TimeSlotManagement from "./components/owner/pages/TimeSlotManagement";
import OwnerProfile from "./components/owner/pages/OwnerProfile";
import OwnerChatPage from "./components/owner/pages/OwnerChatPage";
import OwnerReviewFields from "./components/owner/pages/OwnerReviewFields";
import ReviewsManagement from "./components/owner/pages/ReviewsManagement";
import BookingStatistics from "./components/owner/pages/BookingStatistics";
import BookingDetailPage from "./components/owner/pages/BookingDetailPage";
import AddFieldPage from "./components/owner/pages/AddFieldPage";
import EditFieldPage from "./components/owner/pages/EditFieldPage";
import PromotionManagement from "./components/owner/pages/PromotionManagement";
import Wishlist from "./components/wishlist/wishlist-page";
import PermissionWrapper from "./components/common/PermissionWrapper";
import FieldDetail from "./components/fields/FieldDetail";
import FieldsList from "./components/fields/FieldsList";
import PaymentSuccess from "./pages/payment-success";
import PaymentCancel from "./pages/payment-cancel";
import BookingHistoryPage from "./pages/BookingHistoryPage";
import { ChatPage, ChatFloatingButton } from "./components/chat";
import { ServicePlansPage, ServicePlanManagementPage } from "./components/owner/pages";
import OwnerReportsPage from "./components/owner/pages/OwnerReportsPage";
import AdminLayout from "./components/admin/layout/AdminLayout";
import CustomerList from "./components/admin/CustomerList";
import FieldsManagementPage from "./components/admin/fields/FieldsManagementPage";
import FieldDetailPage from "./components/admin/fields/FieldDetailPage";
import AdvancedSearchPage from "./pages/advanced-search";
import { Dashboard } from "./pages/admin";
import PackageServiceDetails from "./pages/admin/PackageServiceDetails";
import FieldBookingRevenueDetails from "./pages/admin/FieldBookingRevenueDetails";

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--toast-bg)",
              color: "var(--toast-text)",
              border: "1px solid var(--toast-border)",
            },
            className: "dark:bg-gray-800 dark:text-white dark:border-gray-700",
          }}
        />
        <Suspense
          fallback={
            <p className="flex items-center justify-center h-screen">
              Loading...
            </p>
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/verification-success"
              element={<VerificationSuccess />}
            />
            <Route
              path="/verification-failed"
              element={<VerificationFailed />}
            />
            <Route
              path="/wishlist"
              element={
                <PermissionWrapper
                  requiredPermission="canFavorite"
                  fallbackMessage={
                    <div className="text-center">
                      <h2 className="text-2xl font-bold text-gray-800 mb-4">
                        Tính năng không khả dụng
                      </h2>
                      <p className="text-gray-600 mb-6">
                        Tính năng yêu thích chỉ dành cho khách hàng.
                      </p>
                      <a
                        href="/owner/dashboard"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                      >
                        Về trang quản lý
                      </a>
                    </div>
                  }
                >
                  <Wishlist />
                </PermissionWrapper>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute requiredRole="customer">
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route
              path="/auth/reset-password/:token"
              element={<ResetPassword />}
            />
            <Route
              path="/profile/edit"
              element={
                <ProtectedRoute requiredRole="customer">
                  <EditProfile />
                </ProtectedRoute>
              }
            />{" "}
            {/* Field Routes */}
            <Route path="/fields/:id" element={<FieldDetail />} />
            <Route path="/fields" element={<FieldsList />} />
            <Route path="/advanced-search" element={<AdvancedSearchPage />} />

            {/* Chat Routes */}
            <Route
              path="/chat"
              element={
                <ProtectedRoute requiredRole="customer">
                  <ChatPage />
                </ProtectedRoute>
              }
            />

            {/* Booking Routes */}
            <Route
              path="/booking/:fieldId"
              element={
                <ProtectedRoute requiredRole="customer">
                  <Booking />
                </ProtectedRoute>
              }
            />

            {/* Booking History Route */}
            <Route
              path="/booking-history"
              element={
                <ProtectedRoute requiredRole="customer">
                  <BookingHistoryPage />
                </ProtectedRoute>
              }
            />

            {/* Payment Routes - Public access for confirmation page */}
            <Route
              path="/booking/confirmation"
              element={<Booking showConfirmation={true} />}
            />
            <Route
              path="/booking/:fieldId/confirmation"
              element={<Booking showConfirmation={true} />}
            />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/cancel" element={<PaymentCancel />} />
            {/* Owner Routes */}
            <Route
              path="/owner/*"
              element={
                <ProtectedRoute requiredRole="owner">
                  <OwnerLayout />
                </ProtectedRoute>
              }
            >
              {" "}              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<OwnerDashboard />} />
              <Route path="pitches" element={<PitchManagement />} />
              <Route path="add-field" element={<AddFieldPage />} />
              <Route path="edit-field/:id" element={<EditFieldPage />} />
              <Route
                path="pitches/:pitchId/timeslots"
                element={<TimeSlotManagement />}
              />
              <Route
                path="pitches/:pitchId/reviews"
                element={<OwnerReviewFields />}
              />
              <Route path="reviews" element={<OwnerReviewFields />} />
              <Route path="reviews-management" element={<ReviewsManagement />} />
              <Route
                path="bookings"
                element={<div>Bookings Coming Soon</div>}
              />
              <Route path="chat" element={<OwnerChatPage />} />
              <Route
                path="promotions"
                element={<PromotionManagement />}
              />
              <Route
                path="booking-statistics"
                element={<BookingStatistics />}
              />
              <Route path="reports" element={<OwnerReportsPage />} />
              <Route path="profile" element={<OwnerProfile />} />
              <Route path="reviews" element={<OwnerReviewFields />} />
              <Route path="service-plans" element={<ServicePlansPage />} />
              <Route path="service-plan-management" element={<ServicePlanManagementPage />} />
              <Route path="booking-statistics" element={<BookingStatistics />} />
              <Route path="booking-detail/:id" element={<BookingDetailPage />} />
              <Route path="edit-field/:id" element={<EditFieldPage />} />
            </Route>

            {/* Admin Routes */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="package-service-details" element={<PackageServiceDetails />} />
              <Route path="field-booking-revenue-details" element={<FieldBookingRevenueDetails />} />
              <Route path="customers" element={<CustomerList />} /> 
              <Route path="fields" element={<FieldsManagementPage />} />
              <Route path="fields/:id" element={<FieldDetailPage />} />
              <Route path="reports" element={<div>Reports Coming Soon</div>} />
              <Route path="settings" element={<div>Settings Coming Soon</div>} />
            </Route>
          </Routes>
        </Suspense>
      </SettingsProvider>
    </ErrorBoundary>
  );
};

export default App;
