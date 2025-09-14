/**
 * Environment configuration utilities for authentication and Supabase
 * Ensures consistent behavior between development and production environments
 */

import { env } from '~/env';

/**
 * Authentication environment configuration
 * Contains settings that need to be consistent across environments
 */
export const authConfig = {
  /**
   * Cookie settings that work consistently across all environments
   */
  cookieOptions: {
    path: '/',
    sameSite: 'lax' as const,
    secure: false, // Set to false for both environments for consistency
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
  
  /**
   * Session settings
   */
  sessionConfig: {
    persistSession: true,
    detectSessionInUrl: true,
    autoRefreshToken: true,
  },
  
  /**
   * Get URL for the current environment
   * Ensures consistent handling across environments
   */
  getAppUrl: (): string => {
    return env.NEXT_PUBLIC_APP_URL;
  },
  
  /**
   * Get the site URL to use for authentication
   */
  getSiteUrl: (): string => {
    return env.NEXT_PUBLIC_APP_URL;
  },
  
  /**
   * Check if we're in development mode
   */
  isDevelopment: (): boolean => {
    return process.env.NODE_ENV === 'development';
  },
}; 