/**
 * Timezone utilities for consistent handling of timezone conversions across the application
 */

import { format, addMinutes, parseISO, startOfDay } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { parse } from 'date-fns';

/**
 * Converts a local time string to UTC Date object
 * 
 * @param date The date string in "YYYY-MM-DD" format
 * @param timeStr The time string in "HH:MM" format
 * @param timezone The timezone string (e.g., "America/New_York")
 * @returns A Date object representing the UTC time
 */
export const convertLocalToUTC = (
  date: string, 
  timeStr: string, 
  timezone = 'UTC'
): Date => {
  // Create a date object with local date and time
  const dateTimeStr = `${date}T${timeStr}:00`;
  
  try {
    if (timezone === 'UTC') {
      // If already in UTC, just create the date
      return new Date(`${dateTimeStr}Z`);
    }
    
    // Create date object for local time
    const localDate = new Date(`${dateTimeStr}`);
    
    // Get the timestamp that represents this same time in the source timezone
    const localDateInTz = new Date(localDate.toLocaleString('en-US', { timeZone: timezone }));
    
    // Calculate the timezone difference for this specific date (accounting for DST)
    const tzDiff = localDate.getTime() - localDateInTz.getTime();
    
    // Apply the difference to get UTC
    return new Date(localDate.getTime() + tzDiff);
  } catch (error) {
    console.error(`Error converting local time to UTC: ${error instanceof Error ? error.message : String(error)}`);
    // Fallback to direct UTC conversion if there's an error
    const dateParts = date.split('-').map(Number);
    const timeParts = timeStr.split(':').map(Number);
    
    const year = dateParts[0] || 0;
    const month = (dateParts[1] || 1) - 1; // Months are 0-indexed in Date
    const day = dateParts[2] || 1;
    const hours = timeParts[0] || 0;
    const minutes = timeParts[1] || 0;
    
    return new Date(Date.UTC(year, month, day, hours, minutes, 0));
  }
};

/**
 * Converts a UTC Date object to a local time string in the specified timezone
 * 
 * @param utcDate UTC Date object to convert
 * @param timezone The timezone string (e.g., "America/New_York")
 * @param formatStr Optional format string for the output (default: "HH:mm")
 * @returns Time string in the local timezone
 */
export const convertUTCToLocal = (
  utcDate: Date, 
  timezone = 'UTC',
  formatStr = 'HH:mm'
): string => {
  try {
    if (timezone === 'UTC') {
      return format(utcDate, formatStr);
    }
    
    // Convert the UTC date to an ISO string and create a new date
    // This ensures we're working with the correct UTC time
    const utcDateStr = utcDate.toISOString();
    const utcDateTime = new Date(utcDateStr);
    
    // Format the date in the target timezone using date-fns-tz
    return formatInTimeZone(utcDateTime, timezone, formatStr);
  } catch (error) {
    console.error(`Error converting UTC to local time: ${error instanceof Error ? error.message : String(error)}`);
    // Fallback to standard formatting
    return format(utcDate, formatStr);
  }
};

/**
 * Converts a time string from one timezone to another
 * Uses the current date as context for DST-aware conversions
 * 
 * @param timeStr The time string in "HH:MM" format
 * @param fromTimezone Source timezone (e.g., "America/New_York")
 * @param toTimezone Target timezone (e.g., "Europe/London")
 * @returns Time string in the target timezone
 */
