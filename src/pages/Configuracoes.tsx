import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSettings,
  useUpdateSettings,
  getGetSettingsQueryKey,
  getGetSummaryQueryKey,
} from "@/lib/api-local";
import { hhmmToMinutes, minutesToHHMM, formatMinutes } from "@/lib/time";
import { Settings2, Info, Loader2, Save, UtensilsCrossed, Target, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Configuracoes() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();

  const [entryHHMM, setEntryHHMM] = useState("08:00");
  const [exitHHMM, setExitHHMM] = useState("17:00");
  const [adjustMinutes, setAdjustMinutes] = useState("0");
  const [adjustSign, setAdjustSign] = useState<"+" | "-">("+");
  const [lunchHHMM, setLunchHHMM] = useState("01:00");
  const [goalEnabled, setGoalEnabled] = useState(false);
  const [goalSign, setGoalSign] = useState<"+" | "-">("-");
  const [goalHHMM, setGoalHHMM] = useState("00:00");

  useEffect(() => {
    if (settings) {
      setEntryHHMM(settings.defaultEntryTime);
      setExitHHMM(settings.defaultExitTime);
      const adj = settings.manualAdjustmentMinutes;
      setAdjustSign(adj < 0 ? "-" : "+");
      setAdjustMinutes(minutesToHHMM(Math.abs(adj)));
      setLunchHHMM(minutesToHHMM(settings.lunchBreakMinutes));
      if (settings.goalMinutes !== null && settings.goalMinutes !== undefined) {
        setGoalEnabled(true);
        setGoalSign(settings.goalMinutes < 0 ? "-" : "+");
        setGoalHHMM(minutesToHHMM(Math.abs(settings.goalMinutes)));
      } else {
        setGoalEnabled(false);
        setGoalSign("-");
        setGoalHHMM("00:00");
      }
    }
  }, [settings]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const rawAdjust = hhmmToMinutes(adjustMinutes);
    const manualAdjustmentMinutes = adjustSign === "-" ? -rawAdjust : rawAdjust;
    const lunchBreakMinutes = hhmmToMinutes(lunchHHMM);

    let goalMinutes: number | null = null;
    if (goalEnabled) {
      const rawGoal = hhmmToMinutes(goalHHMM);
      goalMinutes = goalSign === "-" ? -rawGoal : rawGoal;
    }

    updateSettings.mutate(
      {
        data: {
          defaultEntryTime: entryHHMM,
          defaultExitTime: exitHHMM,
          manualAdjustmentMinutes,
          lunchBreakMinutes,
          goalMinutes,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Configurações salvas" });
          qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetSummaryQueryKey() });
        },
        onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
      }
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pt-1">
      <h1 className="font-semibold text-lg flex items-center gap-2">
        <Settings2 size={20} className="text-primary" />
        Configurações da Jornada
      </h1>

      <form onSubmit={handleSave} className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4">
        {/* Jornada padrão */}
        <div className="bg-card border border-card-border rounded-2xl p-5 shadow-sm space-y-3">
          <div>
            <h2 className="font-semibold text-sm">Jornada Padrão</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Horários usados como base quando você não informar Entrada/Saída no dia.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Hora de Entrada</label>
              <input
                data-testid="input-default-entry"
                type="time"
                value={entryHHMM}
                onChange={(e) => setEntryHHMM(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Hora de Saída</label>
              <input
                data-testid="input-default-exit"
                type="time"
                value={exitHHMM}
                onChange={(e) => setExitHHMM(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition font-mono"
              />
            </div>
          </div>
        </div>

        {/* Lunch break */}
        <div className="bg-card border border-card-border rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <UtensilsCrossed size={15} className="text-primary" />
            <div>
              <h2 className="font-semibold text-sm">Tempo de Almoço</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Deduzido automaticamente do tempo total. Padrão: 01:00.
              </p>
            </div>
          </div>
          <input
            data-testid="input-lunch-break"
            type="time"
            value={lunchHHMM}
            onChange={(e) => setLunchHHMM(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition font-mono"
          />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted rounded-xl px-3 py-2">
            <Info size={13} className="flex-shrink-0" />
            <span>
              Exemplo: {entryHHMM} → {exitHHMM} ={" "}
              {minutesToHHMM(Math.max(0, hhmmToMinutes(exitHHMM) - hhmmToMinutes(entryHHMM)))} −{" "}
              {minutesToHHMM(hhmmToMinutes(lunchHHMM))} almoço ={" "}
              <span className="font-mono font-medium text-foreground">
                {minutesToHHMM(
                  Math.max(
                    0,
                    hhmmToMinutes(exitHHMM) - hhmmToMinutes(entryHHMM) - hhmmToMinutes(lunchHHMM),
                  ),
                )}{" "}
                trabalhados
              </span>
            </span>
          </div>
        </div>

        {/* Manual adjustment */}
        <div className="bg-card border border-card-border rounded-2xl p-5 shadow-sm space-y-3">
          <div>
            <h2 className="font-semibold text-sm">Ajuste Manual de Saldo</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Use para importar saldo de meses anteriores ou zerar o banco.
            </p>
          </div>
          <div className="flex gap-2">
            <select
              data-testid="select-adjust-sign"
              value={adjustSign}
              onChange={(e) => setAdjustSign(e.target.value as "+" | "-")}
              className="px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition font-mono w-16"
            >
              <option value="+">+</option>
              <option value="-">−</option>
            </select>
            <input
              data-testid="input-adjust-minutes"
              type="time"
              value={adjustMinutes}
              onChange={(e) => setAdjustMinutes(e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition font-mono"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted rounded-xl px-3 py-2">
            <Info size={13} className="flex-shrink-0" />
            <span>
              Valor atual:{" "}
              <span className="font-mono font-medium text-foreground">
                {formatMinutes(settings?.manualAdjustmentMinutes ?? 0)}
              </span>
            </span>
          </div>
        </div>

        {/* Goal */}
        <div className="bg-card border border-card-border rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target size={15} className="text-primary" />
              <div>
                <h2 className="font-semibold text-sm">Meta de Saldo</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Defina um saldo-alvo para acompanhar seu progresso no Painel.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setGoalEnabled((v) => !v)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                goalEnabled ? "bg-primary" : "bg-muted-foreground/30"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                  goalEnabled ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>

          {goalEnabled && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <select
                  value={goalSign}
                  onChange={(e) => setGoalSign(e.target.value as "+" | "-")}
                  className="px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition font-mono w-16"
                >
                  <option value="+">+</option>
                  <option value="-">−</option>
                </select>
                <input
                  data-testid="input-goal-minutes"
                  type="time"
                  value={goalHHMM}
                  onChange={(e) => setGoalHHMM(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition font-mono"
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted rounded-xl px-3 py-2">
                <Info size={13} className="flex-shrink-0" />
                <span>
                  Meta: saldo acumulado de{" "}
                  <span className="font-mono font-medium text-foreground">
                    {goalSign}{minutesToHHMM(hhmmToMinutes(goalHHMM))}
                  </span>
                  {" "}— use <strong>−00:00</strong> para zerar o banco.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="lg:col-span-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 text-xs text-blue-700 dark:text-blue-300 space-y-1.5">
          <p className="font-semibold">Regras do sistema</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Jornada padrão é usada quando o dia não tiver horários informados</li>
            <li>Almoço é descontado automaticamente do total (Saída − Entrada − Almoço)</li>
            <li>Dia Comum: saldo = tempo trabalhado − jornada padrão líquida</li>
            <li>Folga compensada debita a jornada líquida do dia informado</li>
            <li>Feriados nacionais e domingos são neutros automaticamente</li>
          </ul>
        </div>

        <button
          data-testid="button-save-settings"
          type="submit"
          disabled={updateSettings.isPending}
          className="lg:col-span-2 w-full py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 active:opacity-80 transition disabled:opacity-60 shadow-sm"
        >
          {updateSettings.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Salvar Configurações
        </button>
      </form>
    </div>
  );
}
