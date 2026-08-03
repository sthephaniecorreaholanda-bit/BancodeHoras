export type RecordType = "WORK_DAY" | "COMPENSATED_LEAVE" | "HOLIDAY";

export type AdjustmentType = "CREDIT" | "DEBIT";

export type ManualAdjustment = {
  id: string;
  date: string; // YYYY-MM-DD
  type: AdjustmentType;
  minutes: number; // always positive; sign derived from type
  reason: string | null;
  createdAt: string;
};

export type ManualAdjustmentInput = {
  date: string;
  type: AdjustmentType;
  minutes: number;
  reason?: string | null;
};

export type TimeRecord = {
  id: number;
  date: string;
  type: RecordType;
  entryTime: string | null;
  exitTime: string | null;
  workedMinutes: number;
  balanceMinutes: number;
  note: string | null;
  createdAt: string;
};

export type TimeRecordInput = {
  date: string;
  type: RecordType;
  entryTime?: string | null;
  exitTime?: string | null;
  note?: string | null;
};

export type TimeRecordUpdate = {
  type?: RecordType;
  entryTime?: string | null;
  exitTime?: string | null;
  note?: string | null;
};

export type Settings = {
  id: number;
  defaultEntryTime: string; // HH:MM
  defaultExitTime: string; // HH:MM
  lunchBreakMinutes: number;
  goalMinutes: number | null;
};

export type SettingsUpdate = {
  defaultEntryTime?: string;
  defaultExitTime?: string;
  lunchBreakMinutes?: number;
  goalMinutes?: number | null;
};

export type Summary = {
  totalBalanceMinutes: number;
  daysWorked: number;
  compensatedLeaves: number;
  holidays: number;
  adjustmentMinutes: number;
  workedMinutes: number;
};

export type MonthlyEvolution = {
  month: number;
  year: number;
  label: string;
  cumulativeBalanceMinutes: number;
  monthBalanceMinutes: number;
};

export type MissingDay = {
  date: string;
  dayOfWeek: string;
};

export type ExportData = {
  csv: string;
  filename: string;
};

export type BulkGenerateBody = {
  year: number;
  month: number;
};

export type BulkGenerateResult = {
  created: number;
  skipped: number;
};

// ─── Report types ─────────────────────────────────────────────────────────

export type ReportRow = {
  date: string;
  type: RecordType | "ADJUSTMENT";
  entryTime: string | null;
  exitTime: string | null;
  workedMinutes: number;
  creditMinutes: number;
  debitMinutes: number;
  adjustmentMinutes: number; // net adjustments on this date (signed)
  runningBalance: number;
  note: string | null;
};

export type ReportData = {
  startDate: string;
  endDate: string;
  previousBalance: number;
  workedMinutes: number;
  creditMinutes: number;
  debitMinutes: number;
  finalBalance: number;
  sundaysWorked: number;
  sundayMinutes: number;
  holidaysWorked: number;
  holidayMinutes: number;
  nightAddMinutes: number;
  absenceMinutes: number;
  daysWorked: number;
  daysAbsent: number;
  daysOff: number;
  recordCount: number;
  adjustmentTotal: number;
  rows: ReportRow[];
};

export const DEFAULT_SETTINGS: Settings = {
  id: 1,
  defaultEntryTime: "08:00",
  defaultExitTime: "17:00",
  lunchBreakMinutes: 60,
  goalMinutes: null,
};

// ─── Vacation types ────────────────────────────────────────────────────────

export type VacationPeriod = {
  id: number;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  note: string | null;
  createdAt: string;
};

export type VacationPeriodInput = {
  startDate: string;
  endDate: string;
  note?: string | null;
};

export type VacationPeriodUpdate = {
  startDate?: string;
  endDate?: string;
  note?: string | null;
};

// ─── Work Schedule (Jornada) types ────────────────────────────────────────

/** 0 = Sunday … 6 = Saturday (same as Date.getDay()) */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type DaySchedule = {
  active: boolean;           // is this a working day?
  entryTime: string;         // HH:MM
  exitTime: string;          // HH:MM
  lunchBreakMinutes: number;
};

/**
 * A versioned work schedule. Multiple entries may exist, each starting on
 * `effectiveFrom`. The one with the latest effectiveFrom ≤ a given date is
 * used for calculations on that date.
 */
export type WorkSchedule = {
  id: string;
  name: string;
  effectiveFrom: string; // YYYY-MM-DD
  days: Record<number, DaySchedule>; // keys 0-6
};

export type WorkScheduleInput = Omit<WorkSchedule, "id">;

// ─── Month stats (for the header balance widget) ──────────────────────────

export type MonthStats = {
  /** Total accumulated balance (all time) */
  totalBalanceMinutes: number;
  /** Minutes worked so far in the current month */
  workedMinutes: number;
  /** Expected minutes from month start → today (based on schedule) */
  plannedMinutes: number;
  /** worked − planned */
  differenceMinutes: number;
  /** Absolute debit accumulated in current month */
  monthDebitMinutes: number;
};
