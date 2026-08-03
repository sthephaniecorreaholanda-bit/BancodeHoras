import { useState } from "react";
import {
  useGetMonthlySummary,
  useGetSettings,
  useListVacations,
} from "@/lib/api-local";
import { EvolutionChart } from "@/components/EvolutionChart";
import {
  formatMinutes,
  getBalanceColor,
  getBalanceBg,
  minutesToHHMM,
} from "@/lib/time";
import {
  Briefcase,
  UmbrellaOff,
  CalendarX2,
  Clock,
  Target,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Palmtree,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function MonthPicker({
  month,
  year,
  onChange,
}: {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
}) {
  function prev() {
    if (month === 1) onChange(12, year - 1);
    else onChange(month - 1, year);
  }
  function next() {
    if (month === 12) onChange(1, year + 1);
    else onChange(month + 1, year);
  }
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={prev}
        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent transition text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft size={15} />
      </button>
      <span className="text-sm font-semibold w-36 text-center tabular-nums">
        {MONTHS[month - 1]} {year}
      </span>
      <button
        onClick={next}
        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent transition text-muted-foreground hover:text-foreground"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  colorClass,
  bgClass,
  fullWidth,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  colorClass?: string;
  bgClass?: string;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 flex flex-col gap-3 shadow-sm",
        bgClass ?? "bg-card border-card-border",
        fullWidth && "col-span-1 sm:col-span-2 lg:col-span-4"
      )}
    >
      <div className="flex items-center gap-2">
        <Icon size={16} className={colorClass ?? "text-muted-foreground"} />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className={cn("text-2xl font-bold tracking-tight", colorClass ?? "text-foreground")}>
        {value}
      </p>
    </div>
  );
}

function GoalCard({
  currentMinutes,
  goalMinutes,
}: {
  currentMinutes: number;
  goalMinutes: number;
}) {
  const needed = goalMinutes - currentMinutes;
  const reached = needed <= 0;

  let pct = 0;
  if (goalMinutes === currentMinutes) {
    pct = 100;
  } else if (goalMinutes > 0) {
    pct = Math.min(100, Math.max(0, (currentMinutes / goalMinutes) * 100));
  } else if (goalMinutes < 0) {
    pct = reached ? 100 : Math.min(100, Math.max(0, (currentMinutes / goalMinutes) * 100));
  } else {
    pct = currentMinutes === 0 ? 100 : reached ? 100 : 0;
  }

  const barColor = reached
    ? "bg-primary"
    : pct >= 70
    ? "bg-primary/70"
    : pct >= 40
    ? "bg-amber-500"
    : "bg-destructive";

  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = lastDay - now.getDate();

  return (
    <div className="col-span-1 sm:col-span-2 lg:col-span-4 bg-card border border-card-border rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-primary" />
          <span className="text-xs font-medium text-muted-foreground">Meta de Saldo</span>
        </div>
        <div className="flex items-center gap-1.5">
          {reached ? (
            <TrendingUp size={14} className="text-primary" />
          ) : (
            <TrendingDown size={14} className="text-destructive" />
          )}
          <span className={cn("text-xs font-semibold", reached ? "text-primary" : "text-destructive")}>
            {reached ? "Meta atingida!" : `Faltam ${formatMinutes(Math.abs(needed))}`}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-700", barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="tabular-nums font-mono">
            Atual: <span className={cn("font-semibold", getBalanceColor(currentMinutes))}>{formatMinutes(currentMinutes)}</span>
          </span>
          <span className="tabular-nums font-mono">
            Meta: <span className="font-semibold text-foreground">{formatMinutes(goalMinutes)}</span>
          </span>
        </div>
      </div>

      {!reached && daysLeft > 0 && (
        <p className="text-xs text-muted-foreground">
          Restam{" "}
          <span className="font-medium text-foreground">{daysLeft} dia{daysLeft !== 1 ? "s" : ""}</span>{" "}
          no mês — precisaria de aprox.{" "}
          <span className="font-mono font-medium text-foreground">
            {formatMinutes(Math.ceil(Math.abs(needed) / daysLeft))}
          </span>{" "}
          por dia para atingir a meta.
        </p>
      )}
    </div>
  );
}

