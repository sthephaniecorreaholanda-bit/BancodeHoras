import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { readKey, userKey, writeKey } from "./storage";
import {
  bulkGenerateInputs,
  computeBalanceForRecord,
  computeMissingDays,
  computeMonthlyEvolution,
  computeSummary,
  defaultExportFilename,
  filterByMonth,
  recordsToCsv,
} from "./calculations";
import {
  DEFAULT_SETTINGS,
  type BulkGenerateBody,
  type BulkGenerateResult,
  type ExportData,
  type MissingDay,
  type MonthlyEvolution,
  type Settings,
  type SettingsUpdate,
  type Summary,
  type TimeRecord,
  type TimeRecordInput,
  type TimeRecordUpdate,
} from "./types";

// ─── Query keys ───────────────────────────────────────────────────────────

export const getListRecordsQueryKey = (params?: {
  month?: number;
  year?: number;
}) =>
  params
    ? (["records", { month: params.month, year: params.year }] as const)
    : (["records"] as const);

export const getGetSummaryQueryKey = () => ["summary"] as const;
export const getGetMonthlyEvolutionQueryKey = () =>
  ["summary", "monthly-evolution"] as const;
export const getGetMissingDaysQueryKey = () =>
  ["summary", "missing-days"] as const;
export const getGetSettingsQueryKey = () => ["settings"] as const;
export const getExportRecordsQueryKey = () => ["records", "export"] as const;

// ─── Storage helpers ──────────────────────────────────────────────────────

function loadRecords(): TimeRecord[] {
  return readKey<TimeRecord[]>(userKey("records"), []);
}

function saveRecords(rows: TimeRecord[]): void {
  writeKey(userKey("records"), rows);
}

type LegacySettings = Settings & { dailyTargetMinutes?: number };

function loadSettings(): Settings {
  const raw = readKey<LegacySettings>(userKey("settings"), DEFAULT_SETTINGS);
  if (raw.defaultEntryTime && raw.defaultExitTime) {
    return {
      id: raw.id ?? 1,
      defaultEntryTime: raw.defaultEntryTime,
      defaultExitTime: raw.defaultExitTime,
      manualAdjustmentMinutes: raw.manualAdjustmentMinutes ?? 0,
      lunchBreakMinutes: raw.lunchBreakMinutes ?? 60,
      goalMinutes: raw.goalMinutes ?? null,
    };
  }
  return { ...DEFAULT_SETTINGS, ...raw };
}

function saveSettings(s: Settings): void {
  writeKey(userKey("settings"), s);
}

function nextId(rows: TimeRecord[]): number {
  return rows.reduce((m, r) => (r.id > m ? r.id : m), 0) + 1;
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["records"] });
  qc.invalidateQueries({ queryKey: ["summary"] });
  qc.invalidateQueries({ queryKey: ["settings"] });
}

// ─── Queries ──────────────────────────────────────────────────────────────

export function useGetSummary() {
  return useQuery({
    queryKey: getGetSummaryQueryKey(),
    queryFn: async (): Promise<Summary> => {
      return computeSummary(loadRecords(), loadSettings());
    },
  });
}

export function useGetSettings() {
  return useQuery({
    queryKey: getGetSettingsQueryKey(),
    queryFn: async (): Promise<Settings> => loadSettings(),
  });
}

export function useListRecords(params?: { month?: number; year?: number }) {
  return useQuery({
    queryKey: getListRecordsQueryKey(params),
    queryFn: async (): Promise<TimeRecord[]> => {
      return filterByMonth(loadRecords(), params?.month, params?.year);
    },
  });
}

export function useGetMonthlyEvolution() {
  return useQuery({
    queryKey: getGetMonthlyEvolutionQueryKey(),
    queryFn: async (): Promise<MonthlyEvolution[]> => {
      return computeMonthlyEvolution(loadRecords());
    },
  });
}

export function useGetMissingDays() {
  return useQuery({
    queryKey: getGetMissingDaysQueryKey(),
    queryFn: async (): Promise<MissingDay[]> => {
      return computeMissingDays(loadRecords());
    },
  });
}

