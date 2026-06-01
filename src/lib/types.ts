export type RecordType = "WORK_DAY" | "COMPENSATED_LEAVE" | "HOLIDAY";

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
  manualAdjustmentMinutes: number;
  lunchBreakMinutes: number;
  goalMinutes: number | null;
};

export type SettingsUpdate = {
  defaultEntryTime?: string;
  defaultExitTime?: string;
  manualAdjustmentMinutes?: number;
  lunchBreakMinutes?: number;
  goalMinutes?: number | null;
};

export type Summary = {
  totalBalanceMinutes: number;
  daysWorked: number;
  compensatedLeaves: number;
  holidays: number;
  manualAdjustmentMinutes: number;
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

export const DEFAULT_SETTINGS: Settings = {
  id: 1,
  defaultEntryTime: "08:00",
  defaultExitTime: "17:00",
  manualAdjustmentMinutes: 0,
  lunchBreakMinutes: 60,
  goalMinutes: null,
};
