import { useState, useMemo } from "react";
import {
  useListVacations,
  useCreateVacation,
  useUpdateVacation,
  useDeleteVacation,
  useVacationsMigrationReady,
} from "@/lib/api-local";
import type { VacationPeriod } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Palmtree,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2,
  CalendarDays,
  Search,
  ArrowUpDown,
  Calendar,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function diffDays(start: string, end: string): number {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysUntil(dateISO: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateISO + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

// ─── Confirm delete modal ──────────────────────────────────────────────────

function ModalConfirmDelete({
  vacation,
  onConfirm,
  onCancel,
  isPending,
}: {
  vacation: VacationPeriod;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-card-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-destructive" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-foreground">Excluir Período de Férias</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDateBR(vacation.startDate)} → {formatDateBR(vacation.endDate)}
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Tem certeza que deseja excluir este período? Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 rounded-xl border border-card-border text-sm font-medium text-muted-foreground hover:bg-accent transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-40"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Vacation form ─────────────────────────────────────────────────────────

function VacationForm({
  initial,
  onSave,
  onCancel,
  isPending,
  title,
}: {
  initial: { startDate: string; endDate: string; note: string };
  onSave: (data: { startDate: string; endDate: string; note: string }) => void;
  onCancel: () => void;
  isPending: boolean;
  title: string;
}) {
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [note, setNote] = useState(initial.note);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (endDate < startDate) return;
    onSave({ startDate, endDate, note });
  }

  const days = startDate && endDate && endDate >= startDate ? diffDays(startDate, endDate) : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm text-foreground">{title}</span>
        <button
          type="button"
          onClick={onCancel}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition"
        >
          <X size={15} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Calendar size={11} /> Início
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (endDate < e.target.value) setEndDate(e.target.value);
            }}
            required
            className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Calendar size={11} /> Término
          </label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
          />
        </div>
      </div>

      {days > 0 && (
        <p className="text-xs text-primary font-medium">
          📅 {days} dia{days !== 1 ? "s" : ""} de férias
        </p>
      )}

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <MessageSquare size={11} /> Observação
          <span className="opacity-60">(opcional)</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ex: férias de verão, viagem para o exterior…"
          rows={2}
          maxLength={300}
          className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition resize-none"
        />
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending || endDate < startDate}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:opacity-80 transition disabled:opacity-60"
        >
          {isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          Salvar
        </button>
      </div>
    </form>
  );
}

// ─── Vacation card ─────────────────────────────────────────────────────────

