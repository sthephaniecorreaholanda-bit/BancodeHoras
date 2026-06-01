import {
  useGetSummary,
  useGetSettings,
} from "@/lib/api-local";
import { EvolutionChart } from "@/components/EvolutionChart";
import {
  formatMinutes,
  getBalanceColor,
  getBalanceBg,
} from "@/lib/time";
import {
  Briefcase,
  UmbrellaOff,
  CalendarX2,
  Clock,
  Target,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
        fullWidth && "col-span-2 md:col-span-2 lg:col-span-4"
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
  // How far the user needs to move (from current to goal)
  const needed = goalMinutes - currentMinutes; // positive = needs more, negative = already exceeded
  const reached = needed <= 0;

  // Progress: how much of the "distance to travel" has been covered
  // If goal > current: progress = current - start_of_period / distance... 
  // Simpler: ratio = current / goal when goal > 0 or 0 when same sign edge cases
  let pct = 0;
  if (goalMinutes === currentMinutes) {
    pct = 100;
  } else if (goalMinutes > 0) {
    // Goal is positive: want to accumulate hours
    pct = Math.min(100, Math.max(0, (currentMinutes / goalMinutes) * 100));
  } else if (goalMinutes < 0) {
    // Goal is negative: want to pay off debt (go from more negative to goal)
    // If current < goal (both negative), user is further in debt
    pct = reached ? 100 : Math.min(100, Math.max(0, (currentMinutes / goalMinutes) * 100));
  } else {
    // Goal = 0: zero out the bank
    // The further current is from 0, the less progress
    if (currentMinutes === 0) {
      pct = 100;
    } else {
      // Can't really compute without knowing starting point, just show 0 or near
      pct = reached ? 100 : 0;
    }
  }

  const barColor = reached
    ? "bg-emerald-500"
    : pct >= 70
    ? "bg-primary"
    : pct >= 40
    ? "bg-amber-500"
    : "bg-rose-500";

  // Days remaining in current month
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = lastDay - now.getDate();

  return (
    <div className="col-span-2 md:col-span-2 lg:col-span-4 bg-card border border-card-border rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-primary" />
          <span className="text-xs font-medium text-muted-foreground">Meta de Saldo</span>
        </div>
        <div className="flex items-center gap-1.5">
          {reached ? (
            <TrendingUp size={14} className="text-emerald-500" />
          ) : (
            <TrendingDown size={14} className="text-rose-500" />
          )}
          <span
            className={cn(
              "text-xs font-semibold",
              reached ? "text-emerald-500" : "text-rose-500"
            )}
          >
            {reached ? "Meta atingida!" : `Faltam ${formatMinutes(Math.abs(needed))}`}
          </span>
        </div>
      </div>

      {/* Progress bar */}
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

      {/* Days remaining hint */}
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

export default function Painel() {
  const { data: summary, isLoading } = useGetSummary();
  const { data: settings } = useGetSettings();

  const balance = summary?.totalBalanceMinutes ?? 0;
  const balanceColor = getBalanceColor(balance);
  const balanceBg = getBalanceBg(balance);

  const hasGoal =
    settings?.goalMinutes !== null && settings?.goalMinutes !== undefined;

  return (
    <div className="space-y-6">
      <h1 className="font-semibold text-lg flex items-center gap-2">
        <Clock size={20} className="text-primary" />
        Painel de Resumo
      </h1>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "bg-card border border-card-border rounded-2xl p-4 h-24 animate-pulse",
                i === 0 && "col-span-2 md:col-span-2 lg:col-span-4"
              )}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
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
            label="Ajuste Manual"
            value={formatMinutes(summary?.manualAdjustmentMinutes ?? 0)}
            colorClass={getBalanceColor(summary?.manualAdjustmentMinutes ?? 0)}
          />
        </div>
      )}

      <EvolutionChart />
    </div>
  );
}
