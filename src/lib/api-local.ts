import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { readKey, userKey, writeKey } from "./storage";
import { supabase } from "./supabaseClient";
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

type DatabaseRecord = {
  id: number;
  date: string;
  type?: string | null;
  entry_time: string | null;
  exit_time: string | null;
  lunch_start: string | null;
  lunch_end: string | null;
  worked_minutes?: number | null;
  balance_minutes?: number | null;
  created_at: string;
};
const RECORDS_TABLE = "Horas";

async function loadRecords(): Promise<TimeRecord[]> {
  const { data, error } = await supabase
    .from<DatabaseRecord>(RECORDS_TABLE)
    .select("id,date,type,entry_time,exit_time,lunch_start,lunch_end,worked_minutes,balance_minutes,created_at")
    .order("date", { ascending: true });

  if (error) throw new Error(error.message);
  if (!data) return [];

  return data.map((row) => {
    const settings = loadSettings();
    const { workedMinutes, balanceMinutes } = computeBalanceForRecord(
      {
        date: row.date,
        type: (row.type as any) ?? "WORK_DAY",
        entryTime: row.entry_time,
        exitTime: row.exit_time,
      },
      settings,
    );
      return {
        id: row.id,
        date: row.date,
        type: (row.type as any) ?? "WORK_DAY",
        entryTime: row.entry_time,
        exitTime: row.exit_time,
        workedMinutes: row.worked_minutes ?? workedMinutes,
        balanceMinutes: row.balance_minutes ?? balanceMinutes,
        note: null,
        createdAt: row.created_at,
      };
  });
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
      const records = await loadRecords();
      return computeSummary(records, loadSettings());
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
      const records = await loadRecords();
      return filterByMonth(records, params?.month, params?.year);
    },
  });
}

export function useGetMonthlyEvolution() {
  return useQuery({
    queryKey: getGetMonthlyEvolutionQueryKey(),
    queryFn: async (): Promise<MonthlyEvolution[]> => {
      const records = await loadRecords();
      return computeMonthlyEvolution(records);
    },
  });
}

export function useGetMissingDays() {
  return useQuery({
    queryKey: getGetMissingDaysQueryKey(),
    queryFn: async (): Promise<MissingDay[]> => {
      const records = await loadRecords();
      return computeMissingDays(records);
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
      const records = await loadRecords();
      const csv = recordsToCsv(records);
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
      const rows = await loadRecords();
      if (rows.some((r) => r.date === data.date)) {
        throw new Error("Já existe um registro para esta data.");
      }

      const settings = loadSettings();
      const { workedMinutes, balanceMinutes } = computeBalanceForRecord(
        {
          date: data.date,
          type: data.type,
          entryTime: data.entryTime ?? null,
          exitTime: data.exitTime ?? null,
          note: data.note ?? null,
        },
        settings,
      );

      const createdAt = new Date().toISOString();

      const { data: created, error } = await supabase
        .from<DatabaseRecord>(RECORDS_TABLE)
        .insert({
          date: data.date,
          type: data.type,
          entry_time: data.entryTime ?? null,
          exit_time: data.exitTime ?? null,
          lunch_start: null,
          lunch_end: null,
          worked_minutes: workedMinutes,
          balance_minutes: balanceMinutes,
          created_at: createdAt,
        })
        .select("*")
        .single();

      if (error) {
        console.error("Supabase insert error (create record):", error);
        throw new Error(error.message);
      }
      if (!created) throw new Error("Falha ao criar o registro.");

      return {
        id: created.id,
        date: created.date,
        type: data.type,
        entryTime: created.entry_time,
        exitTime: created.exit_time,
        workedMinutes,
        balanceMinutes,
        note: data.note ?? null,
        createdAt: created.created_at,
      };
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
      const rows = await loadRecords();
      const idx = rows.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error("Registro não encontrado.");

      const merged: TimeRecord = {
        ...rows[idx],
        type: data.type ?? rows[idx].type,
        entryTime: data.entryTime !== undefined ? data.entryTime : rows[idx].entryTime,
        exitTime: data.exitTime !== undefined ? data.exitTime : rows[idx].exitTime,
        note: data.note !== undefined ? data.note : rows[idx].note,
      };

      const settings = loadSettings();
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

      const { data: updated, error } = await supabase
        .from<DatabaseRecord>(RECORDS_TABLE)
        .update({
          type: merged.type,
          entry_time: merged.entryTime,
          exit_time: merged.exitTime ?? null,
          worked_minutes: merged.workedMinutes,
          balance_minutes: merged.balanceMinutes,
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      if (!updated) throw new Error("Falha ao atualizar o registro.");

      return {
        id: updated.id,
        date: updated.date,
        type: "WORK_DAY",
        entryTime: updated.entry_time,
        exitTime: updated.exit_time,
        workedMinutes: merged.workedMinutes,
        balanceMinutes: merged.balanceMinutes,
        note: null,
        createdAt: updated.created_at,
      };
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }): Promise<void> => {
      const { error } = await supabase
        .from<DatabaseRecord>(RECORDS_TABLE)
        .delete()
        .eq("id", id);

      if (error) throw new Error(error.message);
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

      const { data: deletedRows, error } = await supabase
        .from<DatabaseRecord>(RECORDS_TABLE)
        .delete()
        .in("id", unique)
        .select("id");

      if (error) throw new Error(error.message);
      return { deleted: deletedRows?.length ?? 0 };
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
      const rows = await loadRecords();
      const existing = new Set(rows.map((r) => r.date));
      const settings = loadSettings();
      const { toCreate, skipped } = bulkGenerateInputs(
        data.year,
        data.month,
        existing,
        settings,
      );

      if (toCreate.length === 0) {
        return { created: 0, skipped };
      }

      const createdAt = new Date().toISOString();
      const recordsToInsert = toCreate.map((input) => {
        const { workedMinutes, balanceMinutes } = computeBalanceForRecord(input, settings);
        return {
          date: input.date,
          type: input.type,
          entry_time: input.entryTime ?? null,
          exit_time: input.exitTime ?? null,
          lunch_start: null,
          lunch_end: null,
          worked_minutes: workedMinutes,
          balance_minutes: balanceMinutes,
          created_at: createdAt,
        };
      });

      const { error } = await supabase
        .from<DatabaseRecord>(RECORDS_TABLE)
        .insert(recordsToInsert);

      if (error) {
        console.error("Supabase insert error (bulk create records):", error);
        throw new Error(error.message);
      }
      return { created: toCreate.length, skipped };
    },
    onSuccess: () => invalidateAll(qc),
  });
}
