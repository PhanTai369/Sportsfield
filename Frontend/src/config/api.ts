/**
 * API Configuration
 * Cấu hình các endpoints và base URL cho API
 */

// Lấy base URL từ environment variables hoặc sử dụng default
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://football-field-booking-backend.onrender.com/api";

// API endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    REFRESH: "/auth/refresh-token",
    GOOGLE: "/auth/google",
    LOGOUT: "/auth/logout",
    ME: "/auth/me",
    VERIFY_EMAIL: "/auth/verify-email",
    RESEND_VERIFICATION: "/auth/resend-verification",
    FORGOT_PASSWORD: "/auth/forgot-password",
    RESET_PASSWORD: "/auth/reset-password",
  },

  // User endpoints
  USERS: {
    PROFILE: "/users/profile",
    UPLOAD_IMAGE: "/users/profile/image",
    CHANGE_PASSWORD: "/users/change-password",
    ALL: "/users",
  },

  // Field endpoints
  FIELDS: {
    ALL: "/fields/all",
    LIST: "/fields",
    DETAIL: "/fields/:id",
    SEARCH: "/fields/search",
    CREATE: "/fields",
  },

  // Timeslot endpoints
  TIMESLOTS: {
    FIELD_SUBFIELDS: "/slots/field/:fieldId/subfields",
    TIMESLOTS: "/slots/field/:fieldId/timeslots",
    CREATE: "/slots",
    BULK_CREATE: "/slots/bulk",
    UPDATE: "/slots/:id",
    DELETE: "/slots/:id",
  },

  // Chat endpoints
  CHATS: {
    LIST: "/chats",
    CREATE: "/chats",
    DETAIL: "/chats/:chatId",
    MESSAGES: "/chats/:chatId/messages",
    MARK_READ: "/chats/:chatId/read",
    DELETE_MESSAGE: "/chats/messages/:messageId",
    UNREAD_COUNT: "/chats/unread/count",
  },

  // Favorites endpoints
  FAVORITES: {
    LIST: "/favorites",
    ADD: "/favorites",
    REMOVE: "/favorites/:fieldId",
  },

  // Reviews endpoints
  REVIEWS: {
    CREATE: "/reviews/create",
    BY_FIELD: "/reviews/field/:fieldId",
    BY_BOOKING: "/reviews/by-booking",
  },

  // Notifications endpoints
  NOTIFICATIONS: {
    LIST: "/notifications",
    MARK_READ: "/notifications/:notificationId/read",
    UNREAD_COUNT: "/notifications/unread/count",
  },

  // Owner endpoints
  OWNER: {
    PROFILE: "/owners/profile",
    UPLOAD_IMAGE: "/owners/profile/image",
    CHANGE_PASSWORD: "/owners/change-password",
  },
} as const;

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Request timeout (in milliseconds)
export const REQUEST_TIMEOUT = 10000;

// Default headers
export const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
} as const;
