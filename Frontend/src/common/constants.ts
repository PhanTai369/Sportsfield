export const USER_ROLES = {
  CUSTOMER: 'customer',
  OWNER: 'owner',
  ADMIN: 'admin'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const PACKAGE_TYPES = {
  NONE: 'none',
  BASIC: 'basic',
  PREMIUM: 'premium'
} as const;

export type PackageType = typeof PACKAGE_TYPES[keyof typeof PACKAGE_TYPES];

export const FIELD_STATUS = {
  VERIFIED: true,
  PENDING: false
} as const;