export const convertBetweenTimezones = (
  timeStr: string, 
  fromTimezone: string, 
  toTimezone: string
): string => {
  try {
    console.log(`Converting ${timeStr} from ${fromTimezone} to ${toTimezone}`);
    
    // If both timezones are the same, no conversion needed
    if (fromTimezone === toTimezone) {
      console.log(`Same timezone (${fromTimezone}), no conversion needed`);
      return timeStr;
    }
    
    // Parse the time string
    const parts = timeStr.split(':');
    const hoursStr = parts[0] || '0';
    const minutesStr = parts[1] || '0';
    
    const hours = parseInt(hoursStr, 10) || 0;
    const minutes = parseInt(minutesStr, 10) || 0;
    
    // Create a date object for the time in the source timezone
    // Use the middle of the year to avoid DST edge cases
    const year = new Date().getFullYear();
    const month = 6; // July (0-indexed)
    const day = 15;
    
    // Create a date in UTC
    const utcDate = new Date(Date.UTC(year, month, day, hours, minutes, 0, 0));
    console.log(`Base UTC date: ${utcDate.toISOString()}`);
    
    // Get the timezone offset for the source timezone
    const sourceOffset = getTimezoneOffsetMinutes(fromTimezone);
    console.log(`Source timezone (${fromTimezone}) offset: ${sourceOffset} minutes`);
    
    // Adjust the UTC date to represent the local time in the source timezone
    const adjustedDate = new Date(utcDate.getTime() - sourceOffset * 60 * 1000);
    console.log(`Adjusted date for source timezone: ${adjustedDate.toISOString()}`);
    
    // Format the time in the target timezone
    const result = formatInTimeZone(adjustedDate, toTimezone, 'HH:mm');
    console.log(`Result in target timezone (${toTimezone}): ${result}`);
    
    console.log(`✅ TIMEZONE CONVERSION: ${timeStr} (${fromTimezone}) => ${result} (${toTimezone})`);
    return result;
  } catch (error) {
    console.error(`Error converting between timezones: ${error instanceof Error ? error.message : String(error)}`);
    console.log(`Failed conversion from ${fromTimezone} to ${toTimezone} for time ${timeStr}. Trying fallback...`);
    
    // Fallback method using direct offset calculation
    try {
      // Get the numeric offset in minutes between the two timezones
      const fromOffset = getTimezoneOffsetMinutes(fromTimezone) || 0;
      const toOffset = getTimezoneOffsetMinutes(toTimezone) || 0;
      const offsetDiff = fromOffset - toOffset;
      console.log(`Fallback method - offsets: ${fromTimezone}=${fromOffset}, ${toTimezone}=${toOffset}, diff=${offsetDiff}`);
      
      // Parse the time string safely
      const parts = timeStr.split(':');
      const hoursStr = parts[0] || '0';
      const minutesStr = parts[1] || '0';
      
      const hours = parseInt(hoursStr, 10) || 0;
      const minutes = parseInt(minutesStr, 10) || 0;
      
      // Apply the offset difference
      let totalMinutes = hours * 60 + minutes + offsetDiff;
      
      // Handle day boundaries
      while (totalMinutes < 0) totalMinutes += 24 * 60;
      totalMinutes = totalMinutes % (24 * 60);
      
      // Convert back to hours and minutes
      const resultHours = Math.floor(totalMinutes / 60);
      const resultMinutes = totalMinutes % 60;
      
      // Format as HH:MM
      const result = `${resultHours.toString().padStart(2, '0')}:${resultMinutes.toString().padStart(2, '0')}`;
      console.log(`Fallback conversion result: ${result}`);
      return result;
    } catch (fallbackError) {
      console.error('Fallback timezone conversion also failed:', fallbackError);
      return timeStr; // Return original if all conversion attempts fail
    }
  }
};

/**
 * Gets timezone offset in minutes for a specific date
 * 
 * @param timezone The timezone string
 * @param date The date to get the offset for (to account for DST)
 * @returns Timezone offset in minutes
 */
export const getTimezoneOffsetMinutes = (
  timezone: string,
  date: Date = new Date()
): number => {
  try {
    if (timezone === 'UTC') return 0;
    
    // Get the target date in the timezone and in UTC
    const targetTzTime = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    const utcTime = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    
    // Calculate the difference in minutes
    return (targetTzTime.getTime() - utcTime.getTime()) / (60 * 1000);
  } catch (error) {
    console.error(`Error getting timezone offset: ${error instanceof Error ? error.message : String(error)}`);
    return 0; // Default to UTC
  }
};

