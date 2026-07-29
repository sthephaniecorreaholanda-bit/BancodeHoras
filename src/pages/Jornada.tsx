import { useState } from "react";
import {
  useGetSchedules,
  useAddSchedule,
  useDeleteSchedule,
} from "@/lib/api-local";
import {
  SCHEDULE_PROFILES,
  DAY_NAMES_FULL,
  DAY_NAMES_SHORT,
  getScheduleForDate,
} from "@/lib/schedule";
import type { DaySchedule, WorkSchedule, WorkScheduleInput } from "@/lib/types";
import { todayISO, minutesToHHMM, hhmmToMinutes } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  CopyCheck,
  Info,
  Loader2,
  Plus,
  Trash2,
  UtensilsCrossed,
  Zap,
} from "lucide-react";

// ─── Day editor row ───────────────────────────────────────────────────────

function DayRow({
  dow,
  day,
  onChange,
}: {
  dow: number;
  day: DaySchedule;
  onChange: (d: DaySchedule) => void;
}) {
  const net = day.active
    ? Math.max(
        0,
        hhmmToMinutes(day.exitTime) -
          hhmmToMinutes(day.entryTime) -
          Math.max(0, day.lunchBreakMinutes),
      )
    : 0;

  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-all",
        day.active
          ? "bg-card border-card-border"
          : "bg-muted/30 border-card-border/40 opacity-60",
      )}
    >
      <div className="flex items-center gap-3">
        {/* Active toggle */}
        <button
          type="button"
          onClick={() => onChange({ ...day, active: !day.active })}
          className={cn(
            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0",
            day.active ? "bg-primary" : "bg-muted-foreground/30",
          )}
          aria-label={day.active ? "Desativar" : "Ativar"}
        >
          <span
            className={cn(
              "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
              day.active ? "translate-x-4.5" : "translate-x-0.5",
            )}
          />
        </button>

        <span className="w-28 text-sm font-medium shrink-0">
          {DAY_NAMES_FULL[dow]}
        </span>

        {day.active && (
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <div className="flex items-center gap-1">
              <Clock size={11} className="text-muted-foreground" />
              <input
                type="time"
                value={day.entryTime}
                onChange={(e) => onChange({ ...day, entryTime: e.target.value })}
                className="w-[90px] px-2 py-1 rounded-lg border border-input bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <span className="text-muted-foreground text-xs">→</span>
              <input
                type="time"
                value={day.exitTime}
                onChange={(e) => onChange({ ...day, exitTime: e.target.value })}
                className="w-[90px] px-2 py-1 rounded-lg border border-input bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-1">
              <UtensilsCrossed size={11} className="text-muted-foreground" />
              <input
                type="number"
                value={day.lunchBreakMinutes}
                onChange={(e) =>
                  onChange({ ...day, lunchBreakMinutes: Math.max(0, Number(e.target.value)) })
                }
                min={0}
                max={240}
                step={5}
                className="w-16 px-2 py-1 rounded-lg border border-input bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <span className="text-xs text-muted-foreground">min</span>
            </div>
            <span className="text-xs font-mono text-primary font-medium">
              = {minutesToHHMM(net)}
            </span>
          </div>
        )}

        {!day.active && (
          <span className="text-xs text-muted-foreground italic">Dia de folga</span>
        )}
      </div>
    </div>
  );
}

// ─── Schedule editor form ─────────────────────────────────────────────────

const DEFAULT_OFF: DaySchedule = {
  active: false,
  entryTime: "08:00",
  exitTime: "17:00",
  lunchBreakMinutes: 60,
};

function blankDays(): Record<number, DaySchedule> {
  return Object.fromEntries(
    [0, 1, 2, 3, 4, 5, 6].map((d) => [d, { ...DEFAULT_OFF }]),
  );
}

