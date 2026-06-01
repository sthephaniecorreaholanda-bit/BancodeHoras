import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListRecords,
  useDeleteRecord,
  useDeleteRecordsBulk,
  useUpdateRecord,
  useExportRecords,
  useGetSettings,
  getListRecordsQueryKey,
  getGetSummaryQueryKey,
  getGetMonthlyEvolutionQueryKey,
  getGetMissingDaysQueryKey,
  getExportRecordsQueryKey,
} from "@/lib/api-local";
import {
  formatDate,
  formatMinutes,
  getBalanceColor,
  TYPE_LABELS,
  minutesToHHMM,
} from "@/lib/time";
import { cn } from "@/lib/utils";
import {
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  History,
  MessageSquare,
  Pencil,
  Check,
  X,
  Loader2,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const TYPE_BADGE: Record<string, string> = {
  WORK_DAY: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  COMPENSATED_LEAVE: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  HOLIDAY: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

type TimeRecord = {
  id: number;
  date: string;
  type: string;
  entryTime?: string | null;
  exitTime?: string | null;
  workedMinutes: number;
  balanceMinutes: number;
  note?: string | null;
};

function EditableCard({
  record,
  onSaved,
  onDeleted,
  defaultEntryTime,
  defaultExitTime,
  selected,
  onToggleSelected,
}: {
  record: TimeRecord;
  onSaved: () => void;
  onDeleted: () => void;
  defaultEntryTime: string;
  defaultExitTime: string;
  selected: boolean;
  onToggleSelected: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState(record.type);
  const [entryTime, setEntryTime] = useState(record.entryTime ?? defaultEntryTime);
  const [exitTime, setExitTime] = useState(record.exitTime ?? defaultExitTime);
  const [note, setNote] = useState(record.note ?? "");
  const { toast } = useToast();
  const updateRecord = useUpdateRecord();
  const deleteRecord = useDeleteRecord();

  const hasTimes = type !== "HOLIDAY";
  const requireTimes = type === "COMPENSATED_LEAVE";

  function handleCancelEdit() {
    setType(record.type);
    setEntryTime(record.entryTime ?? defaultEntryTime);
    setExitTime(record.exitTime ?? defaultExitTime);
    setNote(record.note ?? "");
    setEditing(false);
  }

  function handleSave() {
    updateRecord.mutate(
      {
        id: record.id,
        data: {
          type: type as "WORK_DAY" | "COMPENSATED_LEAVE" | "HOLIDAY",
          entryTime: hasTimes ? (entryTime || null) : null,
          exitTime: hasTimes ? (exitTime || null) : null,
          note: note.trim() || null,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Registro atualizado" });
          setEditing(false);
          onSaved();
        },
        onError: () =>
          toast({ title: "Erro ao atualizar", variant: "destructive" }),
      }
    );
  }

  function handleDelete() {
    deleteRecord.mutate(
      { id: record.id },
      {
        onSuccess: () => {
          toast({ title: "Registro excluído" });
          onDeleted();
        },
        onError: () =>
          toast({ title: "Erro ao excluir", variant: "destructive" }),
      }
    );
  }

  return (
    <div
      data-testid={`card-record-${record.id}`}
      className={cn(
        "bg-card border rounded-2xl shadow-sm transition-all duration-200",
        editing
          ? "border-primary/40 ring-1 ring-primary/20"
          : "border-card-border"
      )}
    >
      {/* ── Collapsed view ── */}
      {!editing ? (
        <div className="p-4 flex items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelected(record.id)}
            className="mt-1 h-4 w-4 rounded border-input"
            aria-label="Selecionar registro"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-semibold text-sm">{formatDate(record.date)}</span>
              <span
                className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full",
                  TYPE_BADGE[record.type]
                )}
              >
                {TYPE_LABELS[record.type]}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {record.entryTime && record.exitTime ? (
                <>
                  <span>
                    {record.entryTime} — {record.exitTime}
                  </span>
                  <span className="text-foreground/60">
                    {minutesToHHMM(record.workedMinutes)} h
                  </span>
                </>
              ) : (
                <span>—</span>
              )}
            </div>
            {record.note && (
              <div className="flex items-start gap-1.5 mt-2">
                <MessageSquare
                  size={11}
                  className="text-muted-foreground flex-shrink-0 mt-0.5"
                />
                <p className="text-xs text-muted-foreground leading-relaxed italic">
                  {record.note}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
            <span
              data-testid={`text-balance-${record.id}`}
              className={cn(
                "font-bold text-sm tabular-nums mr-1",
                getBalanceColor(record.balanceMinutes)
              )}
            >
              {formatMinutes(record.balanceMinutes)}
            </span>
            <button
              data-testid={`button-edit-${record.id}`}
              onClick={() => setEditing(true)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition"
              title="Editar registro"
            >
              <Pencil size={14} />
            </button>
            <button
              data-testid={`button-delete-${record.id}`}
              onClick={handleDelete}
              disabled={deleteRecord.isPending}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
              title="Excluir registro"
            >
              {deleteRecord.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
            </button>
          </div>
        </div>
      ) : (
        /* ── Expanded edit view ── */
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">{formatDate(record.date)}</span>
            <button
              onClick={handleCancelEdit}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition"
              title="Cancelar edição"
            >
              <X size={15} />
            </button>
          </div>

          {/* Type selector */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Tipo de dia</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { value: "WORK_DAY", label: "Dia Comum" },
                { value: "COMPENSATED_LEAVE", label: "Folga Compensada" },
                { value: "HOLIDAY", label: "Feriado / Folga" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={cn(
                    "px-2 py-1.5 rounded-xl text-xs font-medium border transition text-center leading-tight",
                    type === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-input hover:border-primary/50 hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {hasTimes && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Clock size={11} /> Entrada
                </label>
                <input
                  type="time"
                  value={entryTime}
                  onChange={(e) => setEntryTime(e.target.value)}
                  required={requireTimes}
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Clock size={11} /> Saída
                </label>
                <input
                  type="time"
                  value={exitTime}
                  onChange={(e) => setExitTime(e.target.value)}
                  required={requireTimes}
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                />
              </div>
            </div>
          )}

          {/* Note field */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <MessageSquare size={11} /> Observações
              <span className="font-normal opacity-60">(opcional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: saí mais cedo para consulta médica"
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-1">
            <button
              onClick={handleCancelEdit}
              className="px-3 py-1.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent transition"
            >
              Cancelar
            </button>
            <button
              data-testid={`button-save-edit-${record.id}`}
              onClick={handleSave}
              disabled={updateRecord.isPending}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:opacity-80 transition disabled:opacity-60"
            >
              {updateRecord.isPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Check size={13} />
              )}
              Salvar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Historico() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: records, isLoading } = useListRecords({ month, year });
  const { data: settings } = useGetSettings();
  const deleteBulk = useDeleteRecordsBulk();
  const { refetch: triggerExport } = useExportRecords({
    query: { enabled: false, queryKey: getExportRecordsQueryKey() },
  });

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: getListRecordsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetSummaryQueryKey() });
    qc.invalidateQueries({ queryKey: getGetMonthlyEvolutionQueryKey() });
    qc.invalidateQueries({ queryKey: getGetMissingDaysQueryKey() });
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  useEffect(() => {
    setSelectedIds(new Set());
  }, [month, year]);

  const visibleIds = useMemo(
    () => (records ? records.map((r) => r.id) : []),
    [records],
  );

  const selectedCount = selectedIds.size;
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someSelected = selectedCount > 0 && !allSelected;

  const selectAllRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  function toggleSelected(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (!records || records.length === 0) return prev;
      if (allSelected) return new Set();
      return new Set(records.map((r) => r.id));
    });
  }

  function handleDeleteSelected() {
    if (selectedIds.size === 0) return;
    const ok = window.confirm("Tem certeza que deseja excluir os registros selecionados?");
    if (!ok) return;

    const ids = Array.from(selectedIds);
    const key = getListRecordsQueryKey({ month, year });
    const prevRecords = qc.getQueryData<TimeRecord[]>(key);
    qc.setQueryData<TimeRecord[]>(
      key,
      (curr) => (curr ? curr.filter((r) => !selectedIds.has(r.id)) : curr),
    );

    deleteBulk.mutate(
      { ids },
      {
        onSuccess: (res) => {
          toast({
            title: "Registros excluídos",
            description:
              res.deleted === 1
                ? "1 registro removido."
                : `${res.deleted} registros removidos.`,
          });
          setSelectedIds(new Set());
          invalidateAll();
        },
        onError: () => {
          if (prevRecords) qc.setQueryData(key, prevRecords);
          toast({ title: "Erro ao excluir selecionados", variant: "destructive" });
        },
      },
    );
  }

  async function handleExport() {
    const result = await triggerExport();
    const data = result.data;
    if (!data) return;
    const blob = new Blob([data.csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = data.filename;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exportado", description: data.filename });
  }

  const monthBalance = records
    ? records.reduce((sum, r) => sum + r.balanceMinutes, 0)
    : null;

  return (
    <div className="space-y-4 pt-1">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-lg flex items-center gap-2">
          <History size={20} className="text-primary" />
          Histórico
        </h1>
        <button
          data-testid="button-export"
          onClick={handleExport}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl bg-card border border-card-border hover:bg-accent transition shadow-sm"
        >
          <Download size={14} /> Exportar CSV
        </button>
      </div>

      {/* Month picker + balance */}
      <div className="flex items-center justify-between bg-card border border-card-border rounded-2xl px-4 py-3 shadow-sm">
        <button
          data-testid="button-prev-month"
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent transition"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="font-semibold text-sm">
            {MONTHS[month - 1]} {year}
          </p>
          {monthBalance !== null && records && records.length > 0 && (
            <p
              className={cn(
                "text-xs font-mono font-medium mt-0.5",
                getBalanceColor(monthBalance)
              )}
            >
              {formatMinutes(monthBalance)} no mês
            </p>
          )}
        </div>
        <button
          data-testid="button-next-month"
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent transition"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Records list */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-card border border-card-border rounded-2xl h-20 animate-pulse"
            />
          ))}
        </div>
      ) : !records || records.length === 0 ? (
        <div className="bg-card border border-card-border rounded-2xl p-10 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <History size={36} className="opacity-30" />
          <p className="text-sm">
            Nenhum registro em {MONTHS[month - 1]} {year}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="bg-card border border-card-border rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-muted-foreground select-none">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-input"
                aria-label="Selecionar todos"
              />
              Selecionar todos
            </label>
            {selectedCount > 0 && (
              <button
                data-testid="button-delete-selected"
                onClick={handleDeleteSelected}
                disabled={deleteBulk.isPending}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 active:opacity-80 transition disabled:opacity-60 shadow-sm"
              >
                {deleteBulk.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Excluir Selecionados ({selectedCount})
              </button>
            )}
          </div>
          {records.map((r) => (
            <EditableCard
              key={r.id}
              record={r}
              onSaved={invalidateAll}
              onDeleted={invalidateAll}
              defaultEntryTime={settings?.defaultEntryTime ?? "08:00"}
              defaultExitTime={settings?.defaultExitTime ?? "17:00"}
              selected={selectedIds.has(r.id)}
              onToggleSelected={toggleSelected}
            />
          ))}
        </div>
      )}
    </div>
  );
}
