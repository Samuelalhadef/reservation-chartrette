/**
 * Utility functions for database operations
 */

/**
 * Converts empty strings to null for database insertion
 * SQLite/libSQL is strict about types - empty strings can cause issues
 * with integer fields (timestamps, booleans) and nullable text fields
 */
export function sanitizeForDb<T extends Record<string, any>>(data: T): T {
  const sanitized = { ...data };

  for (const key in sanitized) {
    const value = sanitized[key];
    // Convert empty strings to null
    if (typeof value === 'string' && value.trim() === '') {
      sanitized[key] = null as any;
    }
  }

  return sanitized;
}

/**
 * Sanitizes a single value - converts empty string to null
 */
export function sanitizeValue(value: any): any {
  if (typeof value === 'string' && value.trim() === '') {
    return null;
  }
  return value;
}
