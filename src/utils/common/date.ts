import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

// Initialize the duration plugin
dayjs.extend(duration);

/**
 * Formats a duration in seconds into a human-readable string (Xh Ym Zs)
 * @param input - The duration in seconds or a dayjs duration object
 * @returns A formatted string like "1h 30m 15s" or "45m" or "0s" for zero duration
 */
export function formatDuration(input: number) {
  // Check if the input is negative
  const isNegative = input < 0;
  
  // Use absolute value for calculations
  const absInput = typeof input === 'number' 
    ? Math.abs(input) 
    : dayjs.duration(Math.abs(input), 'seconds');
  
  const d = typeof absInput === 'number' ? dayjs.duration(absInput, 'seconds') : absInput;
  const parts = [];

  if (d.hours() > 0) {
    parts.push(`${d.hours()}h`);
  }

  if (d.minutes() > 0) {
    parts.push(`${d.minutes()}m`);
  }

  if (d.seconds() > 0) {
    parts.push(`${d.seconds()}s`);
  }

  // If nothing is nonzero (duration is 0 seconds), default to 0s
  if (parts.length === 0) {
    return '0s';
  }

  // Add negative sign if the original input was negative
  return isNegative ? `-${parts.join(' ')}` : parts.join(' ');
} 