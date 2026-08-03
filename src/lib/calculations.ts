import { isHoliday, isSunday, isWorkday } from "./holidays";
import {
  getDayScheduleForDate,
  isWorkdayBySchedule,
  standardMinutesForDate,
} from "./schedule";
import type {
  ManualAdjustment,
  MissingDay,
  MonthlyEvolution,
  RecordType,
  ReportData,
  ReportRow,
  Settings,
  Summary,
  TimeRecord,
  TimeRecordInput,
  VacationPeriod,
  WorkSchedule,
} from "./types";

const SHORT_MONTHS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const SHORT_DAYS = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."];

export function hhmmToMin(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function computeWorkedMinutes(
  entryTime: string | null | undefined,
  exitTime: string | null | undefined,
  lunchBreakMinutes: number,
): number {
  const e = hhmmToMin(entryTime);
  const x = hhmmToMin(exitTime);
  if (e === null || x === null) return 0;
  return Math.max(0, x - e - Math.max(0, lunchBreakMinutes));
}

export function computeBalanceForRecord(
  input: TimeRecordInput,
  settings: Settings,
  schedules: WorkSchedule[] = [],
): { workedMinutes: number; balanceMinutes: number } {
  // Resolve per-day schedule overrides when available
  const daySchedule =
    schedules.length > 0 ? getDayScheduleForDate(input.date, schedules) : null;

  const defaultEntry = daySchedule?.entryTime ?? settings.defaultEntryTime;
  const defaultExit  = daySchedule?.exitTime  ?? settings.defaultExitTime;
  const lunchMin     = daySchedule?.lunchBreakMinutes ?? settings.lunchBreakMinutes;

  if (input.type === "WORK_DAY") {
    // Standard net for THIS specific date (respects schedule version)
    const standardNet =
      schedules.length > 0
        ? standardMinutesForDate(input.date, schedules)
        : computeWorkedMinutes(
            settings.defaultEntryTime,
            settings.defaultExitTime,
            settings.lunchBreakMinutes,
          );

    const effectiveEntry = input.entryTime ?? defaultEntry;
    const effectiveExit  = input.exitTime  ?? defaultExit;
    const worked = computeWorkedMinutes(effectiveEntry, effectiveExit, lunchMin);
    const balance = worked - standardNet;

    console.debug(
      `[BH] computeBalance | data=${input.date} | tipo=WORK_DAY\n` +
      `  entrada=${effectiveEntry} | saída=${effectiveExit}\n` +
      `  intervalo=${lunchMin}min\n` +
      `  standardNet=${standardNet}min | trabalhado=${worked}min | saldo=${balance}min`,
    );

    return { workedMinutes: worked, balanceMinutes: balance };
  }

  if (input.type === "COMPENSATED_LEAVE") {
    const effectiveEntry = input.entryTime ?? defaultEntry;
    const effectiveExit  = input.exitTime  ?? defaultExit;
    const deductedMinutes = computeWorkedMinutes(
      effectiveEntry,
      effectiveExit,
      lunchMin,
    );

    console.debug(
      `[BH] computeBalance | data=${input.date} | tipo=COMPENSATED_LEAVE\n` +
      `  saldo=${-deductedMinutes}min`,
    );

    return { workedMinutes: 0, balanceMinutes: -deductedMinutes };
  }

  console.debug(`[BH] computeBalance | data=${input.date} | tipo=${input.type} → saldo=0`);
  return { workedMinutes: 0, balanceMinutes: 0 };
}

export function computeSummary(
  records: TimeRecord[],
  adjustments: ManualAdjustment[] = [],
): Summary {
  let totalBalance = 0;
  let daysWorked = 0;
  let compensatedLeaves = 0;
  let holidays = 0;
  let workedMinutes = 0;

  for (const r of records) {
    totalBalance += r.balanceMinutes;
    workedMinutes += r.workedMinutes;
    if (r.type === "WORK_DAY") daysWorked += 1;
    else if (r.type === "COMPENSATED_LEAVE") compensatedLeaves += 1;
    else if (r.type === "HOLIDAY") holidays += 1;
  }

  const adjustmentMinutes = adjustments.reduce(
    (s, a) => s + (a.type === "CREDIT" ? a.minutes : -a.minutes),
    0,
  );
  totalBalance += adjustmentMinutes;

  return {
    totalBalanceMinutes: totalBalance,
    daysWorked,
    compensatedLeaves,
    holidays,
    adjustmentMinutes,
    workedMinutes,
  };
}

export function filterByMonth(
  records: TimeRecord[],
  month?: number,
  year?: number,
): TimeRecord[] {
  if (!month && !year) return [...records].sort(byDateAsc);
  return records
    .filter((r) => {
      const [yStr, mStr] = r.date.split("-");
      const y = Number(yStr);
      const m = Number(mStr);
      if (year && y !== year) return false;
      if (month && m !== month) return false;
      return true;
    })
    .sort(byDateAsc);
}

function byDateAsc(a: TimeRecord, b: TimeRecord): number {
  return a.date.localeCompare(b.date);
}

export function computeMonthlyEvolution(
  records: TimeRecord[],
  adjustments: ManualAdjustment[] = [],
): MonthlyEvolution[] {
  const byMonth = new Map<string, { year: number; month: number; total: number }>();

  for (const r of records) {
    const [yStr, mStr] = r.date.split("-");
    const y = Number(yStr);
    const m = Number(mStr);
    const key = `${y}-${String(m).padStart(2, "0")}`;
    const acc = byMonth.get(key);
    if (acc) acc.total += r.balanceMinutes;
    else byMonth.set(key, { year: y, month: m, total: r.balanceMinutes });
  }

  for (const adj of adjustments) {
    const [yStr, mStr] = adj.date.split("-");
    const y = Number(yStr);
    const m = Number(mStr);
    const key = `${y}-${String(m).padStart(2, "0")}`;
    const signed = adj.type === "CREDIT" ? adj.minutes : -adj.minutes;
    const acc = byMonth.get(key);
    if (acc) acc.total += signed;
    else byMonth.set(key, { year: y, month: m, total: signed });
  }

  const sorted = Array.from(byMonth.values()).sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month,
  );

  let cumulative = 0;
  return sorted.map((entry) => {
    cumulative += entry.total;
    return {
      month: entry.month,
      year: entry.year,
      label: `${SHORT_MONTHS[entry.month - 1]}/${entry.year}`,
      cumulativeBalanceMinutes: cumulative,
      monthBalanceMinutes: entry.total,
    };
  });
}