/**
 * Formats availability blocks for tutor availability editor
 * Converts UTC times from DB to local timezone for display
 * 
 * @param availability Record of UTC time blocks by day of week from database
 * @param timezone The timezone to convert to
 * @returns Record of local time blocks by day of week
 */
export const formatAvailabilityForDisplay = (
  availability: Record<string, Array<{ start: string; end: string }>>,
  timezone = 'UTC'
): Record<string, Array<{ start: string; end: string }>> => {
  console.log(`Formatting availability for display in timezone: ${timezone}`);
  console.log(`Input availability:`, JSON.stringify(availability));
  
  const localAvailability: Record<string, Array<{ start: string; end: string }>> = {};
  
  for (const day in availability) {
    if (availability[day] && Array.isArray(availability[day])) {
      console.log(`Converting day ${day} slots from UTC to ${timezone}:`);
      localAvailability[day] = availability[day].map(slot => {
        console.log(`  Before conversion: slot.start=${slot.start}, slot.end=${slot.end}`);
        console.log(`  Converting from 'UTC' to '${timezone}'`);
        
        const localStart = convertBetweenTimezones(slot.start, 'UTC', timezone);
        const localEnd = convertBetweenTimezones(slot.end, 'UTC', timezone);
        
        console.log(`  After conversion: localStart=${localStart}, localEnd=${localEnd}`);
        console.log(`  Day ${day}: UTC ${slot.start}-${slot.end} -> Local ${localStart}-${localEnd}`);
        
        return {
          start: localStart,
          end: localEnd
        };
      });
    } else {
      localAvailability[day] = [];
    }
  }
  
  console.log(`Output availability:`, JSON.stringify(localAvailability));
  return localAvailability;
};

/**
 * Prepares availability blocks for storage in the database
 * Converts local timezone times to UTC for storage
 * 
 * @param availability Record of local time blocks by day of week
 * @param timezone The timezone to convert from
 * @returns Record of UTC time blocks by day of week for database
 */
export const formatAvailabilityForStorage = (
  availability: Record<string, Array<{ start: string; end: string }>>,
  timezone = 'UTC'
): Record<string, Array<{ start: string; end: string }>> => {
  console.log(`Formatting availability for storage from timezone: ${timezone}`);
  console.log(`Input availability (local time):`, JSON.stringify(availability));
  
  const utcAvailability: Record<string, Array<{ start: string; end: string }>> = {};
  
  for (const day in availability) {
    if (availability[day] && Array.isArray(availability[day])) {
      console.log(`Converting day "${day}" slots from ${timezone} to UTC:`);
      
      utcAvailability[day] = availability[day].map(slot => {
        console.log(`  Converting local time slot: ${slot.start}-${slot.end} in ${timezone}`);
        
        const utcStart = convertBetweenTimezones(slot.start, timezone, 'UTC');
        const utcEnd = convertBetweenTimezones(slot.end, timezone, 'UTC');
        
        console.log(`  Converted to UTC: ${utcStart}-${utcEnd}`);
        
        return {
          start: utcStart,
          end: utcEnd
        };
      });
    } else {
      utcAvailability[day] = [];
    }
  }
  
  console.log(`Output availability (UTC):`, JSON.stringify(utcAvailability));
  return utcAvailability;
};

/**
 * Formats a TimeSlot object for display in the specified timezone
 * 
 * @param slot The TimeSlot object with UTC times
 * @param timezone The timezone to format for
 * @returns TimeSlot with display times in the specified timezone
 */
