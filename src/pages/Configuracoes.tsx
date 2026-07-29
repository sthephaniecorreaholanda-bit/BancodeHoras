import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  useGetSettings,
  useUpdateSettings,
  useDeleteAccount,
  useResetUserData,
  useCreateAdjustment,
  useListAdjustments,
  useDeleteAdjustment,
  getGetSettingsQueryKey,
  getGetSummaryQueryKey,
} from "@/lib/api-local";
import {
  hhmmToMinutes,
  minutesToHHMM,
  formatMinutes,
  formatDate,
} from "@/lib/time";
import {
  Settings2,
  Info,
  Loader2,
  Save,
  Target,
  Trash2,
  AlertTriangle,
  SlidersHorizontal,
  Check,
  RotateCcw,
  CalendarDays,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { todayISO } from "@/lib/time";
import type { AdjustmentType } from "@/lib/types";


// ─── Reset Data Modal ─────────────────────────────────────────────────────

function ModalResetarDados({ onClose }: { onClose: () => void }) {
  const [confirmText, setConfirmText] = useState("");
  const { toast } = useToast();
  const resetUserData = useResetUserData();

  const confirmed = confirmText.trim().toUpperCase() === "RESETAR";

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  async function handleReset() {
    if (!confirmed) return;
    try {
      await resetUserData.mutateAsync();
      toast({ title: "Dados resetados com sucesso", description: "Todos os registros foram apagados." });
      onClose();
    } catch (err: any) {
      toast({
        title: "Erro ao resetar dados",
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
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-destructive" />
          </div>
          <div>
            <h2 className="font-bold text-base text-foreground">Resetar Dados</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Ação permanente e irreversível</p>
          </div>
        </div>

        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 space-y-2 text-sm">
          <p className="font-semibold text-destructive uppercase tracking-wide text-xs">⚠️ ATENÇÃO</p>
          <p className="font-semibold text-foreground">Esta ação é irreversível.</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Todos os registros de banco de horas</li>
            <li>Todos os ajustes manuais</li>
            <li>Todos os períodos de férias</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-1">
            Sua conta e configurações de jornada <strong>serão mantidas</strong>.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Digite <span className="font-mono font-bold text-destructive">RESETAR</span> para confirmar:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="RESETAR"
            autoFocus
            className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-destructive/50 transition font-mono uppercase"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            disabled={resetUserData.isPending}
            className="flex-1 px-4 py-2.5 rounded-xl border border-card-border text-sm font-medium text-muted-foreground hover:bg-accent transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleReset}
            disabled={!confirmed || resetUserData.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {resetUserData.isPending ? (
              <><Loader2 size={14} className="animate-spin" />Resetando...</>
            ) : (
              <><RotateCcw size={14} />Resetar Dados</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

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
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-destructive" />
          </div>
          <div>
            <h2 className="font-bold text-base text-foreground">Excluir Conta</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Ação permanente e irreversível</p>
          </div>
        </div>

        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 space-y-2 text-sm">
          <p className="font-semibold text-destructive uppercase tracking-wide text-xs">⚠️ ATENÇÃO</p>
          <p className="font-semibold text-foreground">Esta ação é irreversível.</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Todos os registros de banco de horas</li>
            <li>Histórico de pontos e relatórios</li>
            <li>Configurações da jornada</li>
            <li>Perfil e dados de autenticação</li>
          </ul>
        </div>

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
              <><Loader2 size={14} className="animate-spin" />Excluindo...</>
            ) : (
              <><Trash2 size={14} />Excluir Conta</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Register Adjustment Card ─────────────────────────────────────────────

function RegisterAdjustmentCard() {
  const [adjType, setAdjType] = useState<AdjustmentType>("CREDIT");
  const [adjHHMM, setAdjHHMM] = useState("00:00");
  const [adjReason, setAdjReason] = useState("");
  const createAdjustment = useCreateAdjustment();
  const { data: adjustments } = useListAdjustments();
  const deleteAdjustment = useDeleteAdjustment();
  const { toast } = useToast();
  const qc = useQueryClient();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const minutes = hhmmToMinutes(adjHHMM);
    if (minutes <= 0) {
      toast({ title: "Informe uma quantidade maior que zero", variant: "destructive" });
      return;
    }
    createAdjustment.mutate(
      { data: { date: todayISO(), type: adjType, minutes, reason: adjReason.trim() || null } },
      {
        onSuccess: () => {
          toast({ title: adjType === "CREDIT" ? "Crédito registrado" : "Débito registrado" });
          setAdjHHMM("00:00");
          setAdjReason("");
          qc.invalidateQueries({ queryKey: getGetSummaryQueryKey() });
        },
        onError: () => toast({ title: "Erro ao registrar ajuste", variant: "destructive" }),
      },
    );
  }

  return (
    <div className="bg-card border border-card-border rounded-2xl p-5 shadow-sm space-y-4">
      <div>
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-primary flex-shrink-0" />
          Registrar Ajuste Manual
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Cada ajuste vira um lançamento rastreável no histórico de movimentações.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {(["CREDIT", "DEBIT"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setAdjType(t)}
              className={cn(
                "px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all text-center",
                adjType === t
                  ? t === "CREDIT"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-destructive bg-destructive/10 text-destructive"
                  : "border-card-border text-muted-foreground hover:border-muted-foreground/40 bg-background",
              )}
            >
              {t === "CREDIT" ? "+ Crédito" : "− Débito"}
            </button>
          ))}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Quantidade (HH:MM)</label>
          <input
            type="time"
            value={adjHHMM}
            onChange={(e) => setAdjHHMM(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition font-mono"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Motivo <span className="opacity-60">(opcional)</span>
          </label>
          <input
            type="text"
            value={adjReason}
            onChange={(e) => setAdjReason(e.target.value)}
            placeholder="Ex: acerto do mês anterior"
            maxLength={200}
            className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
          />
        </div>

        <button
          type="submit"
          disabled={createAdjustment.isPending}
          className={cn(
            "w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition disabled:opacity-60",
            adjType === "CREDIT"
              ? "bg-primary text-primary-foreground hover:opacity-90 active:opacity-80"
              : "bg-destructive text-destructive-foreground hover:opacity-90 active:opacity-80",
          )}
        >
          {createAdjustment.isPending ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Check size={15} />
          )}
          Registrar {adjType === "CREDIT" ? "Crédito" : "Débito"}
        </button>
      </form>

      {adjustments && adjustments.length > 0 && (
        <div className="border-t border-card-border pt-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Ajustes registrados
          </p>
          {[...adjustments].reverse().map((adj) => (
            <div key={adj.id} className="flex items-center gap-2 text-xs py-1">
              <span className="font-medium text-foreground shrink-0">{formatDate(adj.date)}</span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-xs font-medium shrink-0",
                  adj.type === "CREDIT"
                    ? "bg-primary/10 text-primary"
                    : "bg-destructive/10 text-destructive",
                )}
              >
                {adj.type === "CREDIT" ? "Crédito" : "Débito"}
              </span>
              <span
                className={cn(
                  "font-mono font-semibold shrink-0",
                  adj.type === "CREDIT" ? "text-primary" : "text-destructive",
                )}
              >
                {adj.type === "CREDIT" ? "+" : "−"}{minutesToHHMM(adj.minutes)}
              </span>
              {adj.reason && (
                <span className="text-muted-foreground truncate flex-1 italic">{adj.reason}</span>
              )}
              <button
                type="button"
                onClick={() => deleteAdjustment.mutate({ id: adj.id })}
                disabled={deleteAdjustment.isPending}
                className="ml-auto shrink-0 text-muted-foreground hover:text-destructive transition disabled:opacity-40"
                title="Excluir ajuste"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Configuracoes page ───────────────────────────────────────────────────

export default function Configuracoes() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();

  const [goalEnabled, setGoalEnabled] = useState(false);
  const [goalSign, setGoalSign] = useState<"+" | "-">("-");
  const [goalHHMM, setGoalHHMM] = useState("00:00");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  useEffect(() => {
    if (settings) {
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

  function handleSaveGoal(e: React.FormEvent) {
    e.preventDefault();
    let goalMinutes: number | null = null;
    if (goalEnabled) {
      const rawGoal = hhmmToMinutes(goalHHMM);
      goalMinutes = goalSign === "-" ? -rawGoal : rawGoal;
    }

    updateSettings.mutate(
      { data: { goalMinutes } },
      {
        onSuccess: () => {
          toast({ title: "Meta salva" });
          qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetSummaryQueryKey() });
        },
        onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
      },
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
      {showResetModal && (
        <ModalResetarDados onClose={() => setShowResetModal(false)} />
      )}

      <div className="space-y-5 pt-1">
        <h1 className="text-2xl md:text-lg font-semibold flex items-center gap-2">
          <Settings2 size={20} className="text-primary flex-shrink-0" />
          Configurações
        </h1>

        {/* Jornada shortcut */}
        <Link href="/jornada">
          <div className="flex items-center justify-between gap-3 bg-card border border-primary/30 rounded-2xl p-4 shadow-sm hover:bg-primary/5 transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CalendarDays size={18} className="text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">Jornada de Trabalho</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure horários, dias úteis, perfis e histórico de vigências
                </p>
              </div>
            </div>
            <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
          </div>
        </Link>

        {/* Goal */}
        <form onSubmit={handleSaveGoal} className="bg-card border border-card-border rounded-2xl p-5 shadow-sm space-y-3">
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
                goalEnabled ? "bg-primary" : "bg-muted-foreground/30",
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                  goalEnabled ? "translate-x-6" : "translate-x-1",
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

          <button
            type="submit"
            disabled={updateSettings.isPending}
            className="w-full py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 active:opacity-80 transition disabled:opacity-60 shadow-sm"
          >
            {updateSettings.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Salvar Meta
          </button>
        </form>

        {/* Manual Adjustment */}
        <RegisterAdjustmentCard />

        {/* Danger zone */}
        <div className="border border-destructive/30 rounded-2xl overflow-hidden">
          <div className="bg-destructive/5 px-5 py-3 border-b border-destructive/20">
            <h3 className="font-semibold text-sm text-destructive">Zona de Perigo</h3>
          </div>

          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-destructive/10">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Resetar Dados</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Apaga todos os registros, ajustes e férias. Sua conta e configurações de jornada são mantidas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-destructive text-destructive text-sm font-semibold hover:bg-destructive hover:text-destructive-foreground transition"
            >
              <RotateCcw size={15} />
              Resetar Dados
            </button>
          </div>

          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Excluir Conta</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Remove permanentemente sua conta e todos os dados associados.
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
