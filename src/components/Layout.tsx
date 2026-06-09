import { useState } from "react";
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
import { supabase } from "@/lib/supabaseClient";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Painel de Resumo", exact: true },
  { href: "/registrar", icon: ClipboardEdit, label: "Registrar Ponto", exact: false },
  { href: "/historico", icon: History, label: "Histórico", exact: false },
  { href: "/anual", icon: BarChart2, label: "Relatório Anual", exact: false },
  { href: "/personalizacao", icon: Palette, label: "Personalização", exact: false },
  { href: "/configuracoes", icon: Settings, label: "Configurações", exact: false },
];

function EmailConfirmationBanner({ email }: { email: string }) {
  const [dismissed, setDismissed] = useState(false);
  const [resent, setResent] = useState(false);
  const [sending, setSending] = useState(false);

  if (dismissed) return null;

  async function handleResend() {
    setSending(true);
    await supabase.auth.resend({ type: "signup", email });
    setSending(false);
    setResent(true);
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm">
      <MailWarning size={16} className="flex-shrink-0" />
      <span className="flex-1">
        {resent
          ? "E-mail de confirmação reenviado! Verifique sua caixa de entrada."
          : "Confirme seu e-mail para garantir acesso contínuo à sua conta."}
      </span>
      {!resent && (
        <button
          onClick={handleResend}
          disabled={sending}
          className="flex-shrink-0 text-xs font-semibold underline underline-offset-2 hover:opacity-70 disabled:opacity-50 transition-opacity"
        >
          {sending ? "Enviando..." : "Reenviar e-mail"}
        </button>
      )}
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 hover:opacity-70 transition-opacity"
        aria-label="Fechar aviso"
      >
        <X size={15} />
      </button>
    </div>
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
      {/* Fixed left sidebar */}
      <aside className="fixed top-0 left-0 h-full z-40 flex flex-col bg-card border-r border-border w-14 sm:w-56 transition-all">
        {/* Logo */}
        <div className="h-14 flex items-center gap-3 px-3 sm:px-4 border-b border-border flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Clock className="text-primary-foreground" size={17} />
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="font-semibold text-sm tracking-tight">Banco de Horas</span>
            {currentUser && (
              <span className="text-[11px] text-muted-foreground truncate">
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
                <span className="hidden sm:block leading-none">{label}</span>
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
            <span className="hidden sm:block">{theme === "dark" ? "Modo Claro" : "Modo Escuro"}</span>
          </button>
          {onLogout && (
            <button
              data-testid="button-logout"
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              aria-label="Sair"
            >
              <LogOut size={19} strokeWidth={2} className="flex-shrink-0" />
              <span className="hidden sm:block">Sair</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main content — offset for sidebar */}
      <main className="flex-1 ml-14 sm:ml-56 min-h-screen flex flex-col">
        {emailUnconfirmed && user.email && (
          <EmailConfirmationBanner email={user.email} />
        )}
        <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6">{children}</div>
      </main>
    </div>
  );
}
