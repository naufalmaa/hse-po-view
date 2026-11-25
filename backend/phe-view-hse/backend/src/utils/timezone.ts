/**
 * Timezone Conversion Utilities
 * Converts timestamps to ISO string format
 */

/**
 * Convert Date to ISO string
 * Returns format: "YYYY-MM-DDTHH:mm:ss.sssZ"
 * 
 * @param date - Date object or ISO string from database
 * @returns ISO string, or null if invalid
 */
export function convertToISOString(date: Date | string | null | undefined): string | null {
  if (!date) return null;

  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return null;

  return d.toISOString();
}

/**
 * Convert Date to date only (YYYY-MM-DD)
 * 
 * @param date - Date object or ISO string from database
 * @returns Date string, or null if invalid
 */
export function convertToDateString(
  date: Date | string | null | undefined
): string | null {
  if (!date) return null;

  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return null;

  return d.toISOString().split('T')[0];
}

/**
 * Convert Date to time only (HH:mm:ss)
 * 
 * @param date - Date object or ISO string from database
 * @returns Time string, or null if invalid
 */
export function convertToTimeString(
  date: Date | string | null | undefined
): string | null {
  if (!date) return null;

  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return null;

  return d.toISOString().split('T')[1]?.split('.')[0] || null;
}

/**
 * Convert an object's timestamp fields to ISO string
 * Mutates common timestamp field names (createdAt, updatedAt, editedAt, etc.)
 * 
 * @param obj - Object to convert
 * @param customFields - Additional field names to convert (defaults to common names)
 * @returns New object with converted timestamps
 */
export function convertObjectTimestamps<T extends Record<string, any>>(
  obj: T,
  customFields: (keyof T)[] = []
): T {
  if (!obj || typeof obj !== 'object') return obj;

  const defaultTimestampFields = [
    'createdAt',
    'updatedAt',
    'editedAt',
    'createdDate',
    'updatedDate',
    'lastValidatedAt',
    'expiresAt',
  ];

  const allFields = [...defaultTimestampFields, ...customFields] as (keyof T)[];
  const converted = { ...obj };

  for (const field of allFields) {
    if (field in converted && converted[field]) {
      const value = converted[field] as any;
      if (value instanceof Date || typeof value === 'string') {
        const converted_timestamp = convertToISOString(value);
        if (converted_timestamp) {
          converted[field] = converted_timestamp as any;
        }
      }
    }
  }

  return converted;
}

/**
 * Convert array of objects' timestamp fields to ISO string
 * 
 * @param items - Array of objects to convert
 * @param customFields - Additional field names to convert
 * @returns New array with converted timestamps
 */
export function convertArrayTimestamps<T extends Record<string, any>>(
  items: T[],
  customFields: (keyof T)[] = []
): T[] {
  return items.map((item) => convertObjectTimestamps(item, customFields));
}

/**
 * Deep convert all timestamp fields in nested objects and arrays
 * Useful for complex response structures
 * 
 * @param data - Object to convert (can contain nested objects/arrays)
 * @returns New object with all timestamps converted recursively
 */
export function convertDeepTimestamps(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (data instanceof Date || typeof data === 'string') {
    // Check if it's an ISO timestamp string
    if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(data)) {
      return convertToISOString(data);
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => convertDeepTimestamps(item));
  }

  if (typeof data === 'object') {
    const converted: any = {};
    const timestampFields = [
      'createdAt',
      'updatedAt',
      'editedAt',
      'createdDate',
      'updatedDate',
      'lastValidatedAt',
      'expiresAt',
    ];

    for (const key in data) {
      const value = data[key];

      // Handle timestamp fields
      if (timestampFields.includes(key) && (value instanceof Date || typeof value === 'string')) {
        converted[key] = convertToISOString(value);
      } else if (typeof value === 'object') {
        // Recursively convert nested objects and arrays
        converted[key] = convertDeepTimestamps(value);
      } else {
        converted[key] = value;
      }
    }

    return converted;
  }

  return data;
}

/**
 * Create a timestamp wrapper for API responses
 * Automatically converts any timestamp fields in the response
 * 
 * @param data - Response data
 * @returns Data with converted timestamps
 */
export function wrapResponseWithTimestampConversion<T>(data: T): T {
  return convertDeepTimestamps(data);
}

// Backward compatibility aliases
export const convertUTCToWIB = convertToISOString;
export const convertUTCToWIBString = convertToDateString;
export const convertUTCToWIBDate = convertToDateString;
export const convertUTCToWIBTime = convertToTimeString;
export const convertObjectTimestampsToWIB = convertObjectTimestamps;
export const convertArrayTimestampsToWIB = convertArrayTimestamps;
export const convertDeepTimestampsToWIB = convertDeepTimestamps;
export const wrapResponseWithTimezoneConversion = wrapResponseWithTimestampConversion;
