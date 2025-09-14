/**
 * Utilities for handling PostgreSQL array types in database queries
 */

/**
 * Parses a PostgreSQL array string representation into a JavaScript array
 * 
 * @param pgArrayString - PostgreSQL array string e.g. "{English,Spanish,French}"
 * @returns JavaScript array of strings or empty array if invalid input
 */
export function parsePostgresArray(pgArrayString: string | null | undefined): string[] {
  if (!pgArrayString) {
    return [];
  }
  
  // Handle PostgreSQL array format like {English,Spanish}
  const match = pgArrayString.match(/\{(.*?)\}/);
  if (match && match[1]) {
    return match[1].split(',').map(s => s.trim());
  }
  
  return [];
}