function VacationCard({
  vacation,
  onEdited,
}: {
  vacation: VacationPeriod;
  onEdited: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { toast } = useToast();
  const updateVacation = useUpdateVacation();
  const deleteVacation = useDeleteVacation();

  const days = diffDays(vacation.startDate, vacation.endDate);
  const today = todayISO();
  const isActive = today >= vacation.startDate && today <= vacation.endDate;
  const isPast = today > vacation.endDate;
  const daysLeft = daysUntil(vacation.startDate);

  function handleSave(data: { startDate: string; endDate: string; note: string }) {
    updateVacation.mutate(
      {
        id: vacation.id,
        data: { startDate: data.startDate, endDate: data.endDate, note: data.note || null },
      },
      {
        onSuccess: () => {
          toast({ title: "Férias atualizadas" });
          setEditing(false);
          onEdited();
        },
        onError: (err: any) =>
          toast({ title: "Erro ao atualizar férias", description: err?.message, variant: "destructive" }),
      },
    );
  }

  function handleDelete() {
    deleteVacation.mutate(
      { id: vacation.id },
      {
        onSuccess: () => {
          toast({ title: "Período excluído" });
          setShowDeleteModal(false);
          onEdited();
        },
        onError: (err: any) =>
          toast({ title: "Erro ao excluir férias", description: err?.message, variant: "destructive" }),
      },
    );
  }

  return (
    <>
      {showDeleteModal && (
        <ModalConfirmDelete
          vacation={vacation}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          isPending={deleteVacation.isPending}
        />
      )}

      <div
        className={cn(
          "bg-card border rounded-2xl shadow-sm transition-all duration-200",
          editing ? "border-primary/40 ring-1 ring-primary/20" : "border-card-border",
          isActive && "border-emerald-400/50 ring-1 ring-emerald-400/20",
        )}
      >
        {!editing ? (
          <div className="p-4 flex items-start gap-3">
            <div
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5",
                isActive
                  ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                  : isPast
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  : "bg-primary/10 text-primary",
              )}
            >
              <Palmtree size={16} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-semibold text-sm">
                  {formatDateBR(vacation.startDate)} → {formatDateBR(vacation.endDate)}
                </span>
                {isActive && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                    Em andamento
                  </span>
                )}
                {!isActive && !isPast && daysLeft <= 30 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                    Em {daysLeft} dia{daysLeft !== 1 ? "s" : ""}
                  </span>
                )}
                {isPast && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    Encerrado
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                <CalendarDays size={11} className="inline mr-1" />
                {days} dia{days !== 1 ? "s" : ""}
              </p>

              {vacation.note && (
                <div className="flex items-start gap-1.5 mt-1.5">
                  <MessageSquare size={11} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground italic leading-relaxed">{vacation.note}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setEditing(true)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition"
                title="Editar"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                title="Excluir"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <VacationForm
              title="Editar Férias"
              initial={{
                startDate: vacation.startDate,
                endDate: vacation.endDate,
                note: vacation.note ?? "",
              }}
              onSave={handleSave}
              onCancel={() => setEditing(false)}
              isPending={updateVacation.isPending}
            />
          </div>
        )}
      </div>
    </>
  );
}

// ─── Dashboard stats ───────────────────────────────────────────────────────

