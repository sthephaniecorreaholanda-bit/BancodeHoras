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
