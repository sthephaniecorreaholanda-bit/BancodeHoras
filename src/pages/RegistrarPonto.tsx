import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMissingDays,
  useBulkGenerateMonth,
  getListRecordsQueryKey,
  getGetSummaryQueryKey,
  getGetMonthlyEvolutionQueryKey,
  getGetMissingDaysQueryKey,
} from "@/lib/api-local";
import { RecordForm } from "@/components/RecordForm";
import {
  AlertTriangle,
  X,
  ClipboardEdit,
  CalendarCheck,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function RegistrarPonto() {
  const { data: missingDays } = useGetMissingDays();
  const [dismissedAlert, setDismissedAlert] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  const bulkGenerate = useBulkGenerateMonth();

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: getListRecordsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetSummaryQueryKey() });
    qc.invalidateQueries({ queryKey: getGetMonthlyEvolutionQueryKey() });
    qc.invalidateQueries({ queryKey: getGetMissingDaysQueryKey() });
  }

  function handleBulkGenerate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    bulkGenerate.mutate(
      { data: { year, month } },
      {
        onSuccess: (result) => {
          invalidateAll();
          toast({
            title: "Mês padrão gerado",
            description:
              result.created === 0
                ? "Todos os dias já estavam preenchidos."
                : `${result.created} dia${result.created !== 1 ? "s" : ""} criado${result.created !== 1 ? "s" : ""} com a jornada padrão. ${result.skipped} pulado${result.skipped !== 1 ? "s" : ""} (dom./feriados/existentes).`,
          });
        },
        onError: () => {
          toast({
            title: "Erro ao gerar mês",
            variant: "destructive",
          });
        },
      },
    );
  }

  const hasMissing = !dismissedAlert && missingDays && missingDays.length > 0;
  const now = new Date();
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  const currentMonthName = monthNames[now.getMonth()];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl md:text-lg font-semibold flex items-center gap-2">
        <ClipboardEdit size={20} className="text-primary flex-shrink-0" />
        Registrar Ponto
      </h1>

      {hasMissing && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-sm">
          <AlertTriangle
            size={16}
            className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-amber-800 dark:text-amber-300">
              {missingDays!.length} dia{missingDays!.length > 1 ? "s" : ""} sem registro
            </p>
            <p className="text-amber-700 dark:text-amber-400 text-xs mt-0.5">
              {missingDays!
                .slice(0, 3)
                .map((d) => `${d.dayOfWeek} ${d.date}`)
                .join(", ")}
              {missingDays!.length > 3 ? ` e mais ${missingDays!.length - 3}...` : ""}
            </p>
          </div>
          <button
            data-testid="button-dismiss-alert"
            onClick={() => setDismissedAlert(true)}
            className="text-amber-600 dark:text-amber-400 hover:opacity-70 transition flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Gerar Mês Padrão — stacks vertically on mobile, row on sm+ */}
      <div className="bg-card border border-card-border rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Gerar Mês Padrão</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Preenche todos os dias úteis de{" "}
            <span className="font-medium text-foreground">{currentMonthName}</span> com a jornada padrão
            das Configurações. Pula domingos, feriados e dias já registrados.
          </p>
        </div>
        <button
          data-testid="button-bulk-generate"
          onClick={handleBulkGenerate}
          disabled={bulkGenerate.isPending}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:opacity-80 transition disabled:opacity-60 shadow-sm flex-shrink-0"
        >
          {bulkGenerate.isPending ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <CalendarCheck size={15} />
          )}
          Gerar Mês
        </button>
      </div>

      <div id="record-form">
        <RecordForm />
      </div>
    </div>
  );
}