export const formatTimeSlotForDisplay = (
  slot: { start: string; end: string; },
  timezone = 'UTC'
): { 
  start: string; 
  end: string; 
  displayStartTime: string; 
  displayEndTime: string;
} => {
  try {
    // console.log(`Formatting time slot for display in timezone: ${timezone}`);
    // console.log(`Input slot: start=${slot.start}, end=${slot.end}`);
    
    // Parse the ISO dates (these are already in UTC from the database)
    const startDate = new Date(slot.start);
    const endDate = new Date(slot.end);
    
    // console.log(`Parsed UTC start: ${startDate.toISOString()}`);
    // console.log(`Parsed UTC end: ${endDate.toISOString()}`);
    
    // Use formatInTimeZone to directly format the UTC dates in the user's timezone
    const displayStartTime = formatInTimeZone(startDate, timezone, 'HH:mm');
    const displayEndTime = formatInTimeZone(endDate, timezone, 'HH:mm');
    
    // console.log(`Converted to ${timezone}: start=${displayStartTime}, end=${displayEndTime}`);
    
    return {
      start: slot.start,
      end: slot.end,
      displayStartTime,
      displayEndTime
    };
  } catch (error) {
    console.error(`Error formatting time slot: ${error instanceof Error ? error.message : String(error)}`);
    // Provide default values on error
    return {
      start: slot.start,
      end: slot.end,
      displayStartTime: format(new Date(slot.start), 'HH:mm'),
      displayEndTime: format(new Date(slot.end), 'HH:mm')
    };
  }
};

/**
 * Gets the timezone offset string for a given timezone (e.g., "+05:30", "-08:00")
 * 
 * @param timezone The timezone string (e.g., "America/New_York")
 * @returns The timezone offset as a string
 */
export const getTimezoneOffsetString = (timezone = 'UTC'): string => {
  try {
    if (timezone === 'UTC') return 'Z';
    
    // Get offset in minutes
    const offsetMinutes = getTimezoneOffsetMinutes(timezone);
    
    // Format as +/-HH:MM
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
    const offsetMins = Math.abs(offsetMinutes) % 60;
    const sign = offsetMinutes >= 0 ? '+' : '-';
    
    return `${sign}${offsetHours.toString().padStart(2, '0')}:${offsetMins.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error(`Error getting timezone offset string: ${error instanceof Error ? error.message : String(error)}`);
    return 'Z'; // Default to UTC if there's an error
  }
};

/**
 * Formats a date with time for display in the specified timezone
 * 
 * @param date The date to format (as Date object or ISO string)
 * @param timezone The timezone to format in
 * @param formatStr Optional format string (default: "EEEE, MMMM d, yyyy 'at' h:mm a")
 * @returns Formatted date string in the specified timezone
 */
export const formatDateTimeForDisplay = (
  date: Date | string,
  timezone = 'UTC',
  formatStr = "EEEE, MMMM d, yyyy 'at' h:mm a"
): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Use date-fns-tz formatInTimeZone function
    return formatInTimeZone(dateObj, timezone, formatStr);
  } catch (error) {
    console.error(`Error formatting date for display: ${error instanceof Error ? error.message : String(error)}`);
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, formatStr);
  }
};

/**
 * Formats a lesson time range for display in the specified timezone
 * 
 * @param startTime The start time (Date object or ISO string)
 * @param duration Duration in minutes
 * @param timezone The timezone to format in
 * @returns Formatted time range string (e.g., "3:30 PM - 4:30 PM")
 */
export const formatLessonTimeRange = (
  startTime: Date | string,
  duration: number,
  timezone = 'UTC'
): string => {
  try {
    const startDate = typeof startTime === 'string' ? new Date(startTime) : startTime;
    const endDate = addMinutes(startDate, duration);
    
    // Use date-fns-tz for formatting with timezone
    const startFormatted = formatInTimeZone(startDate, timezone, 'h:mm a');
    const endFormatted = formatInTimeZone(endDate, timezone, 'h:mm a');
    
    return `${startFormatted} - ${endFormatted}`;
  } catch (error) {
    console.error(`Error formatting lesson time range: ${error instanceof Error ? error.message : String(error)}`);
    const startDate = typeof startTime === 'string' ? new Date(startTime) : startTime;
    const endDate = addMinutes(startDate, duration);
    return `${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`;
  }
}; 

  // Get the current local time in the selected timezone
  export const getCurrentTimeInTimezone = (tz: string): string => {
    try {
      const now = new Date();
      return now.toLocaleTimeString('en-US', { 
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return 'Invalid timezone';
    }
  };