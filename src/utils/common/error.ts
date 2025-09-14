import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";

/**
 * Standard error codes mapped to HTTP status codes
 */
export const ERROR_CODES = {
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

/**
 * Interface for error details
 */
export interface ErrorDetails {
  message: string;
  code: keyof typeof ERROR_CODES | string;
  data?: Record<string, any>;
}

/**
 * Creates a standardized error for API responses
 * 
 * @param details - Error details including message and code
 * @returns TRPC Error object
 */
export function createError({ message, code, data }: ErrorDetails): TRPCError {
  return new TRPCError({
    code: code as any,
    message,
    cause: data,
  });
}

/**
 * Handles database errors in a standardized way
 * 
 * @param error - The error caught from a database operation
 * @param operation - The operation being performed (e.g., "fetching user profile")
 * @returns TRPC Error object
 */
export function handleDbError(error: unknown, operation: string): TRPCError {
  console.error(`Error ${operation}:`, error);
  
  // Handle Prisma specific errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Handle specific Prisma error codes
    switch (error.code) {
      case "P2002": // Unique constraint violation
        return new TRPCError({
          code: "CONFLICT",
          message: `A record with this ${error.meta?.target || "value"} already exists`,
          cause: error,
        });
        
      case "P2025": // Record not found
        return new TRPCError({
          code: "NOT_FOUND",
          message: error.meta?.cause ? String(error.meta.cause) : "Record not found",
          cause: error,
        });
        
      case "P2003": // Foreign key constraint failed
        return new TRPCError({
          code: "BAD_REQUEST",
          message: "Reference to non-existent related record",
          cause: error,
        });
        
      default:
        return new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Database error while ${operation}`,
          cause: error,
        });
    }
  }
  
  // Check if it's an Error instance
  if (error instanceof Error) {
    // Check for common database error patterns
    if (error.message.includes('not found') || error.message.includes('No rows')) {
      return createError({
        code: 'NOT_FOUND',
        message: `Resource not found while ${operation}`,
      });
    }
    
    if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
      return createError({
        code: 'BAD_REQUEST',
        message: `Duplicate entry detected while ${operation}`,
      });
    }
    
    if (error.message.includes('permission denied') || error.message.includes('access denied')) {
      return createError({
        code: 'FORBIDDEN',
        message: `Permission denied while ${operation}`,
      });
    }
  }
  
  // Default to internal server error
  return createError({
    code: 'INTERNAL_SERVER_ERROR',
    message: `An unexpected error occurred while ${operation}`,
  });
}

/**
 * Wraps an async function with standardized error handling
 * 
 * @param fn - Async function to wrap
 * @param operationName - Name of the operation for error context
 * @returns Wrapped function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operation: string
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error) {
      // Handle specific error types
      if (error instanceof TRPCError) {
        // If it's already a TRPC error, just rethrow it
        throw error;
      }
      
      // For all other errors, use our handler
      throw handleDbError(error, operation);
    }
  };
}

/**
 * Standardized error handling wrapper for synchronous functions
 *
 * @param fn - Synchronous function to wrap with error handling
 * @param operation - Description of the operation being performed (for error messages)
 * @returns Wrapped function with standardized error handling
 */
export function withSyncErrorHandling<T extends (...args: any[]) => any>(
  fn: T,
  operation: string
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args: Parameters<T>): ReturnType<T> => {
    try {
      return fn(...args);
    } catch (error) {
      // Handle specific error types
      if (error instanceof TRPCError) {
        // If it's already a TRPC error, just rethrow it
        throw error;
      }
      
      // For all other errors, use our handler
      throw handleDbError(error, operation);
    }
  };
} 