export function computeMissingDays(
  records: TimeRecord[],
  vacations: VacationPeriod[] = [],
  schedules: WorkSchedule[] = [],
): MissingDay[] {
  const recorded = new Set(records.map((r) => r.date));
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  const result: MissingDay[] = [];
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    if (iso >= todayIso) continue;

    // Use schedule-aware workday check when schedules available
    const working =
      schedules.length > 0 ? isWorkdayBySchedule(iso, schedules) : isWorkday(iso);
    if (!working) continue;

    if (recorded.has(iso)) continue;
    if (vacations.some((v) => iso >= v.startDate && iso <= v.endDate)) continue;
    result.push({ date: iso, dayOfWeek: SHORT_DAYS[d.getDay()] });
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export function recordsToCsv(
  records: TimeRecord[],
  adjustments: ManualAdjustment[] = [],
): string {
  const header = [
    "Data",
    "Tipo",
    "Entrada",
    "Saida",
    "Minutos Trabalhados",
    "Saldo Minutos",
    "Observacao",
  ].join(";");

  const sorted = [...records].sort(byDateAsc);
  const recordLines = sorted.map((r) =>
    [
      r.date,
      r.type,
      r.entryTime ?? "",
      r.exitTime ?? "",
      String(r.workedMinutes),
      String(r.balanceMinutes),
      (r.note ?? "").replace(/[\r\n;]+/g, " "),
    ].join(";"),
  );

  const adjLines = [...adjustments]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((a) =>
      [
        a.date,
        a.type === "CREDIT" ? "AJUSTE_CREDITO" : "AJUSTE_DEBITO",
        "",
        "",
        "",
        String(a.type === "CREDIT" ? a.minutes : -a.minutes),
        (a.reason ?? "").replace(/[\r\n;]+/g, " "),
      ].join(";"),
    );

  return [header, ...recordLines, ...adjLines].join("\n");
}

export function defaultExportFilename(): string {
  const d = new Date();
  const iso = d.toISOString().slice(0, 10);
  return `banco-horas-${iso}.csv`;
}

export function bulkGenerateInputs(
  year: number,
  month: number,
  existingDates: Set<string>,
  settings: Settings,
  schedules: WorkSchedule[] = [],
  vacations: VacationPeriod[] = [],
): { toCreate: TimeRecordInput[]; skipped: number } {
  const daysInMonth = new Date(year, month, 0).getDate();
  const toCreate: TimeRecordInput[] = [];
  let skipped = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    if (existingDates.has(iso)) {
      skipped += 1;
      continue;
    }

    // Skip vacation days
    if (vacations.some((v) => iso >= v.startDate && iso <= v.endDate)) {
      skipped += 1;
      continue;
    }

    if (schedules.length > 0) {
      // Use schedule-aware workday check
      if (!isWorkdayBySchedule(iso, schedules)) {
        skipped += 1;
        continue;
      }
      const daySchedule = getDayScheduleForDate(iso, schedules);
      toCreate.push({
        date: iso,
        type: "WORK_DAY",
        entryTime: daySchedule?.entryTime ?? settings.defaultEntryTime,
        exitTime: daySchedule?.exitTime ?? settings.defaultExitTime,
        note: null,
      });
    } else {
      // Legacy fallback
      if (isSunday(iso) || isHoliday(iso)) {
        skipped += 1;
        continue;
      }
      toCreate.push({
        date: iso,
        type: "WORK_DAY",
        entryTime: settings.defaultEntryTime,
        exitTime: settings.defaultExitTime,
        note: null,
      });
    }
  }

  return { toCreate, skipped };
}

