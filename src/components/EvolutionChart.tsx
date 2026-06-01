import { useState } from "react";
import { useListRecords } from "@/lib/api-local";
import {
  ResponsiveContainer,
  LineChart,
  Line,
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
import { TrendingUp } from "lucide-react";

type ViewMode = "monthly" | "weekly";

const MONTHS = [
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
      <p style={{ color }} className="font-semibold">
        {formatMinutes(val)}
      </p>
    </div>
  );
}

// Month picker shared between both views
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
    <div className="flex items-center justify-between bg-muted rounded-xl px-3 py-2">
      <button
        onClick={prev}
        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent transition text-muted-foreground hover:text-foreground"
      >
        ‹
      </button>
      <span className="text-sm font-medium">
        {MONTHS[month - 1]} {year}
      </span>
      <button
        onClick={next}
        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent transition text-muted-foreground hover:text-foreground"
      >
        ›
      </button>
    </div>
  );
}

// Day-by-day cumulative line chart for the selected month
function DailyChart({ month, year }: { month: number; year: number }) {
  const { data: records, isLoading } = useListRecords({ month, year });

  if (isLoading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!records || records.length === 0) {
    return (
      <div className="h-48 flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <TrendingUp size={28} className="opacity-40" />
        <p className="text-sm">Nenhum registro em {MONTHS[month - 1]}</p>
      </div>
    );
  }

  // Sort ascending by date
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));

  // Build cumulative series
  let cumulative = 0;
  const chartData = sorted.map((r) => {
    cumulative += r.balanceMinutes;
    const day = r.date.slice(8, 10); // "05"
    const mon = r.date.slice(5, 7);  // "05"
    return {
      label: `${day}/${mon}`,
      saldo: cumulative,
    };
  });

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v: number) => formatMinutes(v)}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1.5} />
          <Line
            type="monotone"
            dataKey="saldo"
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            dot={chartData.length <= 20 ? { r: 3, fill: "hsl(var(--primary))", strokeWidth: 0 } : false}
            activeDot={{ r: 5, fill: "hsl(var(--primary))", strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Weekly bar chart: one bar per week of the selected month (cumulative within month)
function WeeklyChart({ month, year }: { month: number; year: number }) {
  const { data: records, isLoading } = useListRecords({ month, year });

  if (isLoading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!records || records.length === 0) {
    return (
      <div className="h-48 flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <TrendingUp size={28} className="opacity-40" />
        <p className="text-sm">Nenhum registro em {MONTHS[month - 1]}</p>
      </div>
    );
  }

  // Group by week-of-month (days 1-7 = Sem 1, 8-14 = Sem 2, etc.)
  const weekMap = new Map<number, number>();
  for (const r of records) {
    const day = parseInt(r.date.slice(8, 10));
    const weekNum = Math.ceil(day / 7);
    weekMap.set(weekNum, (weekMap.get(weekNum) ?? 0) + r.balanceMinutes);
  }

  const weeks = Array.from(weekMap.keys()).sort((a, b) => a - b);
  let cumulative = 0;
  const chartData = weeks.map((w) => {
    cumulative += weekMap.get(w) ?? 0;
    return { label: `Sem ${w}`, saldo: cumulative };
  });

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
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
            width={52}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1.5} />
          <Bar dataKey="saldo" radius={[6, 6, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={index}
                fill={
                  entry.saldo > 0
                    ? "hsl(var(--primary))"
                    : entry.saldo < 0
                    ? "hsl(var(--destructive))"
                    : "hsl(var(--muted-foreground))"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EvolutionChart() {
  const now = new Date();
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  function handleMonthChange(m: number, y: number) {
    setMonth(m);
    setYear(y);
  }

  return (
    <div className="bg-card border border-card-border rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Evolução do Saldo
        </h3>
        <div className="flex rounded-xl overflow-hidden border border-card-border text-xs font-medium">
          <button
            onClick={() => setViewMode("monthly")}
            className={`px-3 py-1.5 transition-colors ${
              viewMode === "monthly"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            Diário
          </button>
          <button
            onClick={() => setViewMode("weekly")}
            className={`px-3 py-1.5 transition-colors ${
              viewMode === "weekly"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            Semanal
          </button>
        </div>
      </div>

      {/* Month picker — shown for both views */}
      <MonthPicker month={month} year={year} onChange={handleMonthChange} />

      {/* Chart */}
      {viewMode === "monthly" ? (
        <DailyChart month={month} year={year} />
      ) : (
        <WeeklyChart month={month} year={year} />
      )}
    </div>
  );
}
