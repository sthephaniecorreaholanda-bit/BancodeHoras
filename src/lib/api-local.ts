import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { readKey, writeKey } from "./storage";
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
  type ManualAdjustment,
  type ManualAdjustmentInput,
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
export const getListAdjustmentsQueryKey = () => ["adjustments"] as const;

// ─── Storage helpers ──────────────────────────────────────────────────────

type DatabaseRecord = {
  id: number;
  user_id?: string;
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
const SETTINGS_KEY = "bh:settings";
const ADJUSTMENTS_KEY = "bh:adjustments";
const MIGRATION_V1_KEY = "bh:migration-adj-v1";

type LegacySettings = Partial<Settings> & {
  manualAdjustmentMinutes?: number;
  dailyTargetMinutes?: number;
};

/**
 * One-time migration: converts the old permanent `manualAdjustmentMinutes`
 * setting into a proper transaction-based ManualAdjustment entry.
 * Runs once (guarded by MIGRATION_V1_KEY in localStorage).
 */
function runMigrations(raw: LegacySettings): void {
  const done = localStorage.getItem(MIGRATION_V1_KEY);
  if (done) return;

  const legacyAdj = raw.manualAdjustmentMinutes ?? 0;
  if (legacyAdj !== 0) {
    const adjs = readKey<ManualAdjustment[]>(ADJUSTMENTS_KEY, []);
    const alreadyMigrated = adjs.some((a) => a.id.startsWith("migration-v1-"));
    if (!alreadyMigrated) {
      const today = new Date().toISOString().slice(0, 10);
      const migrated: ManualAdjustment = {
        id: "migration-v1-" + Date.now().toString(36),
        date: today,
        type: legacyAdj > 0 ? "CREDIT" : "DEBIT",
        minutes: Math.abs(legacyAdj),
        reason: "Migrado do ajuste manual configurado anteriormente",
        createdAt: new Date().toISOString(),
      };
      writeKey(ADJUSTMENTS_KEY, [...adjs, migrated]);
    }
  }

  localStorage.setItem(MIGRATION_V1_KEY, "1");
}

function loadSettings(): Settings {
  const raw = readKey<LegacySettings>(SETTINGS_KEY, DEFAULT_SETTINGS);

  // Run one-time migration of legacy manualAdjustmentMinutes
  runMigrations(raw);

  const settings: Settings = {
    id: raw.id ?? 1,
    defaultEntryTime: raw.defaultEntryTime || DEFAULT_SETTINGS.defaultEntryTime,
    defaultExitTime: raw.defaultExitTime || DEFAULT_SETTINGS.defaultExitTime,
    lunchBreakMinutes: raw.lunchBreakMinutes ?? 60,
    goalMinutes: raw.goalMinutes ?? null,
  };

  // Remove the legacy field from stored settings if it exists
  if ((raw as any).manualAdjustmentMinutes !== undefined) {
    writeKey(SETTINGS_KEY, settings);
  }

  return settings;
}

function saveSettings(s: Settings): void {
  writeKey(SETTINGS_KEY, s);
}

function loadAdjustments(): ManualAdjustment[] {
  return readKey<ManualAdjustment[]>(ADJUSTMENTS_KEY, []);
}

function saveAdjustments(list: ManualAdjustment[]): void {
  writeKey(ADJUSTMENTS_KEY, list);
}

async function loadRecords(): Promise<TimeRecord[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  try {
    const { data, error } = await supabase
      .from(RECORDS_TABLE)
      .select(
        "id,date,type,entry_time,exit_time,lunch_start,lunch_end,worked_minutes,balance_minutes,created_at",
      )
      .eq("user_id", user.id)
      .order("date", { ascending: true });

    if (error) throw new Error(error.message);
    if (!data) return [];

    const settings = loadSettings();
    return data.map((row: DatabaseRecord) => {
      const recType = (row.type as any) ?? "WORK_DAY";
      const { workedMinutes, balanceMinutes } = computeBalanceForRecord(
        {
          date: row.date,
          type: recType,
          entryTime: row.entry_time,
          exitTime: row.exit_time,
        },
        settings,
      );

      const finalWorked = recType === "COMPENSATED_LEAVE" ? workedMinutes : (row.worked_minutes ?? workedMinutes);
      const finalBalance = recType === "COMPENSATED_LEAVE" ? balanceMinutes : (row.balance_minutes ?? balanceMinutes);

      return {
        id: row.id,
        date: row.date,
        type: recType,
        entryTime: row.entry_time,
        exitTime: row.exit_time,
        workedMinutes: finalWorked,
        balanceMinutes: finalBalance,
        note: null,
        createdAt: row.created_at,
      };
    });
  } catch (err) {
    throw new Error("Falha ao carregar registros. Verifique sua conexão.");
  }
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["records"], exact: false });
  qc.invalidateQueries({ queryKey: ["summary"], exact: false });
  qc.invalidateQueries({ queryKey: ["settings"], exact: false });
  qc.invalidateQueries({ queryKey: ["adjustments"], exact: false });
}

