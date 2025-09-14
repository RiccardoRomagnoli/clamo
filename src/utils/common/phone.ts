/**
 * Utilities for phone number formatting and validation
 */

/**
 * Removes trailing zeros from a phone number string (after stripping non-digits).
 *
 * @param phoneNumber - The phone number as a string
 * @returns The phone number with trailing zeros removed
 */
export function removeTrailingZerosFromPhone(phoneNumber: string): string {
  // Remove all non-digit characters, then remove trailing zeros
  return phoneNumber.replace(/[^0-9]/g, '').replace(/^0+/, '');
} 