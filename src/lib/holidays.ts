const BRAZIL_HOLIDAYS_2025: string[] = [
  "2025-01-01", "2025-04-18", "2025-04-19", "2025-04-21",
  "2025-05-01", "2025-06-19", "2025-09-07", "2025-10-12",
  "2025-11-02", "2025-11-15", "2025-11-20", "2025-12-25",
];

const BRAZIL_HOLIDAYS_2026: string[] = [
  "2026-01-01", "2026-04-03", "2026-04-05", "2026-04-21",
  "2026-05-01", "2026-06-04", "2026-09-07", "2026-10-12",
  "2026-11-02", "2026-11-15", "2026-11-20", "2026-12-25",
];

const ALL_HOLIDAYS = new Set([...BRAZIL_HOLIDAYS_2025, ...BRAZIL_HOLIDAYS_2026]);

export function getBrazilHolidays(): Set<string> {
  return ALL_HOLIDAYS;
}

export function isHoliday(dateStr: string): boolean {
  return ALL_HOLIDAYS.has(dateStr);
}

export function isSunday(dateStr: string): boolean {
  return new Date(dateStr + "T12:00:00").getDay() === 0;
}

export function isWorkday(dateStr: string): boolean {
  if (isSunday(dateStr)) return false;
  if (ALL_HOLIDAYS.has(dateStr)) return false;
  return true;
}