function VacationStats({ vacations }: { vacations: VacationPeriod[] }) {
  const today = todayISO();

  const upcoming = vacations
    .filter((v) => v.startDate > today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];

  const active = vacations.find((v) => today >= v.startDate && today <= v.endDate);

  const totalDays = vacations.reduce((sum, v) => sum + diffDays(v.startDate, v.endDate), 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="bg-card border border-card-border rounded-2xl p-4 shadow-sm space-y-1">
        <p className="text-xs text-muted-foreground font-medium">Períodos cadastrados</p>
        <p className="text-2xl font-bold text-foreground">{vacations.length}</p>
        <p className="text-xs text-muted-foreground">{totalDays} dias no total</p>
      </div>

      <div className="bg-card border border-card-border rounded-2xl p-4 shadow-sm space-y-1">
        <p className="text-xs text-muted-foreground font-medium">Status atual</p>
        {active ? (
          <>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">🏖 Em férias</p>
            <p className="text-xs text-muted-foreground">
              Até {formatDateBR(active.endDate)} ({diffDays(today, active.endDate)} dia{diffDays(today, active.endDate) !== 1 ? "s" : ""} restante{diffDays(today, active.endDate) !== 1 ? "s" : ""})
            </p>
          </>
        ) : (
          <>
            <p className="text-lg font-bold text-foreground">Trabalhando</p>
            <p className="text-xs text-muted-foreground">Sem férias ativas hoje</p>
          </>
        )}
      </div>

      <div className="bg-card border border-card-border rounded-2xl p-4 shadow-sm space-y-1">
        <p className="text-xs text-muted-foreground font-medium">Próximas férias</p>
        {upcoming ? (
          <>
            <p className="text-sm font-bold text-foreground">{formatDateBR(upcoming.startDate)}</p>
            <p className="text-xs text-muted-foreground">
              Em {daysUntil(upcoming.startDate)} dia{daysUntil(upcoming.startDate) !== 1 ? "s" : ""} · {diffDays(upcoming.startDate, upcoming.endDate)} dias
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-bold text-muted-foreground">—</p>
            <p className="text-xs text-muted-foreground">Nenhuma férias futura cadastrada</p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

type SortMode = "date-asc" | "date-desc";

export default function Ferias() {
  const { data: vacations = [], isLoading } = useListVacations();
  const { data: migrationReady } = useVacationsMigrationReady();
  const createVacation = useCreateVacation();
  const { toast } = useToast();

  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("date-desc");

  function handleCreate(data: { startDate: string; endDate: string; note: string }) {
    createVacation.mutate(
      { data: { startDate: data.startDate, endDate: data.endDate, note: data.note || null } },
      {
        onSuccess: () => {
          toast({ title: "Férias cadastradas com sucesso! 🏖" });
          setShowAddForm(false);
        },
        onError: (err: any) =>
          toast({ title: "Erro ao cadastrar férias", description: err?.message, variant: "destructive" }),
      },
    );
  }

  const filtered = useMemo(() => {
    let list = [...vacations];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (v) =>
          v.note?.toLowerCase().includes(q) ||
          v.startDate.includes(q) ||
          v.endDate.includes(q) ||
          formatDateBR(v.startDate).includes(q) ||
          formatDateBR(v.endDate).includes(q),
      );
    }

    list.sort((a, b) => {
      const cmp = a.startDate.localeCompare(b.startDate);
      return sort === "date-asc" ? cmp : -cmp;
    });

    return list;
  }, [vacations, searchQuery, sort]);

  return (
    <div className="space-y-5 pt-1">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl md:text-lg font-semibold flex items-center gap-2">
          <Palmtree size={20} className="text-primary flex-shrink-0" />
          Gestão de Férias
        </h1>
        {!showAddForm && migrationReady && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition shadow-sm flex-shrink-0"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Novo Período</span>
            <span className="sm:hidden">Novo</span>
          </button>
        )}
      </div>

      {/* Migration notice — shown when the Ferias table does not exist yet */}
      {migrationReady === false && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-sm">
          <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-800 dark:text-amber-300">Migration do banco de dados necessária</p>
            <p className="text-amber-700 dark:text-amber-400 text-xs leading-relaxed">
              A funcionalidade de Férias precisa de uma atualização no banco Supabase. Acesse o <strong>SQL Editor</strong> do seu projeto Supabase e execute o arquivo{" "}
              <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">supabase/migrations/002_ferias_e_nota.sql</code>.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      {!isLoading && vacations.length > 0 && <VacationStats vacations={vacations} />}

      {/* Add form */}
      {showAddForm && migrationReady && (
        <div className="bg-card border border-primary/30 ring-1 ring-primary/20 rounded-2xl p-5 shadow-sm">
          <VacationForm
            title="Cadastrar Férias"
            initial={{ startDate: todayISO(), endDate: todayISO(), note: "" }}
            onSave={handleCreate}
            onCancel={() => setShowAddForm(false)}
            isPending={createVacation.isPending}
          />
        </div>
      )}

      {/* Search + sort bar */}
      {!isLoading && vacations.length > 0 && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar por observação ou data…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setSort((s) => (s === "date-desc" ? "date-asc" : "date-desc"))}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-input bg-card text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition flex-shrink-0"
            title="Ordenar por data"
          >
            <ArrowUpDown size={14} />
            <span className="hidden sm:inline">{sort === "date-desc" ? "Mais recentes" : "Mais antigas"}</span>
          </button>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card border border-card-border rounded-2xl h-20 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-card-border rounded-2xl p-10 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Palmtree size={36} className="opacity-30" />
          {vacations.length === 0 ? (
            <>
              <p className="text-sm font-medium">Nenhum período de férias cadastrado</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition mt-1"
              >
                <Plus size={14} />
                Cadastrar férias
              </button>
            </>
          ) : (
            <p className="text-sm">Nenhum resultado para "{searchQuery}"</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((v) => (
            <VacationCard key={v.id} vacation={v} onEdited={() => {}} />
          ))}
        </div>
      )}
    </div>
  );
}
