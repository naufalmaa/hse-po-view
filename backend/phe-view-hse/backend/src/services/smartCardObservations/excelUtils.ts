import XLSX from 'xlsx';
import fs from 'fs/promises';
import { parse, isValid, format as formatDate } from 'date-fns';

// Helper function to cleanup temp files with retry mechanism
export async function cleanupTempFile(filePath: string, maxRetries = 3): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await fs.unlink(filePath);
      return;
    } catch (error: any) {
      if (error.code === 'EBUSY' && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }
      return;
    }
  }
}

export function normalizeExcelString(value: any): string {
  if (!value) return '';
  const normalized = value
    .toString()
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
  return normalized;
}

// Parse Excel date value
export function parseExcelDate(value: any): string | null {
  if (!value) return null;

  try {
    // If it's already a Date object
    if (value instanceof Date) {
      return isValid(value) ? formatDate(value, 'yyyy-MM-dd') : null;
    }

    // If it's a number (Excel serial date)
    if (typeof value === 'number') {
      const date = XLSX.SSF.parse_date_code(value);
      const d = new Date(date.y, date.m - 1, date.d);
      return isValid(d) ? formatDate(d, 'yyyy-MM-dd') : null;
    }

    // If it's a string
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;

      // Try MM/DD/YYYY first as requested
      const parsedMMDDYYYY = parse(trimmed, 'MM/dd/yyyy', new Date());
      if (isValid(parsedMMDDYYYY)) {
        return formatDate(parsedMMDDYYYY, 'yyyy-MM-dd');
      }

      // Fallback to standard Date parsing
      const fallbackDate = new Date(trimmed);
      if (isValid(fallbackDate)) {
        return formatDate(fallbackDate, 'yyyy-MM-dd');
      }
    }

    const date = new Date(value);
    if (isValid(date)) {
      return formatDate(date, 'yyyy-MM-dd');
    }

    return null;
  } catch {
    return null;
  }
}

// Parse boolean dari Excel
export function parseBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return ['ya', 'yes', 'true', '1', 'iya'].includes(lower);
  }
  return false;
}
