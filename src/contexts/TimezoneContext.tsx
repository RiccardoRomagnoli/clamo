'use client';

import React, { createContext, useContext, useEffect, useState } from "react";

interface TimezoneContextType {
  detectedTimezone: string;
  timezone: string;
  updateTimezone: (newTimezone: string) => void;
  /**
   * Current mode for timezone handling. "automatic" means we rely on the
   * browser-detected timezone. "manual" means the user has explicitly chosen a
   * timezone that is stored in localStorage.
   */
  mode: 'automatic' | 'manual';
  /**
   * Switches the provider back to automatic mode. This removes any persisted
   * manual selection and falls back to the browser-detected timezone.
   */
  resetToAutomatic: () => void;
  timezoneOffset: string;
  formatWithTimezone: (date: Date) => string;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

// Key used to persist a manual timezone in localStorage. Keeping it scoped here
// avoids magic strings sprinkled across the codebase.
const STORAGE_KEY = 'userTimezone';

export const TimezoneProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [detectedTimezone, setDetectedTimezone] = useState<string>("UTC");
  const [timezone, setTimezone] = useState<string>("UTC");
  const [timezoneOffset, setTimezoneOffset] = useState<string>("+00:00");

  // Track whether we are using the automatically detected timezone or a manual
  // user selection.
  const [mode, setMode] = useState<'automatic' | 'manual'>('automatic');

  // Calculate timezone offset as a string (e.g., "+01:00" or "-05:00")
  const calculateTimezoneOffset = (tz: string): string => {
    try {
      // Get current date
      const date = new Date();
      
      // Get the timezone offset for the specified timezone
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz,
        timeZoneName: 'short'
      });
      
      // Try to get timezone abbreviation (might be something like 'GMT', 'EST', etc.)
      const parts = formatter.formatToParts(date);
      const timeZonePart = parts.find(part => part.type === 'timeZoneName');
      const tzAbbr = timeZonePart?.value || '';
      
      // Map common abbreviations to offsets
      const offsetMap: Record<string, string> = {
        'EST': '-05:00',
        'EDT': '-04:00',
        'CST': '-06:00',
        'CDT': '-05:00',
        'MST': '-07:00',
        'MDT': '-06:00',
        'PST': '-08:00',
        'PDT': '-07:00',
        'GMT': '+00:00',
        'BST': '+01:00',
        'CET': '+01:00',
        'CEST': '+02:00',
      };
      
      if (tzAbbr && offsetMap[tzAbbr]) {
        return offsetMap[tzAbbr];
      }
      
      // If abbreviation not found in map, calculate directly
      const targetDate = new Date(date.toLocaleString('en-US', { timeZone: tz }));
      const diffMinutes = (targetDate.getTime() - date.getTime()) / (60 * 1000);
      
      const offsetHours = Math.floor(Math.abs(diffMinutes) / 60);
      const offsetMinutes = Math.abs(diffMinutes) % 60;
      const sign = diffMinutes >= 0 ? '+' : '-';
      
      return `${sign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error("Error calculating timezone offset:", error);
      return "+00:00"; // Default to UTC if error
    }
  };

  // Detect timezone on mount
  useEffect(() => {
    try {
      // Use Intl API to detect the browser's timezone
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log(`Detected browser timezone: ${browserTimezone}`);
      setDetectedTimezone(browserTimezone);
      
      // Calculate and store the offset for this timezone
      const offset = calculateTimezoneOffset(browserTimezone);
      console.log(`Calculated timezone offset: ${offset}`);
      setTimezoneOffset(offset);
      
      // Check if we have a stored (manual) timezone preference
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        console.log(`Using saved timezone preference: ${saved}`);
        setTimezone(saved);
        // Update offset for the saved timezone
        setTimezoneOffset(calculateTimezoneOffset(saved));
        setMode('manual');
      } else {
        // remain in automatic mode using the detected timezone
        setTimezone(browserTimezone);
        setMode('automatic');
      }
    } catch (error) {
      console.error("Failed to detect timezone:", error);
      // Fallback to UTC
      setDetectedTimezone("UTC");
      setTimezone("UTC");
      setTimezoneOffset("+00:00");
    }
  }, []);

  const updateTimezone = (newTimezone: string) => {
    console.log(`Updating timezone to: ${newTimezone}`);
    localStorage.setItem(STORAGE_KEY, newTimezone);
    setTimezone(newTimezone);
    setMode('manual');
    
    // Update offset when timezone changes
    const offset = calculateTimezoneOffset(newTimezone);
    setTimezoneOffset(offset);
  };
  
  const resetToAutomatic = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMode('automatic');
    setTimezone(detectedTimezone);
    const offset = calculateTimezoneOffset(detectedTimezone);
    setTimezoneOffset(offset);
  };
  
  // Helper function to format a date with the current timezone
  const formatWithTimezone = (date: Date): string => {
    try {
      return date.toLocaleString('en-US', { timeZone: timezone });
    } catch (error) {
      console.error("Error formatting date with timezone:", error);
      return date.toISOString();
    }
  };

  return (
    <TimezoneContext.Provider 
      value={{ 
        detectedTimezone, 
        timezone, 
        updateTimezone,
        mode,
        resetToAutomatic,
        timezoneOffset,
        formatWithTimezone
      }}
    >
      {children}
    </TimezoneContext.Provider>
  );
};

export const useTimezone = (): TimezoneContextType => {
  const context = useContext(TimezoneContext);
  if (context === undefined) {
    throw new Error("useTimezone must be used within a TimezoneProvider");
  }
  return context;
}; 