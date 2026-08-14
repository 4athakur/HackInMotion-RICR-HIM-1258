import { format } from 'date-fns';

/**
 * Parses date into year, month (1-indexed), day without timezone skewing
 */
export function parseDateComponents(dateVal: any): { year: number; month: number; day: number; dateString: string } {
  if (!dateVal) {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      dateString: format(now, 'yyyy-MM-dd')
    };
  }

  if (typeof dateVal === 'string') {
    const match = dateVal.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const day = parseInt(match[3], 10);
      return {
        year,
        month,
        day,
        dateString: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      };
    }
  }

  const d = new Date(dateVal);
  if (isNaN(d.getTime())) {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      dateString: format(now, 'yyyy-MM-dd')
    };
  }

  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return {
    year,
    month,
    day,
    dateString: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  };
}

/**
 * Format a date safely without timezone day-shift
 */
export function formatSafeDate(dateVal: any, formatPattern: string = 'MMM dd, yyyy'): string {
  if (!dateVal) return '';
  const { year, month, day } = parseDateComponents(dateVal);
  const localDate = new Date(year, month - 1, day);
  return format(localDate, formatPattern);
}

/**
 * Get normalized YYYY-MM-DD string
 */
export function toSafeISODate(dateVal: any): string {
  const { dateString } = parseDateComponents(dateVal);
  return dateString;
}

/**
 * Get SQL date range strings for a given month and year
 */
export function getMonthRange(year?: number, month?: number): { firstDay: string; lastDay: string; year: number; month: number } {
  const now = new Date();
  const targetYear = year || now.getFullYear();
  const targetMonth = month || (now.getMonth() + 1);

  const firstDay = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
  const lastDayNum = new Date(targetYear, targetMonth, 0).getDate();
  const lastDay = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`;

  return {
    firstDay,
    lastDay,
    year: targetYear,
    month: targetMonth
  };
}
