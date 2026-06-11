import { useState, useMemo } from "react";
import { useListRecords } from "@/lib/api-local";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { formatMinutes } from "@/lib/time";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// ─── Helpers ──────────────────────────────────────────────────────────────

function balanceColor(minutes: number) {
  if (minutes > 0) return "#10b981";
  if (minutes < 0) return "#f43f5e";
  return "#94a3b8";
}

function balanceBg(minutes: number) {
  if (minutes > 0) return "rgba(16,185,129,0.1)";
  if (minutes < 0) return "rgba(244,63,94,0.1)";
  return "rgba(148,163,184,0.08)";
}

// ─── Advanced Tooltip ─────────────────────────────────────────────────────

function AdvancedTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as {
    label: string;
    fullDate: string;
    saldo: number;
    workedMinutes: number;
    balanceMinutes: number;
  };
  if (!d) return null;

  const [y, m, day] = d.fullDate.split("-");
  const dateStr = `${day}/${m}/${y}`;
  const deltaLabel = d.balanceMinutes >= 0 ? "Crédito do dia" : "Débito do dia";
  const saldoClr = balanceColor(d.saldo);
  const deltaClr = balanceColor(d.balanceMinutes);

  return (
    <div
      className="rounded-2xl border border-border bg-popover shadow-2xl text-xs"
      style={{ minWidth: 190, padding: "12px 14px" }}
    >
      <p className="font-semibold text-foreground mb-2.5 text-sm">{dateStr}</p>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-5">
          <span className="text-muted-foreground">Saldo acumulado</span>
          <span className="font-bold font-mono" style={{ color: saldoClr }}>
            {formatMinutes(d.saldo)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-5">
          <span className="text-muted-foreground">Horas trabalhadas</span>
          <span className="font-mono text-foreground">
            {formatMinutes(d.workedMinutes ?? 0)}
          </span>
        </div>
        <div className="h-px bg-border my-0.5" />
        <div className="flex items-center justify-between gap-5">
          <span className="text-muted-foreground">{deltaLabel}</span>
          <span className="font-bold font-mono" style={{ color: deltaClr }}>
            {formatMinutes(d.balanceMinutes)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Summary mini-card ────────────────────────────────────────────────────

function MiniCard({
  label,
  value,
  minutes,
  icon: Icon,
}: {
  label: string;
  value: string;
  minutes: number;
  icon: React.ElementType;
}) {
  const clr = balanceColor(minutes);
  const bg = balanceBg(minutes);
  return (
    <div
      className="flex-1 min-w-0 rounded-2xl border border-card-border p-3 sm:p-4 flex flex-col gap-1.5"
      style={{ background: bg }}
    >
      <div className="flex items-center gap-1.5">
        <Icon size={13} style={{ color: clr }} className="flex-shrink-0" />
        <span className="text-xs text-muted-foreground truncate">{label}</span>
      </div>
      <p className="text-lg sm:text-xl font-bold font-mono tracking-tight leading-none" style={{ color: clr }}>
        {value}
      </p>
    </div>
  );
}

// ─── Month Picker ─────────────────────────────────────────────────────────

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
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={prev}
        className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-accent transition text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm font-semibold w-36 text-center tabular-nums">
        {MONTHS[month - 1]} {year}
      </span>
      <button
        onClick={next}
        className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-accent transition text-muted-foreground hover:text-foreground"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

// ─── Daily Area Chart ─────────────────────────────────────────────────────

function DailyAreaChart({ month, year }: { month: number; year: number }) {
  const { data: records, isLoading } = useListRecords({ month, year });

  const { chartData, summaryStats } = useMemo(() => {
    if (!records || records.length === 0) {
      return { chartData: [], summaryStats: null };
    }

    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));

    let cumulative = 0;
    const data = sorted.map((r) => {
      cumulative += r.balanceMinutes;
      const [y, m, d] = r.date.split("-");
      return {
        label: `${d}/${m}`,
        fullDate: r.date,
        saldo: cumulative,
        workedMinutes: r.workedMinutes ?? 0,
        balanceMinutes: r.balanceMinutes,
      };
    });

    const lastSaldo = data[data.length - 1].saldo;
    const totalBalance = sorted.reduce((s, r) => s + r.balanceMinutes, 0);
    const avgDaily = sorted.length > 0 ? Math.round(totalBalance / sorted.length) : 0;

    return {
      chartData: data,
      summaryStats: {
        saldoAtual: lastSaldo,
        variacao: totalBalance,
        mediaDiaria: avgDaily,
      },
    };
  }, [records]);

  // Compute gradient stops for zero crossing
  const { zeroStop, allPositive, allNegative } = useMemo(() => {
    if (!chartData.length)
      return { zeroStop: "50%", allPositive: false, allNegative: false };

    const allSaldos = chartData.map((d) => d.saldo);
    const dataMin = Math.min(...allSaldos);
    const dataMax = Math.max(...allSaldos);

    const ap = dataMin >= 0;
    const an = dataMax <= 0;

    let zs = "50%";
    if (!ap && !an) {
      // Has both positive and negative
      const domainMax = dataMax * 1.05;
      const domainMin = dataMin * 1.05;
      const range = domainMax - domainMin;
      if (range > 0) {
        zs = `${((domainMax / range) * 100).toFixed(1)}%`;
      }
    }

    return { zeroStop: zs, allPositive: ap, allNegative: an };
  }, [chartData]);

  const positiveColor = "#10b981";
  const negativeColor = "#f43f5e";
  const mainLineColor = allPositive
    ? positiveColor
    : allNegative
    ? negativeColor
    : "url(#lineGrad)";
  const mainFillColor = allPositive
    ? "url(#areaGradPos)"
    : allNegative
    ? "url(#areaGradNeg)"
    : "url(#areaGradMix)";

  if (isLoading) {
    return (
      <div className="h-56 sm:h-72 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <div className="h-56 sm:h-72 flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <TrendingUp size={32} className="opacity-30" />
        <p className="text-sm">Nenhum registro em {MONTHS[month - 1]}</p>
      </div>
    );
  }

  const saldoIcon =
    (summaryStats?.saldoAtual ?? 0) > 0
      ? TrendingUp
      : (summaryStats?.saldoAtual ?? 0) < 0
      ? TrendingDown
      : Minus;

  return (
    <div className="space-y-4">
      {/* Summary mini-cards */}
      {summaryStats && (
        <div className="flex gap-2 sm:gap-3">
          <MiniCard
            label="Saldo Atual"
            value={formatMinutes(summaryStats.saldoAtual)}
            minutes={summaryStats.saldoAtual}
            icon={saldoIcon}
          />
          <MiniCard
            label="Variação no período"
            value={formatMinutes(summaryStats.variacao)}
            minutes={summaryStats.variacao}
            icon={summaryStats.variacao >= 0 ? TrendingUp : TrendingDown}
          />
          <MiniCard
            label="Média diária"
            value={formatMinutes(summaryStats.mediaDiaria)}
            minutes={summaryStats.mediaDiaria}
            icon={Minus}
          />
        </div>
      )}

      {/* Area chart */}
      <div className="h-56 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 8, right: 4, left: -8, bottom: 0 }}
          >
            <defs>
              {/* All positive */}
              <linearGradient id="areaGradPos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={positiveColor} stopOpacity={0.35} />
                <stop offset="100%" stopColor={positiveColor} stopOpacity={0.02} />
              </linearGradient>
              {/* All negative */}
              <linearGradient id="areaGradNeg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={negativeColor} stopOpacity={0.05} />
                <stop offset="100%" stopColor={negativeColor} stopOpacity={0.35} />
              </linearGradient>
              {/* Mixed — green above zero, red below */}
              <linearGradient id="areaGradMix" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={positiveColor} stopOpacity={0.35} />
                <stop offset={zeroStop} stopColor={positiveColor} stopOpacity={0.04} />
                <stop offset={zeroStop} stopColor={negativeColor} stopOpacity={0.04} />
                <stop offset="100%" stopColor={negativeColor} stopOpacity={0.35} />
              </linearGradient>
              {/* Mixed line gradient */}
              <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={positiveColor} />
                <stop offset={zeroStop} stopColor={positiveColor} />
                <stop offset={zeroStop} stopColor={negativeColor} />
                <stop offset="100%" stopColor={negativeColor} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.35}
              vertical={false}
            />

            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              dy={4}
            />

            <YAxis
              tickFormatter={(v: number) => formatMinutes(v)}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              width={54}
            />

            <Tooltip
              content={<AdvancedTooltip />}
              cursor={{
                stroke: "hsl(var(--muted-foreground))",
                strokeWidth: 1,
                strokeDasharray: "4 3",
              }}
            />

            {/* Zero reference line — prominent */}
            <ReferenceLine
              y={0}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1.5}
              strokeDasharray="0"
              label={{
                value: "0h",
                position: "insideLeft",
                fontSize: 10,
                fill: "hsl(var(--muted-foreground))",
                dy: -6,
              }}
            />

            <Area
              type="monotone"
              dataKey="saldo"
              stroke={mainLineColor}
              strokeWidth={2.5}
              fill={mainFillColor}
              dot={
                chartData.length <= 20
                  ? {
                      r: 3.5,
                      fill: allPositive
                        ? positiveColor
                        : allNegative
                        ? negativeColor
                        : "hsl(var(--primary))",
                      strokeWidth: 0,
                    }
                  : false
              }
              activeDot={{
                r: 6,
                fill: allPositive
                  ? positiveColor
                  : allNegative
                  ? negativeColor
                  : "hsl(var(--primary))",
                strokeWidth: 2,
                stroke: "hsl(var(--background))",
              }}
              isAnimationActive={true}
              animationDuration={600}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Weekly Bar Chart ─────────────────────────────────────────────────────

function WeeklyBarChart({ month, year }: { month: number; year: number }) {
  const { data: records, isLoading } = useListRecords({ month, year });

  const chartData = useMemo(() => {
    if (!records || records.length === 0) return [];
    const weekMap = new Map<number, number>();
    for (const r of records) {
      const day = parseInt(r.date.slice(8, 10));
      const weekNum = Math.ceil(day / 7);
      weekMap.set(weekNum, (weekMap.get(weekNum) ?? 0) + r.balanceMinutes);
    }
    const weeks = Array.from(weekMap.keys()).sort((a, b) => a - b);
    let cumulative = 0;
    return weeks.map((w) => {
      cumulative += weekMap.get(w) ?? 0;
      return { label: `Sem ${w}`, saldo: cumulative };
    });
  }, [records]);

  if (isLoading) {
    return (
      <div className="h-56 sm:h-72 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <div className="h-56 sm:h-72 flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <TrendingUp size={32} className="opacity-30" />
        <p className="text-sm">Nenhum registro em {MONTHS[month - 1]}</p>
      </div>
    );
  }

  return (
    <div className="h-56 sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 4, left: -8, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            opacity={0.35}
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            dy={4}
          />
          <YAxis
            tickFormatter={(v: number) => formatMinutes(v)}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            width={54}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const val = payload[0].value as number;
              return (
                <div className="rounded-2xl border border-border bg-popover shadow-2xl text-xs px-4 py-3 min-w-[150px]">
                  <p className="font-semibold text-foreground mb-1.5">{label}</p>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Saldo acumulado</span>
                    <span className="font-bold font-mono" style={{ color: balanceColor(val) }}>
                      {formatMinutes(val)}
                    </span>
                  </div>
                </div>
              );
            }}
          />
          <ReferenceLine
            y={0}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1.5}
            label={{
              value: "0h",
              position: "insideLeft",
              fontSize: 10,
              fill: "hsl(var(--muted-foreground))",
              dy: -6,
            }}
          />
          <Bar dataKey="saldo" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {chartData.map((entry, index) => (
              <Cell
                key={index}
                fill={
                  entry.saldo > 0
                    ? "#10b981"
                    : entry.saldo < 0
                    ? "#f43f5e"
                    : "#94a3b8"
                }
                opacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────

type ViewMode = "daily" | "weekly";

export function EvolutionChart() {
  const now = new Date();
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  return (
    <div className="bg-card border border-card-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-base text-foreground leading-tight">
            Banco de Horas
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Evolução do saldo acumulado
          </p>
        </div>

        {/* View toggle */}
        <div className="flex rounded-xl overflow-hidden border border-card-border text-xs font-medium flex-shrink-0">
          <button
            onClick={() => setViewMode("daily")}
            className={cn(
              "px-3 py-1.5 transition-colors",
              viewMode === "daily"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:text-foreground"
            )}
          >
            Diário
          </button>
          <button
            onClick={() => setViewMode("weekly")}
            className={cn(
              "px-3 py-1.5 transition-colors",
              viewMode === "weekly"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:text-foreground"
            )}
          >
            Semanal
          </button>
        </div>
      </div>

      {/* Month navigation */}
      <MonthPicker
        month={month}
        year={year}
        onChange={(m, y) => { setMonth(m); setYear(y); }}
      />

      {/* Chart */}
      {viewMode === "daily" ? (
        <DailyAreaChart month={month} year={year} />
      ) : (
        <WeeklyBarChart month={month} year={year} />
      )}
    </div>
  );
}
