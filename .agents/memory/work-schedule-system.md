---
name: Work Schedule System (Jornada)
description: Architecture for per-day, versioned work schedules; how they plug into calculations, storage, and the balance widget.
---

## Rule
All balance calculations must use `WorkSchedule[]` (from `bh:schedules` in localStorage), not the flat `Settings.defaultEntryTime/exitTime/lunchBreakMinutes`. Settings is only kept for `goalMinutes`.

**Why:** The schedule system supports different hours per day-of-week, multiple schedule versions with `effectiveFrom` dates, and historic accuracy.

## How to apply
- `loadRecords()` in api-local.ts calls `loadSchedules()` and passes them to `computeBalanceForRecord(input, settings, schedules)`.
- `computeBalanceForRecord` uses `getDayScheduleForDate(date, schedules)` for per-day defaults and `standardMinutesForDate(date, schedules)` for expected hours.
- `computeMissingDays` uses `isWorkdayBySchedule(date, schedules)` instead of `isWorkday`.
- `bulkGenerateInputs` accepts optional `schedules` + `vacations` params.
- Auto-migration: on first load with empty schedules, `loadSchedules()` creates a `Segunda a Sexta` schedule from old Settings (effective 2020-01-01), so existing users don't lose their setup.

## Storage
- `bh:schedules` → `WorkSchedule[]` in localStorage (array sorted by `effectiveFrom` ASC)
- `WorkSchedule.days` is a `Record<number, DaySchedule>` (0=Sun … 6=Sat)
- At least one schedule must always remain (delete guard in `useDeleteSchedule`)

## New hooks (api-local.ts)
- `useGetSchedules()` — reads schedules
- `useAddSchedule()` — appends new schedule entry
- `useDeleteSchedule()` — removes by id (min 1 guard)
- `useGetMonthStats()` — returns `MonthStats` used by the header widget

## Key files
- `src/lib/schedule.ts` — pure schedule utilities (getScheduleForDate, getDayScheduleForDate, standardMinutesForDate, isWorkdayBySchedule, SCHEDULE_PROFILES)
- `src/pages/Jornada.tsx` — full schedule editor with history
- `src/components/Layout.tsx` — `BalanceWidget` component shows Saldo Atual + Este mês stats in a sticky header bar
