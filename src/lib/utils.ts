import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as currency using the specified currency code.
 * Defaults to GTQ (Guatemalan Quetzal) if no currency is provided.
 *
 * @param amount - The numeric amount to format
 * @param currency - The currency code (e.g., 'GTQ', 'USD'). Defaults to 'GTQ'
 * @returns Formatted currency string (e.g., "Q 1,234.56")
 */
export function formatMoney(amount: number, currency: string = 'GTQ'): string {
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: currency || 'GTQ',
  }).format(amount)
}
