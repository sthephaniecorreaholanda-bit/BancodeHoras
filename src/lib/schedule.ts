/**
 * Work schedule (jornada) utilities.
 *
 * A WorkSchedule defines which days of the week are working days and what the
 * expected hours are for each. Multiple schedules can exist over time — each
 * has an `effectiveFrom` date so that historical records keep using the
 * schedule that was in effect when they were created.
 */

import { isHoliday } from "./holidays";
import type { DaySchedule, WorkSchedule } from "./types";

export const DAY_NAMES_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const DAY_NAMES_FULL = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

// ─── Lookup ────────────────────────────────────────────────────────────────

/** Find the most-recent schedule whose effectiveFrom ≤ date. */
export function getScheduleForDate(
  date: string,
  schedules: WorkSchedule[],
): WorkSchedule | null {
  if (!schedules.length) return null;
  const sorted = [...schedules].sort((a, b) =>
    b.effectiveFrom.localeCompare(a.effectiveFrom),
  );
  return sorted.find((s) => s.effectiveFrom <= date) ?? null;
}

/**
 * Returns the DaySchedule for a specific date, or null if that day is off
 * (or no schedule covers the date).
 */
export function getDayScheduleForDate(
  date: string,
  schedules: WorkSchedule[],
): DaySchedule | null {
  const schedule = getScheduleForDate(date, schedules);
  if (!schedule) return null;
  const dow = new Date(date + "T12:00:00").getDay();
  const day = schedule.days[dow];
  return day?.active ? day : null;
}

/** Expected net minutes for a date based on the schedule (0 = day off). */
export function standardMinutesForDate(
  date: string,
  schedules: WorkSchedule[],
): number {
  if (isHoliday(date)) return 0; // holidays always neutral
  const day = getDayScheduleForDate(date, schedules);
  if (!day) return 0;
  const e = hhmmToMin(day.entryTime);
  const x = hhmmToMin(day.exitTime);
  if (e === null || x === null) return 0;
  return Math.max(0, x - e - Math.max(0, day.lunchBreakMinutes));
}

/** True if the date is a scheduled working day (and not a holiday). */
export function isWorkdayBySchedule(
  date: string,
  schedules: WorkSchedule[],
): boolean {
  if (isHoliday(date)) return false;
  return getDayScheduleForDate(date, schedules) !== null;
}

function hhmmToMin(hhmm: string): number | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

// ─── Profiles (quick templates) ────────────────────────────────────────────

const DEFAULT_OFF: DaySchedule = {
  active: false,
  entryTime: "08:00",
  exitTime: "17:00",
  lunchBreakMinutes: 60,
};

function workDay(
  entryTime = "08:00",
  exitTime = "17:00",
  lunchBreakMinutes = 60,
): DaySchedule {
  return { active: true, entryTime, exitTime, lunchBreakMinutes };
}

export type ProfileKey = "seg-sex" | "seg-sab" | "12x36" | "custom";

export interface ScheduleProfile {
  key: ProfileKey;
  label: string;
  description: string;
  build: (effectiveFrom: string) => WorkSchedule;
}

export const SCHEDULE_PROFILES: ScheduleProfile[] = [
  {
    key: "seg-sex",
    label: "Segunda a Sexta",
    description: "08:00–17:00, almoço 1h",
    build: (effectiveFrom) => ({
      id: newId(),
      name: "Segunda a Sexta",
      effectiveFrom,
      days: {
        0: DEFAULT_OFF,
        1: workDay(),
        2: workDay(),
        3: workDay(),
        4: workDay(),
        5: workDay(),
        6: DEFAULT_OFF,
      },
    }),
  },
  {
    key: "seg-sab",
    label: "Segunda a Sábado",
    description: "Seg–Sex 08:00–17:00 · Sáb 08:00–12:00",
    build: (effectiveFrom) => ({
      id: newId(),
      name: "Segunda a Sábado",
      effectiveFrom,
      days: {
        0: DEFAULT_OFF,
        1: workDay(),
        2: workDay(),
        3: workDay(),
        4: workDay(),
        5: workDay(),
        6: workDay("08:00", "12:00", 0),
      },
    }),
  },
  {
    key: "12x36",
    label: "12×36",
    description: "Turno de 12h · todos os dias",
    build: (effectiveFrom) => ({
      id: newId(),
      name: "12×36",
      effectiveFrom,
      days: {
        0: workDay("07:00", "19:00", 60),
        1: workDay("07:00", "19:00", 60),
        2: workDay("07:00", "19:00", 60),
        3: workDay("07:00", "19:00", 60),
        4: workDay("07:00", "19:00", 60),
        5: workDay("07:00", "19:00", 60),
        6: workDay("07:00", "19:00", 60),
      },
    }),
  },
  {
    key: "custom",
    label: "Personalizado",
    description: "Defina cada dia manualmente",
    build: (effectiveFrom) => ({
      id: newId(),
      name: "Personalizado",
      effectiveFrom,
      days: {
        0: DEFAULT_OFF,
        1: workDay(),
        2: workDay(),
        3: workDay(),
        4: workDay(),
        5: workDay(),
        6: DEFAULT_OFF,
      },
    }),
  },
];

/** Build a WorkSchedule from old flat Settings (migration helper). */
export function scheduleFromSettings(
  entryTime: string,
  exitTime: string,
  lunchBreakMinutes: number,
): WorkSchedule {
  const wd = workDay(entryTime, exitTime, lunchBreakMinutes);
  const off: DaySchedule = {
    active: false,
    entryTime,
    exitTime,
    lunchBreakMinutes,
  };
  return {
    id: "migrated-from-settings",
    name: "Segunda a Sexta",
    effectiveFrom: "2020-01-01",
    days: { 0: off, 1: wd, 2: wd, 3: wd, 4: wd, 5: wd, 6: off },
  };
}

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