function VacationCard({ vacations }: { vacations: import("@/lib/types").VacationPeriod[] }) {
  const today = new Date().toISOString().slice(0, 10);

  const active = vacations.find((v) => today >= v.startDate && today <= v.endDate);
  const upcoming = vacations
    .filter((v) => v.startDate > today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];

  if (!active && !upcoming) return null;

  function fmt(iso: string) {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }
  function diffDays(start: string, end: string) {
    const s = new Date(start + "T00:00:00");
    const e = new Date(end + "T00:00:00");
    return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
  }
  function daysUntil(dateISO: string) {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    const tgt = new Date(dateISO + "T00:00:00");
    return Math.round((tgt.getTime() - t.getTime()) / 86400000);
  }

  return (
    <div className="col-span-1 sm:col-span-2 lg:col-span-4 bg-card border border-card-border rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Palmtree size={16} className="text-primary" />
        <span className="text-xs font-medium text-muted-foreground">Férias</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {active && (
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Status atual</p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">🏖 Em férias agora</p>
            <p className="text-xs text-muted-foreground">
              Até {fmt(active.endDate)} · {diffDays(today, active.endDate)} dia{diffDays(today, active.endDate) !== 1 ? "s" : ""} restante{diffDays(today, active.endDate) !== 1 ? "s" : ""}
            </p>
          </div>
        )}
        {upcoming && (
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Próximas férias</p>
            <p className="text-sm font-bold text-foreground">{fmt(upcoming.startDate)}</p>
            <p className="text-xs text-muted-foreground">
              Em {daysUntil(upcoming.startDate)} dia{daysUntil(upcoming.startDate) !== 1 ? "s" : ""} · {diffDays(upcoming.startDate, upcoming.endDate)} dias de férias
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Painel() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: summary, isLoading } = useGetMonthlySummary(month, year);
  const { data: settings } = useGetSettings();
  const { data: vacations = [] } = useListVacations();

  const balance = summary?.totalBalanceMinutes ?? 0;
  const balanceColor = getBalanceColor(balance);
  const balanceBg = getBalanceBg(balance);

  const hasGoal =
    settings?.goalMinutes !== null && settings?.goalMinutes !== undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl md:text-lg font-semibold flex items-center gap-2">
          <Clock size={20} className="text-primary flex-shrink-0" />
          Painel de Resumo
        </h1>
        <MonthPicker
          month={month}
          year={year}
          onChange={(m, y) => { setMonth(m); setYear(y); }}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "bg-card border border-card-border rounded-2xl p-4 h-24 animate-pulse",
                i === 0 && "col-span-1 sm:col-span-2 lg:col-span-4"
              )}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard
            fullWidth
            icon={Clock}
            label="Saldo Total Acumulado"
            value={formatMinutes(balance)}
            colorClass={balanceColor}
            bgClass={balanceBg}
          />

          {hasGoal && (
            <GoalCard
              currentMinutes={balance}
              goalMinutes={settings!.goalMinutes!}
            />
          )}

          {vacations.length > 0 && <VacationCard vacations={vacations} />}

          <SummaryCard
            icon={Briefcase}
            label="Dias Trabalhados"
            value={String(summary?.daysWorked ?? 0)}
          />
          <SummaryCard
            icon={UmbrellaOff}
            label="Folgas Compensadas"
            value={String(summary?.compensatedLeaves ?? 0)}
          />
          <SummaryCard
            icon={CalendarX2}
            label="Feriados / Folgas"
            value={String(summary?.holidays ?? 0)}
          />
          <SummaryCard
            icon={Clock}
            label={`Horas Trabalhadas — ${MONTHS[month - 1]}`}
            value={minutesToHHMM(summary?.workedMinutes ?? 0)}
          />
        </div>
      )}

      <EvolutionChart
        month={month}
        year={year}
        onMonthChange={(m, y) => { setMonth(m); setYear(y); }}
      />
    </div>
  );
}
