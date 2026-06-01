import { useState } from "react";
import { useGetMonthlyEvolution } from "@/lib/api-local";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from "recharts";
import { formatMinutes, getBalanceColor } from "@/lib/time";
import { cn } from "@/lib/utils";
import { BarChart2, ChevronLeft, ChevronRight } from "lucide-react";

const MONTH_NAMES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const MONTH_NAMES_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const color = val > 0 ? "#10b981" : val < 0 ? "#f43f5e" : "#94a3b8";
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="font-medium text-foreground mb-0.5">{label}</p>
      <p style={{ color }} className="font-semibold tabular-nums">
        {formatMinutes(val)}
      </p>
    </div>
  );
}

export default function Anual() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const { data: evolutionData, isLoading } = useGetMonthlyEvolution();

  // Build a map of label → cumulative from the API
  // Labels look like "Jan/2026", "Fev/2026", etc.
  const allCumulative: Record<string, number> = {};
  if (evolutionData) {
    for (const entry of evolutionData) {
      allCumulative[entry.label] = entry.cumulativeBalanceMinutes;
    }
  }

  // For each month of the selected year, compute the per-month balance
  // as cumulative[month] - cumulative[prev month], handling year boundaries.
  const months = MONTH_NAMES.map((shortName, idx) => {
    const label = `${shortName}/${year}`;
    const hasData = label in allCumulative;

    if (!hasData) {
      return { label: shortName, balance: null as number | null };
    }

    const cumulative = allCumulative[label];

    // Find the previous month's cumulative (could be in prev year)
    let prevCumulative = 0;
    if (idx === 0) {
      // January — look for Dec of previous year
      const prevLabel = `Dez/${year - 1}`;
      if (prevLabel in allCumulative) {
        prevCumulative = allCumulative[prevLabel];
      }
      // else it's the very first month in the dataset → balance = cumulative
    } else {
      const prevLabel = `${MONTH_NAMES[idx - 1]}/${year}`;
      if (prevLabel in allCumulative) {
        prevCumulative = allCumulative[prevLabel];
      } else {
        // gap month — find last known cumulative before this month in this year
        for (let i = idx - 1; i >= 0; i--) {
          const candidateLabel = `${MONTH_NAMES[i]}/${year}`;
          if (candidateLabel in allCumulative) {
            prevCumulative = allCumulative[candidateLabel];
            break;
          }
        }
        // if still not found, try previous year's Dec
        if (prevCumulative === 0) {
          const prevLabel = `Dez/${year - 1}`;
          if (prevLabel in allCumulative) {
            prevCumulative = allCumulative[prevLabel];
          }
        }
      }
    }

    return { label: shortName, balance: cumulative - prevCumulative };
  });

  const hasAnyData = months.some((m) => m.balance !== null);

  // Cumulative line data (for the summary cards)
  const lastMonthWithData = [...months].reverse().find((m) => m.balance !== null);
  const yearTotal = months.reduce<number>((sum, m) => sum + (m.balance ?? 0), 0);

  // Summary stats
  const positiveMonths = months.filter((m) => (m.balance ?? 0) > 0).length;
  const negativeMonths = months.filter((m) => (m.balance ?? 0) < 0).length;

  // Chart data — replace null with 0 for rendering but mark visually
  const chartData = months.map((m) => ({
    label: m.label,
    balance: m.balance ?? 0,
    hasData: m.balance !== null,
  }));

  return (
    <div className="space-y-5 pt-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-lg flex items-center gap-2">
          <BarChart2 size={20} className="text-primary" />
          Relatório Anual
        </h1>

        {/* Year picker */}
        <div className="flex items-center gap-1 bg-card border border-card-border rounded-xl px-2 py-1 shadow-sm">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent transition text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="font-semibold text-sm w-12 text-center tabular-nums">{year}</span>
          <button
            onClick={() => setYear((y) => y + 1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent transition text-muted-foreground hover:text-foreground"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {hasAnyData && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-card-border rounded-2xl p-4 shadow-sm text-center">
            <p className="text-xs text-muted-foreground mb-1">Saldo do Ano</p>
            <p className={cn("text-xl font-bold tabular-nums", getBalanceColor(yearTotal))}>
              {formatMinutes(yearTotal)}
            </p>
          </div>
          <div className="bg-card border border-card-border rounded-2xl p-4 shadow-sm text-center">
            <p className="text-xs text-muted-foreground mb-1">Meses Positivos</p>
            <p className="text-xl font-bold text-emerald-500">{positiveMonths}</p>
          </div>
          <div className="bg-card border border-card-border rounded-2xl p-4 shadow-sm text-center">
            <p className="text-xs text-muted-foreground mb-1">Meses Negativos</p>
            <p className="text-xl font-bold text-rose-500">{negativeMonths}</p>
          </div>
        </div>
      )}

      {/* Bar chart */}
      <div className="bg-card border border-card-border rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">
          Saldo por Mês — {year}
        </h3>

        {isLoading ? (
          <div className="h-56 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !hasAnyData ? (
          <div className="h-56 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <BarChart2 size={36} className="opacity-30" />
            <p className="text-sm">Nenhum registro em {year}</p>
            <p className="text-xs opacity-60">Navegue para outro ano ou registre pontos primeiro</p>
          </div>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
                barCategoryGap="30%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  opacity={0.5}
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => formatMinutes(v)}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1.5} />
                <Bar dataKey="balance" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={
                        !entry.hasData
                          ? "hsl(var(--muted))"
                          : entry.balance > 0
                          ? "hsl(var(--primary))"
                          : entry.balance < 0
                          ? "hsl(var(--destructive))"
                          : "hsl(var(--muted-foreground))"
                      }
                      opacity={entry.hasData ? 1 : 0.3}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Monthly breakdown table */}
      {hasAnyData && (
        <div className="bg-card border border-card-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-card-border">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Detalhamento Mensal
            </h3>
          </div>
          <div className="divide-y divide-card-border">
            {months.map((m, idx) => {
              if (m.balance === null) return null;
              return (
                <div key={m.label} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm font-medium">
                    {MONTH_NAMES_FULL[idx]} {year}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-bold tabular-nums",
                      getBalanceColor(m.balance)
                    )}
                  >
                    {formatMinutes(m.balance)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
