import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSettings,
  useUpdateSettings,
  useDeleteAccount,
  getGetSettingsQueryKey,
  getGetSummaryQueryKey,
} from "@/lib/api-local";
import { hhmmToMinutes, minutesToHHMM, formatMinutes } from "@/lib/time";
import { Settings2, Info, Loader2, Save, UtensilsCrossed, Target, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─── Delete Account Modal ─────────────────────────────────────────────────

function ModalExcluirConta({ onClose }: { onClose: () => void }) {
  const [confirmText, setConfirmText] = useState("");
  const { toast } = useToast();
  const deleteAccount = useDeleteAccount();

  const confirmed = confirmText.trim().toUpperCase() === "EXCLUIR";

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  async function handleDelete() {
    if (!confirmed) return;
    try {
      await deleteAccount.mutateAsync();
      // useAuth will detect sign-out and redirect to login automatically
    } catch (err: any) {
      toast({
        title: "Erro ao excluir conta",
        description: err?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    }
  }

  return (
    <div
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="bg-card border border-card-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-destructive" />
          </div>
          <div>
            <h2 className="font-bold text-base text-foreground">Excluir Conta</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Ação permanente e irreversível</p>
          </div>
        </div>

        {/* Warning box */}
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 space-y-2 text-sm">
          <p className="font-semibold text-destructive uppercase tracking-wide text-xs">⚠️ ATENÇÃO</p>
          <p className="font-semibold text-foreground">Esta ação é irreversível.</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Todos os lançamentos, históricos, relatórios e dados associados à sua conta serão removidos permanentemente:
          </p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Todos os registros de banco de horas</li>
            <li>Histórico de pontos e relatórios</li>
            <li>Configurações da jornada</li>
            <li>Perfil e dados de autenticação</li>
          </ul>
        </div>

        {/* Confirmation input */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Digite <span className="font-mono font-bold text-destructive">EXCLUIR</span> para confirmar:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="EXCLUIR"
            autoFocus
            className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-destructive/50 transition font-mono uppercase"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            disabled={deleteAccount.isPending}
            className="flex-1 px-4 py-2.5 rounded-xl border border-card-border text-sm font-medium text-muted-foreground hover:bg-accent transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={!confirmed || deleteAccount.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {deleteAccount.isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 size={14} />
                Excluir Conta
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Configuracoes page ───────────────────────────────────────────────────

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
    <>
      {showDeleteModal && (
        <ModalExcluirConta onClose={() => setShowDeleteModal(false)} />
      )}

      <div className="space-y-5 pt-1">
        <h1 className="text-2xl md:text-lg font-semibold flex items-center gap-2">
          <Settings2 size={20} className="text-primary flex-shrink-0" />
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
              <UtensilsCrossed size={15} className="text-primary flex-shrink-0" />
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
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Target size={15} className="text-primary flex-shrink-0" />
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
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0",
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

        {/* Danger zone — Delete Account */}
        <div className="border border-destructive/30 rounded-2xl overflow-hidden">
          <div className="bg-destructive/5 px-5 py-3 border-b border-destructive/20">
            <h3 className="font-semibold text-sm text-destructive">Zona de Perigo</h3>
          </div>
          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Excluir Conta</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Remove permanentemente sua conta e todos os dados associados. Esta ação não pode ser desfeita.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-destructive text-destructive text-sm font-semibold hover:bg-destructive hover:text-destructive-foreground transition"
            >
              <Trash2 size={15} />
              Excluir Conta
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