function ScheduleForm({ onSaved }: { onSaved: () => void }) {
  const today = todayISO();
  const [name, setName] = useState("Segunda a Sexta");
  const [effectiveFrom, setEffectiveFrom] = useState(today);
  const [days, setDays] = useState<Record<number, DaySchedule>>(() => {
    // Start with Mon–Fri
    return Object.fromEntries(
      [0, 1, 2, 3, 4, 5, 6].map((d) => [
        d,
        {
          active: d >= 1 && d <= 5,
          entryTime: "08:00",
          exitTime: "17:00",
          lunchBreakMinutes: 60,
        },
      ]),
    );
  });

  const [defaultEntry, setDefaultEntry] = useState("08:00");
  const [defaultExit, setDefaultExit] = useState("17:00");
  const [defaultLunch, setDefaultLunch] = useState(60);

  const addSchedule = useAddSchedule();
  const { toast } = useToast();

  function applyDefaultToActive() {
    setDays((prev) => {
      const next = { ...prev };
      for (const dow of [0, 1, 2, 3, 4, 5, 6]) {
        if (next[dow]?.active) {
          next[dow] = {
            ...next[dow],
            entryTime: defaultEntry,
            exitTime: defaultExit,
            lunchBreakMinutes: defaultLunch,
          };
        }
      }
      return next;
    });
  }

  function applyProfile(profileKey: string) {
    const profile = SCHEDULE_PROFILES.find((p) => p.key === profileKey);
    if (!profile) return;
    const built = profile.build(effectiveFrom);
    setName(built.name);
    setDays(built.days);
  }

  function updateDay(dow: number, day: DaySchedule) {
    setDays((prev) => ({ ...prev, [dow]: day }));
  }

  const totalWeeklyMinutes = [0, 1, 2, 3, 4, 5, 6].reduce((sum, d) => {
    const day = days[d];
    if (!day?.active) return sum;
    return (
      sum +
      Math.max(
        0,
        hhmmToMinutes(day.exitTime) -
          hhmmToMinutes(day.entryTime) -
          Math.max(0, day.lunchBreakMinutes),
      )
    );
  }, 0);

  async function handleSave() {
    const input: WorkScheduleInput = { name: name.trim() || "Jornada", effectiveFrom, days };
    try {
      await addSchedule.mutateAsync({ data: input });
      toast({ title: "Jornada salva", description: `Vigente a partir de ${effectiveFrom}` });
      onSaved();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err?.message, variant: "destructive" });
    }
  }

  return (
    <div className="bg-card border border-card-border rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <Plus size={15} className="text-primary flex-shrink-0" />
        <h2 className="font-semibold text-sm">Nova Vigência de Jornada</h2>
      </div>

      {/* Profiles */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <Zap size={12} /> Perfis rápidos
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SCHEDULE_PROFILES.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => applyProfile(p.key)}
              className="flex flex-col gap-0.5 px-3 py-2.5 rounded-xl border-2 border-card-border bg-background text-left hover:border-primary/50 hover:bg-primary/5 transition-all"
            >
              <span className="text-xs font-semibold text-foreground">{p.label}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">{p.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Name + date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Nome da jornada</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <CalendarDays size={11} /> Vigente a partir de
          </label>
          <input
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
          />
        </div>
      </div>

      {/* Default schedule */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <Clock size={12} /> Jornada padrão
        </p>
        <div className="rounded-xl border border-card-border bg-muted/30 p-3 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground w-14">Entrada</span>
              <input
                type="time"
                value={defaultEntry}
                onChange={(e) => setDefaultEntry(e.target.value)}
                className="w-[90px] px-2 py-1 rounded-lg border border-input bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground w-14">Saída</span>
              <input
                type="time"
                value={defaultExit}
                onChange={(e) => setDefaultExit(e.target.value)}
                className="w-[90px] px-2 py-1 rounded-lg border border-input bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <UtensilsCrossed size={11} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Intervalo</span>
              <input
                type="number"
                value={defaultLunch}
                onChange={(e) => setDefaultLunch(Math.max(0, Number(e.target.value)))}
                min={0}
                max={240}
                step={5}
                className="w-16 px-2 py-1 rounded-lg border border-input bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <span className="text-xs text-muted-foreground">min</span>
            </div>
          </div>
          <button
            type="button"
            onClick={applyDefaultToActive}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-primary/40 bg-primary/5 text-primary text-xs font-medium hover:bg-primary/10 transition"
          >
            <CopyCheck size={13} />
            Aplicar aos dias ativos
          </button>
        </div>
      </div>

      {/* Per-day editor */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Configuração por dia</p>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6, 0].map((dow) => (
            <DayRow
              key={dow}
              dow={dow}
              day={days[dow]}
              onChange={(d) => updateDay(dow, d)}
            />
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2 text-xs text-muted-foreground">
        <Info size={13} className="flex-shrink-0" />
        <span>
          Carga semanal:{" "}
          <span className="font-mono font-semibold text-foreground">
            {minutesToHHMM(totalWeeklyMinutes)}
          </span>{" "}
          (
          {[0, 1, 2, 3, 4, 5, 6].filter((d) => days[d]?.active).length} dias úteis)
        </span>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={addSchedule.isPending}
        className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 active:opacity-80 transition disabled:opacity-60 shadow-sm"
      >
        {addSchedule.isPending ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <Check size={15} />
        )}
        Salvar Jornada
      </button>
    </div>
  );
}

// ─── Schedule history card ─────────────────────────────────────────────────

function ScheduleCard({
  schedule,
  isActive,
  canDelete,
}: {
  schedule: WorkSchedule;
  isActive: boolean;
  canDelete: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const deleteSchedule = useDeleteSchedule();
  const { toast } = useToast();

  const activeDays = [1, 2, 3, 4, 5, 6, 0].filter((d) => schedule.days[d]?.active);
  const weeklyMin = activeDays.reduce((sum, d) => {
    const day = schedule.days[d];
    return (
      sum +
      Math.max(
        0,
        hhmmToMinutes(day.exitTime) -
          hhmmToMinutes(day.entryTime) -
          Math.max(0, day.lunchBreakMinutes),
      )
    );
  }, 0);

  function fmt(iso: string) {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  async function handleDelete() {
    if (!canDelete) return;
    if (!confirm(`Remover a vigência "${schedule.name}" (a partir de ${fmt(schedule.effectiveFrom)})?`)) return;
    try {
      await deleteSchedule.mutateAsync({ id: schedule.id });
      toast({ title: "Vigência removida" });
    } catch (err: any) {
      toast({ title: "Erro", description: err?.message, variant: "destructive" });
    }
  }

  return (
    <div
      className={cn(
        "bg-card border rounded-2xl shadow-sm overflow-hidden",
        isActive ? "border-primary/40 ring-1 ring-primary/20" : "border-card-border",
      )}
    >
      <div className="p-4 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{schedule.name}</span>
            {isActive && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                Vigente
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            A partir de {fmt(schedule.effectiveFrom)} ·{" "}
            <span className="font-mono">{minutesToHHMM(weeklyMin)}</span>/semana ·{" "}
            {activeDays.length} dia{activeDays.length !== 1 ? "s" : ""} úteis
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeDays.map((d) => DAY_NAMES_SHORT[d]).join(", ")}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition"
            title="Detalhes"
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteSchedule.isPending}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition disabled:opacity-40"
              title="Remover vigência"
            >
              {deleteSchedule.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-card-border px-4 pb-4 pt-3 space-y-1.5">
          {[1, 2, 3, 4, 5, 6, 0].map((dow) => {
            const day = schedule.days[dow];
            if (!day) return null;
            const net = day.active
              ? Math.max(
                  0,
                  hhmmToMinutes(day.exitTime) -
                    hhmmToMinutes(day.entryTime) -
                    Math.max(0, day.lunchBreakMinutes),
                )
              : 0;
            return (
              <div key={dow} className="flex items-center gap-3 text-xs">
                <span
                  className={cn(
                    "w-24 font-medium",
                    !day.active && "text-muted-foreground line-through",
                  )}
                >
                  {DAY_NAMES_FULL[dow]}
                </span>
                {day.active ? (
                  <>
                    <span className="font-mono text-muted-foreground">
                      {day.entryTime} → {day.exitTime}
                    </span>
                    <span className="text-muted-foreground">
                      − {day.lunchBreakMinutes}min almoço
                    </span>
                    <span className="font-mono font-semibold text-primary">
                      = {minutesToHHMM(net)}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground italic">Folga</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────

export default function Jornada() {
  const { data: schedules = [], isLoading } = useGetSchedules();
  const [showForm, setShowForm] = useState(false);
  const today = todayISO();

  const activeSchedule = getScheduleForDate(today, schedules);

  // Sort descending (newest first)
  const sorted = [...schedules].sort((a, b) =>
    b.effectiveFrom.localeCompare(a.effectiveFrom),
  );

  return (
    <div className="space-y-5 pt-1">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl md:text-lg font-semibold flex items-center gap-2">
          <CalendarDays size={20} className="text-primary flex-shrink-0" />
          Jornada de Trabalho
        </h1>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-sm"
        >
          <Plus size={15} />
          Nova Vigência
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 text-xs text-blue-700 dark:text-blue-300 space-y-1">
        <p className="font-semibold">Como funciona</p>
        <ul className="space-y-0.5 list-disc list-inside">
          <li>Cada vigência define a jornada a partir de uma data específica</li>
          <li>Registros <strong>anteriores</strong> continuam usando a escala que estava em vigor na época</li>
          <li>Alterar a jornada agora não afeta o histórico já lançado</li>
          <li>Feriados e domingos sem lançamento são sempre neutros</li>
        </ul>
      </div>

      {/* New schedule form */}
      {showForm && (
        <ScheduleForm onSaved={() => setShowForm(false)} />
      )}

      {/* Schedule history */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-card border border-card-border rounded-2xl h-20 animate-pulse" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-card border border-card-border rounded-2xl p-10 flex flex-col items-center gap-3 text-muted-foreground">
          <CalendarDays size={36} className="opacity-30" />
          <p className="text-sm">Nenhuma jornada configurada</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
            Histórico de vigências
          </p>
          {sorted.map((s) => (
            <ScheduleCard
              key={s.id}
              schedule={s}
              isActive={s.id === activeSchedule?.id}
              canDelete={sorted.length > 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
