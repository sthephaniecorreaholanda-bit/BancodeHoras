import { useState, useMemo } from "react";
import { useListAllRecords, useListAdjustments } from "@/lib/api-local";
import { computeReport } from "@/lib/calculations";
import { formatMinutes, minutesToHHMM, getBalanceColor } from "@/lib/time";
import type { ReportData, ReportRow } from "@/lib/types";
import {
  FileText,
  Printer,
  Download,
  BarChart3,
  Calendar,
  Loader2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  WORK_DAY: "Dia Comum",
  COMPENSATED_LEAVE: "Folga Compensada",
  HOLIDAY: "Feriado / Folga",
  ADJUSTMENT: "Ajuste Manual",
};

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  return `${d}/${m}/${y} ${WEEK_DAYS[dt.getDay()]}`;
}

function formatDateShort(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// ─── Stat row ─────────────────────────────────────────────────────────────

function StatRow({
  label,
  value,
  valueClass,
  bold,
  separator,
}: {
  label: string;
  value: string;
  valueClass?: string;
  bold?: boolean;
  separator?: boolean;
}) {
  return (
    <>
      {separator && <div className="border-t border-card-border my-1" />}
      <div className={cn("flex items-baseline justify-between gap-2 py-1", bold && "font-semibold")}>
        <span className="text-sm text-muted-foreground leading-none">{label}</span>
        <span
          className={cn(
            "font-mono text-sm tabular-nums shrink-0",
            bold ? "text-foreground" : "text-foreground/90",
            valueClass,
          )}
        >
          {value}
        </span>
      </div>
    </>
  );
}

// ─── Summary panel ────────────────────────────────────────────────────────

function ReportSummary({ report }: { report: ReportData }) {
  const { finalBalance, previousBalance, creditMinutes, debitMinutes,
          workedMinutes, sundaysWorked, sundayMinutes, holidaysWorked,
          holidayMinutes, nightAddMinutes, absenceMinutes, daysWorked,
          daysAbsent, daysOff, recordCount, adjustmentTotal } = report;

  const signedAdj = adjustmentTotal;

  return (
    <div className="bg-card border border-card-border rounded-2xl p-5 shadow-sm space-y-0.5">
      <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <BarChart3 size={14} className="text-primary" />
        Resumo do Período
      </h2>

      <StatRow
        label="Saldo Anterior"
        value={formatMinutes(previousBalance)}
        valueClass={getBalanceColor(previousBalance)}
      />
      <StatRow
        label="Horas Trabalhadas"
        value={minutesToHHMM(workedMinutes)}
      />
      <StatRow
        label="Crédito no Período"
        value={creditMinutes > 0 ? `+${minutesToHHMM(creditMinutes)}` : minutesToHHMM(0)}
        valueClass={creditMinutes > 0 ? "text-primary" : "text-muted-foreground"}
      />
      <StatRow
        label="Débito no Período"
        value={debitMinutes > 0 ? `-${minutesToHHMM(debitMinutes)}` : minutesToHHMM(0)}
        valueClass={debitMinutes > 0 ? "text-destructive" : "text-muted-foreground"}
      />
      <StatRow
        separator
        bold
        label="Saldo Final"
        value={formatMinutes(finalBalance)}
        valueClass={getBalanceColor(finalBalance)}
      />
      <StatRow separator label="Domingos Trabalhados" value={String(sundaysWorked)} />
      <StatRow label="Horas em Domingos" value={minutesToHHMM(sundayMinutes)} />
      <StatRow label="Feriados Trabalhados" value={String(holidaysWorked)} />
      <StatRow label="Horas em Feriados" value={minutesToHHMM(holidayMinutes)} />
      <StatRow label="Adicional Noturno" value={minutesToHHMM(nightAddMinutes)} />
      <StatRow label="Faltas (min.)" value={minutesToHHMM(absenceMinutes)} />
      <StatRow separator label="Dias Trabalhados" value={String(daysWorked)} />
      <StatRow label="Dias com Falta" value={String(daysAbsent)} />
      <StatRow label="Dias de Folga" value={String(daysOff)} />
      <StatRow label="Quantidade de Registros" value={String(recordCount)} />
      <StatRow
        separator
        label="Ajustes Manuais"
        value={signedAdj === 0 ? minutesToHHMM(0) : formatMinutes(signedAdj)}
        valueClass={signedAdj !== 0 ? getBalanceColor(signedAdj) : undefined}
      />
    </div>
  );
}

// ─── Detail table ─────────────────────────────────────────────────────────

function ReportTable({ rows }: { rows: ReportRow[] }) {
  if (!rows.length) {
    return (
      <div className="bg-card border border-card-border rounded-2xl p-8 text-center text-sm text-muted-foreground">
        Nenhum lançamento no período
      </div>
    );
  }

  return (
    <div className="bg-card border border-card-border rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-card-border bg-muted/40">
              <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">Data</th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">Tipo</th>
              <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap">Entrada</th>
              <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap">Saída</th>
              <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground whitespace-nowrap">H. Trab.</th>
              <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground whitespace-nowrap text-primary">Crédito</th>
              <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground whitespace-nowrap text-destructive">Débito</th>
              <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground whitespace-nowrap">Ajuste</th>
              <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground whitespace-nowrap">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={`${row.date}-${i}`}
                className={cn(
                  "border-b border-card-border/60 transition-colors hover:bg-muted/20",
                  row.type === "ADJUSTMENT" && "bg-primary/5",
                )}
              >
                <td className="px-3 py-2 font-medium whitespace-nowrap">{formatDateBR(row.date)}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                      row.type === "WORK_DAY"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                        : row.type === "COMPENSATED_LEAVE"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                        : row.type === "ADJUSTMENT"
                        ? row.adjustmentMinutes >= 0
                          ? "bg-primary/10 text-primary"
                          : "bg-destructive/10 text-destructive"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                    )}
                  >
                    {TYPE_LABELS[row.type] ?? row.type}
                  </span>
                </td>
                <td className="px-3 py-2 text-center font-mono text-muted-foreground">
                  {row.entryTime ?? "—"}
                </td>
                <td className="px-3 py-2 text-center font-mono text-muted-foreground">
                  {row.exitTime ?? "—"}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {row.workedMinutes > 0 ? minutesToHHMM(row.workedMinutes) : "—"}
                </td>
                <td className="px-3 py-2 text-right font-mono font-medium text-primary">
                  {row.creditMinutes > 0 ? `+${minutesToHHMM(row.creditMinutes)}` : "—"}
                </td>
                <td className="px-3 py-2 text-right font-mono font-medium text-destructive">
                  {row.debitMinutes > 0 ? `-${minutesToHHMM(row.debitMinutes)}` : "—"}
                </td>
                <td className={cn("px-3 py-2 text-right font-mono font-medium",
                  row.adjustmentMinutes > 0 ? "text-primary"
                  : row.adjustmentMinutes < 0 ? "text-destructive"
                  : "text-muted-foreground")}>
                  {row.adjustmentMinutes !== 0
                    ? (row.adjustmentMinutes > 0 ? "+" : "") + minutesToHHMM(Math.abs(row.adjustmentMinutes))
                    : "—"}
                </td>
                <td className={cn("px-3 py-2 text-right font-mono font-bold", getBalanceColor(row.runningBalance))}>
                  {formatMinutes(row.runningBalance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Export helpers ───────────────────────────────────────────────────────

function exportCSV(report: ReportData) {
  const header = [
    "Data",
    "Tipo",
    "Entrada",
    "Saída",
    "H. Trabalhadas",
    "Crédito (min)",
    "Débito (min)",
    "Ajuste (min)",
    "Saldo Após (min)",
  ].join(";");

  const lines = report.rows.map((r) =>
    [
      r.date,
      TYPE_LABELS[r.type] ?? r.type,
      r.entryTime ?? "",
      r.exitTime ?? "",
      r.workedMinutes,
      r.creditMinutes,
      r.debitMinutes,
      r.adjustmentMinutes,
      r.runningBalance,
    ].join(";"),
  );

  const summaryLines = [
    "",
    ";;Resumo do Período",
    `;;Período;${formatDateShort(report.startDate)} a ${formatDateShort(report.endDate)}`,
    `;;Saldo Anterior;${report.previousBalance}`,
    `;;Horas Trabalhadas;${report.workedMinutes}`,
    `;;Crédito no Período;${report.creditMinutes}`,
    `;;Débito no Período;${report.debitMinutes}`,
    `;;Saldo Final;${report.finalBalance}`,
    `;;Ajustes Manuais;${report.adjustmentTotal}`,
  ];

  const csv = [header, ...lines, ...summaryLines].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `relatorio-banco-horas-${report.startDate}-a-${report.endDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main page ────────────────────────────────────────────────────────────

export default function Relatorios() {
  const now = new Date();
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const today = now.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today);
  const [generatedStart, setGeneratedStart] = useState<string | null>(null);
  const [generatedEnd, setGeneratedEnd] = useState<string | null>(null);

  const { data: allRecords, isLoading: loadingRecords } = useListAllRecords();
  const { data: allAdjustments, isLoading: loadingAdjs } = useListAdjustments();

  const isLoading = loadingRecords || loadingAdjs;

  const report = useMemo<ReportData | null>(() => {
    if (!generatedStart || !generatedEnd) return null;
    if (!allRecords || !allAdjustments) return null;
    return computeReport(allRecords, allAdjustments, generatedStart, generatedEnd);
  }, [allRecords, allAdjustments, generatedStart, generatedEnd]);

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate || startDate > endDate) return;
    setGeneratedStart(startDate);
    setGeneratedEnd(endDate);
  }

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #print-report { display: block !important; }
          #print-report { position: fixed; top: 0; left: 0; width: 100%; }
        }
        #print-report { display: none; }
      `}</style>

      {/* Print-only area (hidden on screen, shown when printing) */}
      {report && (
        <div id="print-report" style={{ fontFamily: "monospace", fontSize: "11px", padding: "16px" }}>
          <h1 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "4px" }}>
            Banco de Horas — Relatório
          </h1>
          <p style={{ marginBottom: "12px", color: "#555" }}>
            Período: {formatDateShort(report.startDate)} a {formatDateShort(report.endDate)}
          </p>

          {/* Summary */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
            <tbody>
              {[
                ["Saldo Anterior", formatMinutes(report.previousBalance)],
                ["Horas Trabalhadas", minutesToHHMM(report.workedMinutes)],
                ["Crédito no Período", `+${minutesToHHMM(report.creditMinutes)}`],
                ["Débito no Período", `-${minutesToHHMM(report.debitMinutes)}`],
                ["Saldo Final", formatMinutes(report.finalBalance)],
                ["Domingos Trabalhados", String(report.sundaysWorked)],
                ["Horas em Domingos", minutesToHHMM(report.sundayMinutes)],
                ["Feriados Trabalhados", String(report.holidaysWorked)],
                ["Horas em Feriados", minutesToHHMM(report.holidayMinutes)],
                ["Adicional Noturno", minutesToHHMM(report.nightAddMinutes)],
                ["Faltas (minutos)", minutesToHHMM(report.absenceMinutes)],
                ["Dias Trabalhados", String(report.daysWorked)],
                ["Dias com Falta", String(report.daysAbsent)],
                ["Dias de Folga", String(report.daysOff)],
                ["Qtd. Registros", String(report.recordCount)],
                ["Ajustes Manuais", formatMinutes(report.adjustmentTotal)],
              ].map(([lbl, val]) => (
                <tr key={lbl} style={{ borderBottom: "1px dotted #ccc" }}>
                  <td style={{ padding: "2px 4px" }}>{lbl}</td>
                  <td style={{ padding: "2px 4px", textAlign: "right", fontWeight: "bold" }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Detail */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
            <thead>
              <tr style={{ background: "#f0f0f0" }}>
                {["Data", "Tipo", "Entrada", "Saída", "H. Trab.", "Crédito", "Débito", "Ajuste", "Saldo"].map(h => (
                  <th key={h} style={{ padding: "3px 4px", textAlign: "left", borderBottom: "1px solid #aaa" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.rows.map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px dotted #ddd" }}>
                  <td style={{ padding: "2px 4px", whiteSpace: "nowrap" }}>{formatDateShort(r.date)}</td>
                  <td style={{ padding: "2px 4px" }}>{TYPE_LABELS[r.type] ?? r.type}</td>
                  <td style={{ padding: "2px 4px" }}>{r.entryTime ?? "—"}</td>
                  <td style={{ padding: "2px 4px" }}>{r.exitTime ?? "—"}</td>
                  <td style={{ padding: "2px 4px", textAlign: "right" }}>{r.workedMinutes > 0 ? minutesToHHMM(r.workedMinutes) : "—"}</td>
                  <td style={{ padding: "2px 4px", textAlign: "right" }}>{r.creditMinutes > 0 ? `+${minutesToHHMM(r.creditMinutes)}` : "—"}</td>
                  <td style={{ padding: "2px 4px", textAlign: "right" }}>{r.debitMinutes > 0 ? `-${minutesToHHMM(r.debitMinutes)}` : "—"}</td>
                  <td style={{ padding: "2px 4px", textAlign: "right" }}>{r.adjustmentMinutes !== 0 ? formatMinutes(r.adjustmentMinutes) : "—"}</td>
                  <td style={{ padding: "2px 4px", textAlign: "right", fontWeight: "bold" }}>{formatMinutes(r.runningBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Screen content */}
      <div className="space-y-5 pt-1">
        <h1 className="text-2xl md:text-lg font-semibold flex items-center gap-2">
          <FileText size={20} className="text-primary flex-shrink-0" />
          Relatórios
        </h1>

        {/* Filter card */}
        <form
          onSubmit={handleGenerate}
          className="bg-card border border-card-border rounded-2xl p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-primary" />
            <h2 className="font-semibold text-sm">Filtro de Período</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Data inicial</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                max={endDate}
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Data final</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                min={startDate}
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !startDate || !endDate || startDate > endDate}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:opacity-80 transition disabled:opacity-50 shadow-sm"
          >
            {isLoading ? (
              <><Loader2 size={15} className="animate-spin" />Carregando...</>
            ) : (
              <><BarChart3 size={15} />Gerar Relatório</>
            )}
          </button>
        </form>

        {/* Report content */}
        {report && (
          <>
            {/* Period header + export buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-sm">
                  {formatDateShort(report.startDate)} a {formatDateShort(report.endDate)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {report.rows.length} lançamentos encontrados
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => exportCSV(report)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-card-border bg-card text-sm font-medium hover:bg-accent transition shadow-sm text-foreground"
                >
                  <Download size={14} />
                  Exportar Excel
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-card-border bg-card text-sm font-medium hover:bg-accent transition shadow-sm text-foreground"
                >
                  <Printer size={14} />
                  Imprimir / PDF
                </button>
              </div>
            </div>

            {/* Balance highlight */}
            <div className={cn(
              "rounded-2xl border p-4 flex items-center gap-4 shadow-sm",
              report.finalBalance >= 0
                ? "bg-primary/5 border-primary/20"
                : "bg-destructive/5 border-destructive/20",
            )}>
              {report.finalBalance >= 0 ? (
                <TrendingUp size={28} className="text-primary flex-shrink-0" />
              ) : (
                <TrendingDown size={28} className="text-destructive flex-shrink-0" />
              )}
              <div>
                <p className="text-xs text-muted-foreground">Saldo Final do Período</p>
                <p className={cn("text-3xl font-bold font-mono tracking-tight", getBalanceColor(report.finalBalance))}>
                  {formatMinutes(report.finalBalance)}
                </p>
              </div>
            </div>

            {/* Summary + table */}
            <div className="space-y-4">
              <ReportSummary report={report} />
              <div>
                <h2 className="font-semibold text-sm mb-3">Detalhamento de Lançamentos</h2>
                <ReportTable rows={report.rows} />
              </div>
            </div>
          </>
        )}

        {/* Empty state before generating */}
        {!report && !isLoading && (
          <div className="bg-card border border-card-border rounded-2xl p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <FileText size={40} className="opacity-25" />
            <p className="text-sm">Selecione um período e clique em Gerar Relatório</p>
          </div>
        )}
      </div>
    </>
  );
}
