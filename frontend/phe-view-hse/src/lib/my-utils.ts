import { format as formatDateFns } from "date-fns";

export function to_decimal_formatted(value: number, precision = 2) {
  const formattedNumber = new Intl.NumberFormat('en', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  }).format(value);
  return (formattedNumber);
}

export function to_decimal_compact({ value, intl = "en", maximumFractionDigits = 2 }:
  {
    value: number,
    intl?: string,
    maximumFractionDigits?: number
  }) {
  try {
    const formatter = new Intl.NumberFormat(intl, {
      notation: "compact",
      maximumFractionDigits
    });

    return formatter.format(value);
  } catch (e) {
    return (value);
  }
}

export const string_date_formatted = ({ localeId, dateString, format = 'MMM dd, yyyy' }: { localeId: string, dateString: string | undefined, format?: string }) => {
  if (!dateString) return null;

  let options: Record<string, any> = {};
  if (format === "MMM dd, yyyy") {
    options = { year: 'numeric', month: 'short', day: 'numeric' }
  } else if (format === "MMMM dd, yyyy") {
    options = { year: 'numeric', month: 'long', day: 'numeric' }
  } else if (format === "dd-MM-yyyy HH:mm") {
    options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
  } else if (format === "dd-MM-yyyy") {
    options = { year: 'numeric', month: '2-digit', day: '2-digit' }
  }
  else {
    options = { year: 'numeric', month: 'long', day: 'numeric' }
  }

  const date = new Date(dateString)
  return (date.toLocaleDateString(localeId, options))
}

export function date_to_string(value: Date, format = "yyyy-MM-dd") {
  try {
    return (formatDateFns(value, format));
  } catch (e) {
    return (formatDateFns(new Date(), format));
  }
}

export const string_to_date = (value: string, format = "yyyy-MM-dd") => {
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return new Date(); // or return null / throw an error, as needed
  }
  return date;
}

export function getShortName(fullName: string): string {
  if (!fullName) return '';

  const parts = fullName.trim().split(/\s+/);

  if (parts.length >= 2) {
    // Use first character of first two words
    return (parts[0][0] + parts[1][0]).toUpperCase();
  } else if (parts[0].length >= 2) {
    // Use first and second character if only one word
    return (parts[0][0] + parts[0][1]).toUpperCase();
  } else {
    // Fallback for very short names
    return parts[0][0].toUpperCase();
  }
}

export function excelDateToJSDate(serial: number) {
  const excelEpoch = Date.UTC(1900, 0, 1); // Excel "zero" date in UTC
  let daysOffset = serial - 1;

  // Adjust for Excel's leap year bug (dates after Feb 28, 1900)
  if (serial >= 60) {
    daysOffset--;
  }

  return new Date(excelEpoch + (daysOffset * 86400000)); // 86400000 ms in a day, result in UTC
}

export function isDateExpired(date: Date) {
  const now = new Date();
  return date < now;
}

interface DateDifferenceResult {
  days: number;
  labels: string;
  style: string;
}

export function getDaysFromCurrentDate(t: (key: string) => string, date: Date | string | number): DateDifferenceResult {
  // Ensure the input date is a valid Date object
  const inputDate = date instanceof Date ? date : new Date(date);

  if (isNaN(inputDate.getTime())) {
    return ({
      days: 0,
      labels: "",
      style: "",
    })
  }

  const currentDate = new Date();
  const differenceInMilliseconds = currentDate.getTime() - inputDate.getTime();
  const days = Math.floor(differenceInMilliseconds / (1000 * 60 * 60 * 24));

  let labels = "";
  if (days < 1) {
    labels = t("labels.today"); // today
  } else if (days < 7) {
    labels = `${days} ${t("labels.dayAgo")}`; // X days ago
  } else if (days < 30) {
    const weeks = Math.floor(days / 7);
    labels = `${weeks} ${t("labels.weekAgo")}`; // X weeks ago
  } else if (days < 365) {
    const months = Math.floor(days / 30);
    labels = `${months} ${t("labels.monthAgo")}`; // X months ago
  } else {
    const years = Math.floor(days / 365);
    labels = `${years} ${t("labels.yearAgo")}`; // X years ago
  }

  let style = 'text-foreground bg-green-100 border-green-500 dark:bg-green-900 dark:border-green-900';
  if (days < 3) {

  }
  else if (days < 7) {
    style = 'text-foreground bg-yellow-100 border-yellow-500 dark:bg-yellow-900 dark:border-yellow-900';
  }
  else if (days < 30) {
    style = 'text-foreground bg-orange-100 border-orange-500 dark:bg-orange-900 dark:border-orange-900';
  }
  else {
    style = 'text-foreground bg-gray-100 border-gray-500 dark:bg-gray-900 dark:border-gray-900';
  }
  return ({
    days: days,
    labels: labels,
    style: style,
  })
}

export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};