type ExportQueryOpts = {
  query?: Partial<UseQueryOptions<ExportData>> & { enabled?: boolean };
};

export function useExportRecords(opts?: ExportQueryOpts) {
  return useQuery<ExportData>({
    queryKey: getExportRecordsQueryKey(),
    queryFn: async (): Promise<ExportData> => {
      const csv = recordsToCsv(loadRecords());
      return { csv, filename: defaultExportFilename() };
    },
    ...(opts?.query ?? {}),
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────

export function useCreateRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: TimeRecordInput }): Promise<TimeRecord> => {
      const rows = loadRecords();
      if (rows.some((r) => r.date === data.date)) {
        throw new Error("Já existe um registro para esta data.");
      }
      const settings = loadSettings();
      const { workedMinutes, balanceMinutes } = computeBalanceForRecord(data, settings);
      const record: TimeRecord = {
        id: nextId(rows),
        date: data.date,
        type: data.type,
        entryTime: data.entryTime ?? null,
        exitTime: data.exitTime ?? null,
        workedMinutes,
        balanceMinutes,
        note: data.note ?? null,
        createdAt: new Date().toISOString(),
      };
      rows.push(record);
      saveRecords(rows);
      return record;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: TimeRecordUpdate;
    }): Promise<TimeRecord> => {
      const rows = loadRecords();
      const idx = rows.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error("Registro não encontrado.");
      const settings = loadSettings();
      const merged: TimeRecord = {
        ...rows[idx],
        type: data.type ?? rows[idx].type,
        entryTime: data.entryTime !== undefined ? data.entryTime : rows[idx].entryTime,
        exitTime: data.exitTime !== undefined ? data.exitTime : rows[idx].exitTime,
        note: data.note !== undefined ? data.note : rows[idx].note,
      };
      const { workedMinutes, balanceMinutes } = computeBalanceForRecord(
        {
          date: merged.date,
          type: merged.type,
          entryTime: merged.entryTime,
          exitTime: merged.exitTime,
          note: merged.note,
        },
        settings,
      );
      merged.workedMinutes = workedMinutes;
      merged.balanceMinutes = balanceMinutes;
      rows[idx] = merged;
      saveRecords(rows);
      return merged;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }): Promise<void> => {
      const rows = loadRecords();
      const next = rows.filter((r) => r.id !== id);
      if (next.length === rows.length) throw new Error("Registro não encontrado.");
      saveRecords(next);
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteRecordsBulk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids }: { ids: number[] }): Promise<{ deleted: number }> => {
      const unique = Array.from(new Set(ids)).filter((n) => Number.isFinite(n));
      if (unique.length === 0) return { deleted: 0 };
      const rows = loadRecords();
      const next = rows.filter((r) => !unique.includes(r.id));
      saveRecords(next);
      return { deleted: rows.length - next.length };
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: SettingsUpdate }): Promise<Settings> => {
      const current = loadSettings();
      const next: Settings = {
        ...current,
        ...data,
        goalMinutes:
          data.goalMinutes === undefined ? current.goalMinutes : data.goalMinutes,
      };
      saveSettings(next);
      return next;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useBulkGenerateMonth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      data,
    }: {
      data: BulkGenerateBody;
    }): Promise<BulkGenerateResult> => {
      const rows = loadRecords();
      const existing = new Set(rows.map((r) => r.date));
      const settings = loadSettings();
      const { toCreate, skipped } = bulkGenerateInputs(
        data.year,
        data.month,
        existing,
        settings,
      );

      let id = nextId(rows);
      for (const input of toCreate) {
        const { workedMinutes, balanceMinutes } = computeBalanceForRecord(input, settings);
        rows.push({
          id: id++,
          date: input.date,
          type: input.type,
          entryTime: input.entryTime ?? null,
          exitTime: input.exitTime ?? null,
          workedMinutes,
          balanceMinutes,
          note: input.note ?? null,
          createdAt: new Date().toISOString(),
        });
      }
      saveRecords(rows);
      return { created: toCreate.length, skipped };
    },
    onSuccess: () => invalidateAll(qc),
  });
}
