import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Clock,
  History,
  Palette,
  Settings,
  Sun,
  Moon,
  ClipboardEdit,
  BarChart2,
  LogOut,
  X,
  MailWarning,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { supabase, getSiteUrl } from "@/lib/supabaseClient";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Painel de Resumo", shortLabel: "Painel", exact: true },
  { href: "/registrar", icon: ClipboardEdit, label: "Registrar Ponto", shortLabel: "Registrar", exact: false },
  { href: "/historico", icon: History, label: "Histórico", shortLabel: "Histórico", exact: false },
  { href: "/anual", icon: BarChart2, label: "Relatório Anual", shortLabel: "Anual", exact: false },
  { href: "/personalizacao", icon: Palette, label: "Personalização", shortLabel: "Cores", exact: false },
  { href: "/configuracoes", icon: Settings, label: "Configurações", shortLabel: "Config", exact: false },
];

const RESEND_COOLDOWN_SECS = 60;

function EmailConfirmationBanner({ email }: { email: string }) {
  const [dismissed, setDismissed] = useState(false);
  const [resent, setResent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (dismissed) return null;

  async function handleResend() {
    setSending(true);
    setError("");
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          // Always redirect back to the correct production URL after confirmation
          emailRedirectTo: getSiteUrl(),
        },
      });
      if (resendError) throw resendError;
      setResent(true);
      setCooldown(RESEND_COOLDOWN_SECS);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao reenviar. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  const btnDisabled = sending || cooldown > 0;

  return (
    <div className="flex items-start gap-3 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
      <MailWarning size={16} className="flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 text-xs sm:text-sm space-y-0.5">
        <span>
          {resent
            ? "✓ E-mail de confirmação reenviado! Verifique sua caixa de entrada."
            : "Confirme seu e-mail para garantir acesso contínuo à sua conta."}
        </span>
        {error && (
          <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
        )}
      </div>
      {!resent && (
        <button
          onClick={handleResend}
          disabled={btnDisabled}
          className="flex-shrink-0 text-xs font-semibold underline underline-offset-2 hover:opacity-70 disabled:opacity-40 disabled:no-underline transition-opacity whitespace-nowrap mt-0.5"
        >
          {sending
            ? "Enviando…"
            : cooldown > 0
            ? `Reenviar (${cooldown}s)`
            : "Reenviar e-mail"}
        </button>
      )}
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 hover:opacity-70 transition-opacity mt-0.5"
        aria-label="Fechar aviso"
      >
        <X size={15} />
      </button>
    </div>
  );
}

function BottomNav({ onLogout }: { onLogout?: () => void }) {
  const [location] = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex items-stretch h-16">
      {navItems.map(({ href, icon: Icon, shortLabel, exact }) => {
        const active = exact ? location === "/" : location.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 text-[9px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon size={18} strokeWidth={active ? 2.5 : 2} />
            <span className="leading-none">{shortLabel}</span>
          </Link>
        );
      })}

      {onLogout && (
        <button
          onClick={onLogout}
          aria-label="Sair"
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[9px] font-medium text-muted-foreground hover:text-destructive transition-colors"
        >
          <LogOut size={18} strokeWidth={2} />
          <span className="leading-none">Sair</span>
        </button>
      )}
    </nav>
  );
}

export function Layout({
  children,
  onLogout,
}: {
  children: React.ReactNode;
  onLogout?: () => void;
}) {
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  const { user } = useAuth();
  const currentUser = user?.email ?? null;
  const emailUnconfirmed = user && !user.email_confirmed_at;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Fixed left sidebar — desktop only */}
      <aside className="hidden md:flex fixed top-0 left-0 h-full z-40 flex-col bg-card border-r border-border w-56 transition-all">
        {/* Logo */}
        <div className="h-14 flex items-center gap-3 px-4 border-b border-border flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Clock className="text-primary-foreground" size={17} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-sm tracking-tight">Banco de Horas</span>
            {currentUser && (
              <span className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                {currentUser}
              </span>
            )}
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto">
          {navItems.map(({ href, icon: Icon, label, exact }) => {
            const active = exact ? location === "/" : location.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                data-testid={`nav-${label.toLowerCase().replace(/\s/g, "-")}`}
                className={cn(
                  "flex items-center gap-3 px-2 py-2.5 rounded-xl text-sm font-medium transition-colors group",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent",
                )}
              >
                <Icon
                  size={19}
                  strokeWidth={active ? 2.5 : 2}
                  className="flex-shrink-0"
                />
                <span className="leading-none">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Theme toggle + logout at bottom */}
        <div className="px-2 pb-4 flex-shrink-0 border-t border-border pt-3 space-y-1">
          <button
            data-testid="button-toggle-theme"
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Alternar tema"
          >
            {theme === "dark" ? (
              <Sun size={19} strokeWidth={2} className="flex-shrink-0" />
            ) : (
              <Moon size={19} strokeWidth={2} className="flex-shrink-0" />
            )}
            <span>{theme === "dark" ? "Modo Claro" : "Modo Escuro"}</span>
          </button>
          {onLogout && (
            <button
              data-testid="button-logout"
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              aria-label="Sair"
            >
              <LogOut size={19} strokeWidth={2} className="flex-shrink-0" />
              <span>Sair</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main content — full width on mobile, offset on desktop */}
      <main className="flex-1 ml-0 md:ml-56 min-h-screen flex flex-col">
        {emailUnconfirmed && user.email && (
          <EmailConfirmationBanner email={user.email} />
        )}
        <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
          {children}
        </div>
      </main>

      {/* Bottom navigation — mobile only */}
      <BottomNav onLogout={onLogout} />
    </div>
  );
}