// ─── Queries ──────────────────────────────────────────────────────────────

export function useGetSummary() {
  return useQuery({
    queryKey: getGetSummaryQueryKey(),
    queryFn: async (): Promise<Summary> => {
      const records = await loadRecords();
      const adjustments = loadAdjustments();
      return computeSummary(records, adjustments);
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
      const adjustments = loadAdjustments();
      return computeMonthlyEvolution(records, adjustments);
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
      const adjustments = loadAdjustments();
      const csv = recordsToCsv(records, adjustments);
      return { csv, filename: defaultExportFilename() };
    },
    ...(opts?.query ?? {}),
  });
}

export function useListAdjustments() {
  return useQuery({
    queryKey: getListAdjustmentsQueryKey(),
    queryFn: (): ManualAdjustment[] => loadAdjustments(),
  });
}

/** Load ALL records without any month/year filter (for reports). */
export function useListAllRecords() {
  return useQuery({
    queryKey: getListRecordsQueryKey(),
    queryFn: async (): Promise<TimeRecord[]> => {
      const records = await loadRecords();
      return records;
    },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────

export function useCreateAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: ManualAdjustmentInput }): Promise<ManualAdjustment> => {
      const list = loadAdjustments();
      const adj: ManualAdjustment = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        date: data.date,
        type: data.type,
        minutes: data.minutes,
        reason: data.reason ?? null,
        createdAt: new Date().toISOString(),
      };
      saveAdjustments([...list, adj]);
      return adj;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: ManualAdjustmentInput;
    }): Promise<ManualAdjustment> => {
      const list = loadAdjustments();
      const idx = list.findIndex((a) => a.id === id);
      if (idx === -1) throw new Error("Ajuste não encontrado.");
      const updated: ManualAdjustment = {
        ...list[idx],
        date: data.date,
        type: data.type,
        minutes: data.minutes,
        reason: data.reason ?? null,
      };
      const next = [...list];
      next[idx] = updated;
      saveAdjustments(next);
      return updated;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }): Promise<void> => {
      const list = loadAdjustments();
      saveAdjustments(list.filter((a) => a.id !== id));
    },
    onSuccess: () => invalidateAll(qc),
  });
}

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
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado.");

        const { data: created, error } = await supabase
          .from(RECORDS_TABLE)
          .insert({
            user_id: user.id,
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

        if (error) throw new Error(error.message);
        if (!created) throw new Error("Falha ao criar o registro.");

        return {
          id: created.id,
          date: created.date,
          type: created.type as any,
          entryTime: created.entry_time,
          exitTime: created.exit_time,
          workedMinutes,
          balanceMinutes,
          note: data.note ?? null,
          createdAt: created.created_at,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao criar registro.";
        throw new Error(msg);
      }
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

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado.");

        const { data: updated, error } = await supabase
          .from(RECORDS_TABLE)
          .update({
            type: merged.type,
            entry_time: merged.entryTime,
            exit_time: merged.exitTime ?? null,
            worked_minutes: merged.workedMinutes,
            balance_minutes: merged.balanceMinutes,
          })
          .eq("id", id)
          .eq("user_id", user.id)
          .select("*")
          .single();

        if (error) throw new Error(error.message);
        if (!updated) throw new Error("Falha ao atualizar o registro.");

        return {
          id: updated.id,
          date: updated.date,
          type: (updated.type as any) ?? "WORK_DAY",
          entryTime: updated.entry_time,
          exitTime: updated.exit_time,
          workedMinutes: merged.workedMinutes,
          balanceMinutes: merged.balanceMinutes,
          note: null,
          createdAt: updated.created_at,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao atualizar registro.";
        throw new Error(msg);
      }
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }): Promise<void> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const { error } = await supabase
        .from(RECORDS_TABLE)
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

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

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const { data: deletedRows, error } = await supabase
        .from(RECORDS_TABLE)
        .delete()
        .in("id", unique)
        .eq("user_id", user.id)
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

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
          user_id: user.id,
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
        .from(RECORDS_TABLE)
        .insert(recordsToInsert);

      if (error) throw new Error(error.message);
      return { created: toCreate.length, skipped };
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error("Sessão inválida. Faça login novamente.");

      const { error } = await supabase.functions.invoke("delete-account", {
        method: "POST",
      });

      if (error) {
        throw new Error(error.message ?? "Falha ao excluir conta.");
      }

      localStorage.removeItem("bh:settings");
      localStorage.removeItem("bh:adjustments");
      localStorage.removeItem("bh:no-remember");
      localStorage.removeItem(MIGRATION_V1_KEY);
      sessionStorage.removeItem("bh:session-active");

      await supabase.auth.signOut();
    },
  });
}
