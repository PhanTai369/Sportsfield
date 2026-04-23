import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
// Import centralized currency utilities
import { formatCurrencyValue as formatCurrency } from "../utils/shared/currencyUtils"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export centralized currency function
export { formatCurrency }