// ─── Night-time overtime helper ───────────────────────────────────────────

function computeNightMinutes(entryTime: string, exitTime: string): number {
  const MORNING_END = 5 * 60;  // 05:00
  const NIGHT_START = 22 * 60; // 22:00

  const [eh, em] = entryTime.split(":").map(Number);
  const [xh, xm] = exitTime.split(":").map(Number);
  if (Number.isNaN(eh) || Number.isNaN(xh)) return 0;

  const entry = eh * 60 + em;
  let exit = xh * 60 + xm;
  if (exit <= entry) exit += 24 * 60; // spans midnight

  let nightMins = 0;

  // Before 05:00
  if (entry < MORNING_END) {
    nightMins += Math.min(exit, MORNING_END) - entry;
  }

  // After 22:00
  if (exit > NIGHT_START) {
    nightMins += exit - Math.max(entry, NIGHT_START);
  }

  return Math.max(0, nightMins);
}

// ─── Report computation ───────────────────────────────────────────────────

export function computeReport(
  allRecords: TimeRecord[],
  allAdjustments: ManualAdjustment[],
  startDate: string,
  endDate: string,
): ReportData {
  // Split records and adjustments into before / during the period
  const periodRecords = allRecords.filter((r) => r.date >= startDate && r.date <= endDate);
  const beforeRecords = allRecords.filter((r) => r.date < startDate);
  const periodAdjs = allAdjustments.filter((a) => a.date >= startDate && a.date <= endDate);
  const beforeAdjs = allAdjustments.filter((a) => a.date < startDate);

  // Saldo anterior
  const previousBalance =
    beforeRecords.reduce((s, r) => s + r.balanceMinutes, 0) +
    beforeAdjs.reduce((s, a) => s + (a.type === "CREDIT" ? a.minutes : -a.minutes), 0);

  // Adjustments grouped by date for period
  const adjByDate = new Map<string, number>();
  for (const adj of periodAdjs) {
    const signed = adj.type === "CREDIT" ? adj.minutes : -adj.minutes;
    adjByDate.set(adj.date, (adjByDate.get(adj.date) ?? 0) + signed);
  }

  // All dates in period that have at least one event
  const allDates = new Set([
    ...periodRecords.map((r) => r.date),
    ...periodAdjs.map((a) => a.date),
  ]);
  const sortedDates = Array.from(allDates).sort();
  const recordByDate = new Map(periodRecords.map((r) => [r.date, r]));

  let workedMinutes = 0;
  let creditMinutes = 0;
  let debitMinutes = 0;
  let sundaysWorked = 0;
  let sundayMinutes = 0;
  let holidaysWorked = 0;
  let holidayMinutes = 0;
  let nightAddMinutes = 0;
  let absenceMinutes = 0;
  let daysWorked = 0;
  let daysAbsent = 0;
  let daysOff = 0;

  let running = previousBalance;
  const rows: ReportRow[] = [];

  for (const date of sortedDates) {
    const record = recordByDate.get(date);
    const adjNet = adjByDate.get(date) ?? 0;

    if (record) {
      workedMinutes += record.workedMinutes;
      if (record.balanceMinutes > 0) creditMinutes += record.balanceMinutes;
      else if (record.balanceMinutes < 0) debitMinutes += Math.abs(record.balanceMinutes);

      if (record.type === "WORK_DAY") {
        daysWorked++;
        if (isSunday(date)) {
          sundaysWorked++;
          sundayMinutes += record.workedMinutes;
        }
        if (isHoliday(date)) {
          holidaysWorked++;
          holidayMinutes += record.workedMinutes;
        }
        if (record.entryTime && record.exitTime) {
          nightAddMinutes += computeNightMinutes(record.entryTime, record.exitTime);
        }
      } else if (record.type === "COMPENSATED_LEAVE") {
        daysAbsent++;
        absenceMinutes += Math.abs(record.balanceMinutes);
      } else if (record.type === "HOLIDAY") {
        daysOff++;
      }

      running += record.balanceMinutes + adjNet;
      rows.push({
        date,
        type: record.type,
        entryTime: record.entryTime,
        exitTime: record.exitTime,
        workedMinutes: record.workedMinutes,
        creditMinutes: Math.max(0, record.balanceMinutes),
        debitMinutes: Math.max(0, -record.balanceMinutes),
        adjustmentMinutes: adjNet,
        runningBalance: running,
        note: record.note,
      });
    } else if (adjNet !== 0) {
      // Adjustment-only day (no work record)
      running += adjNet;
      rows.push({
        date,
        type: "ADJUSTMENT",
        entryTime: null,
        exitTime: null,
        workedMinutes: 0,
        creditMinutes: Math.max(0, adjNet),
        debitMinutes: Math.max(0, -adjNet),
        adjustmentMinutes: adjNet,
        runningBalance: running,
        note: null,
      });
    }
  }

  const adjustmentTotal = periodAdjs.reduce(
    (s, a) => s + (a.type === "CREDIT" ? a.minutes : -a.minutes),
    0,
  );

  const finalBalance = previousBalance + creditMinutes - debitMinutes + adjustmentTotal;

  return {
    startDate,
    endDate,
    previousBalance,
    workedMinutes,
    creditMinutes,
    debitMinutes,
    finalBalance,
    sundaysWorked,
    sundayMinutes,
    holidaysWorked,
    holidayMinutes,
    nightAddMinutes,
    absenceMinutes,
    daysWorked,
    daysAbsent,
    daysOff,
    recordCount: periodRecords.length,
    adjustmentTotal,
    rows,
  };
}
