import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import { Layout } from "@/components/Layout";
import Painel from "@/pages/Painel";
import RegistrarPonto from "@/pages/RegistrarPonto";
import Historico from "@/pages/Historico";
import Personalizacao from "@/pages/Personalizacao";
import Configuracoes from "@/pages/Configuracoes";
import Anual from "@/pages/Anual";
import NotFound from "@/pages/not-found";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/use-auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 30, retry: 1 },
  },
});

// ─── Password strength ────────────────────────────────────────────────────

type StrengthLevel = 0 | 1 | 2 | 3 | 4;

function getPasswordStrength(pwd: string): StrengthLevel {
  if (pwd.length === 0) return 0;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score as StrengthLevel;
}

const STRENGTH_LABELS: Record<StrengthLevel, string> = {
  0: "",
  1: "Fraca",
  2: "Razoável",
  3: "Boa",
  4: "Forte",
};

const STRENGTH_COLORS: Record<StrengthLevel, string> = {
  0: "#e2e8f0",
  1: "#ef4444",
  2: "#f97316",
  3: "#eab308",
  4: "#22c55e",
};

function PasswordStrengthBar({ password }: { password: string }) {
  const strength = getPasswordStrength(password);
  const color = STRENGTH_COLORS[strength];
  const label = STRENGTH_LABELS[strength];

  return (
    <div style={{ marginTop: "8px" }}>
      <div style={{ display: "flex", gap: "4px", marginBottom: "5px" }}>
        {([1, 2, 3, 4] as StrengthLevel[]).map((level) => (
          <div
            key={level}
            style={{
              flex: 1,
              height: "4px",
              borderRadius: "2px",
              backgroundColor: strength >= level ? color : "#e2e8f0",
              transition: "background-color 0.25s ease",
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: strength > 0 ? color : "#94a3b8" }}>
        {strength > 0 && <span style={{ fontWeight: 600 }}>{label}</span>}
        <span style={{ marginLeft: "auto", color: "#94a3b8" }}>
          {password.length > 0 && strength < 4 && (
            <>
              {password.length < 8 && "mín. 8 caracteres · "}
              {!/[A-Z]/.test(password) && "maiúscula · "}
              {!/[0-9]/.test(password) && "número · "}
              {!/[^A-Za-z0-9]/.test(password) && "símbolo"}
            </>
          )}
        </span>
      </div>
    </div>
  );
}

// ─── Tela de Auth ─────────────────────────────────────────────────────────

type AuthView = "login" | "register" | "forgot";

function TelaAuth() {
  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState({ text: "", isError: false });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage({ text: "", isError: false });
    setSubmitting(true);

    try {
      if (view === "register") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({
          text: "Conta criada! Verifique seu e-mail para confirmar o cadastro.",
          isError: false,
        });
        setView("login");
        setPassword("");
      } else if (view === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (view === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMessage({
          text: "E-mail de recuperação enviado! Verifique sua caixa de entrada.",
          isError: false,
        });
      }
    } catch (err: any) {
      const msg = err?.message ?? "Erro inesperado.";
      setMessage({ text: msg, isError: true });
    } finally {
      setSubmitting(false);
    }
  }

  const titles: Record<AuthView, string> = {
    login: "Acessar Sistema",
    register: "Criar Conta",
    forgot: "Recuperar Senha",
  };

  const buttonLabels: Record<AuthView, string> = {
    login: "Entrar",
    register: "Cadastrar",
    forgot: "Enviar e-mail",
  };

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh", backgroundColor: "#0f172a", fontFamily: "sans-serif",
    }}>
      <div style={{
        background: "#ffffff", padding: "40px", borderRadius: "12px",
        width: "100%", maxWidth: "400px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
        textAlign: "center",
      }}>
        <div style={{ fontSize: "40px", marginBottom: "10px" }}>⏰</div>
        <h2 style={{ margin: "0 0 5px 0", color: "#1e293b", fontSize: "24px", fontWeight: "bold" }}>
          BANCO DE HORAS PRO
        </h2>
        <p style={{ margin: "0 0 25px 0", color: "#64748b", fontSize: "14px" }}>
          {titles[view]}
        </p>

        <form onSubmit={handleSubmit} style={{ textAlign: "left" }}>
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#475569", fontSize: "14px", fontWeight: 600 }}>
              E-mail:
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
            />
          </div>

          {view !== "forgot" && (
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "5px", color: "#475569", fontSize: "14px", fontWeight: 600 }}>
                Senha:
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
              />
              {view === "register" && <PasswordStrengthBar password={password} />}
            </div>
          )}

          {message.text && (
            <p style={{ margin: "0 0 15px 0", fontSize: "13px", color: message.isError ? "#ef4444" : "#10b981", fontWeight: 600, textAlign: "center" }}>
              {message.text}
            </p>
          )}

          {(() => {
            const tooWeak = view === "register" && getPasswordStrength(password) < 3;
            const isDisabled = submitting || tooWeak;
            return (
              <div style={{ position: "relative" }}>
                <button
                  type="submit"
                  disabled={isDisabled}
                  title={tooWeak ? "Crie uma senha mais forte antes de continuar" : undefined}
                  style={{
                    width: "100%", padding: "12px", borderRadius: "6px", border: "none",
                    backgroundColor: tooWeak ? "#94a3b8" : "#1e3a8a",
                    color: "#ffffff", fontSize: "16px", fontWeight: 600,
                    cursor: submitting ? "wait" : tooWeak ? "not-allowed" : "pointer",
                    opacity: submitting ? 0.7 : 1,
                    transition: "background-color 0.2s ease",
                  }}
                >
                  {submitting ? "..." : buttonLabels[view]}
                </button>
                {tooWeak && password.length > 0 && (
                  <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: "#94a3b8", textAlign: "center" }}>
                    Senha precisa ser pelo menos <strong>Boa</strong> para continuar
                  </p>
                )}
              </div>
            );
          })()}
        </form>

        <div style={{ marginTop: "20px", fontSize: "13px", color: "#64748b", display: "flex", flexDirection: "column", gap: "8px" }}>
          {view === "login" && (
            <>
              <span>
                Não tem conta?{" "}
                <span onClick={() => { setView("register"); setMessage({ text: "", isError: false }); }} style={{ color: "#2563eb", cursor: "pointer", fontWeight: 600 }}>
                  Cadastre-se.
                </span>
              </span>
              <span>
                Esqueceu a senha?{" "}
                <span onClick={() => { setView("forgot"); setMessage({ text: "", isError: false }); }} style={{ color: "#2563eb", cursor: "pointer", fontWeight: 600 }}>
                  Recuperar acesso.
                </span>
              </span>
            </>
          )}
          {view !== "login" && (
            <span>
              Já tem conta?{" "}
              <span onClick={() => { setView("login"); setMessage({ text: "", isError: false }); }} style={{ color: "#2563eb", cursor: "pointer", fontWeight: 600 }}>
                Faça login.
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────

function Router({ onLogout }: { onLogout: () => void }) {
  return (
    <Layout onLogout={onLogout}>
      <Switch>
        <Route path="/" component={Painel} />
        <Route path="/registrar" component={RegistrarPonto} />
        <Route path="/historico" component={Historico} />
        <Route path="/anual" component={Anual} />
        <Route path="/personalizacao" component={Personalizacao} />
        <Route path="/configuracoes" component={Configuracoes} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────

function App() {
  const { user, loading } = useAuth();

  async function handleLogout() {
    await supabase.auth.signOut();
    queryClient.clear();
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "#0f172a" }}>
        <p style={{ color: "#94a3b8", fontFamily: "sans-serif" }}>Carregando...</p>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {user ? (
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router onLogout={handleLogout} />
            </WouterRouter>
          ) : (
            <TelaAuth />
          )}
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
