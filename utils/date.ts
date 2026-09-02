/**
 * Local-timezone safe date helpers. RIFAA expense dates are stored as
 * `YYYY-MM-DD` strings built from local calendar components (never `toISOString`,
 * which shifts days across UTC boundaries).
 */

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseISODate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1);
  return next;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Build a Monday-first calendar grid for a month. `0` marks an empty cell, so
 * the grid always fills complete weeks (28–42 cells).
 */
export function monthGrid(year: number, month: number): number[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // 0 = Monday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: number[] = [];
  for (let i = 0; i < offset; i += 1) {
    cells.push(0);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }
  while (cells.length % 7 !== 0) {
    cells.push(0);
  }
  return cells;
}

/** The first of the current month. */
export function currentMonthStart(): Date {
  return startOfMonth(new Date());
}

/** Label shown next to the date field: "Today", "Yesterday", or a full date. */
export function formatDateLabel(value: string): string {
  const date = parseISODate(value);
  const today = new Date();
  if (isSameDay(date, today)) {
    return 'Today';
  }
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (isSameDay(date, yesterday)) {
    return 'Yesterday';
  }
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Full secondary date label, e.g. "2 September 2026". */
export function formatDateLong(value: string): string {
  const date = parseISODate(value);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Compact relative timestamp for notification timestamps: "Just now", "5m",
 * "2h", "3d", or a short date for anything older.
 */
export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) {
    return 'Just now';
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d`;
  }
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}