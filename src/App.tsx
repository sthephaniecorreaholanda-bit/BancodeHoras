import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
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
import { supabase, isSupabaseConfigured, getSiteUrl } from "@/lib/supabaseClient";
import { useAuth, NO_REMEMBER_KEY, SESSION_ACTIVE_KEY } from "@/hooks/use-auth";

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
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [message, setMessage] = useState({ text: "", isError: false });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage({ text: "", isError: false });
    setSubmitting(true);

    try {
      const siteUrl = getSiteUrl();

      if (view === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // Override the Supabase dashboard "Site URL" so the confirmation
            // email always points to the correct production URL.
            emailRedirectTo: siteUrl,
          },
        });
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
        if (rememberMe) {
          localStorage.removeItem(NO_REMEMBER_KEY);
        } else {
          localStorage.setItem(NO_REMEMBER_KEY, "1");
        }
        sessionStorage.setItem(SESSION_ACTIVE_KEY, "1");
      } else if (view === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          // After clicking the reset link, Supabase will redirect to this URL
          // with #type=recovery&access_token=... — the app handles it via
          // the PASSWORD_RECOVERY event in useAuth.
          redirectTo: siteUrl,
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
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{ width: "100%", padding: "10px", paddingRight: "40px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  style={{
                    position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", padding: "2px",
                    color: "#94a3b8", display: "flex", alignItems: "center",
                  }}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {view === "register" && <PasswordStrengthBar password={password} />}
            </div>
          )}

          {view === "login" && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ width: "15px", height: "15px", accentColor: "#1e3a8a", cursor: "pointer", flexShrink: 0 }}
              />
              <label htmlFor="remember-me" style={{ fontSize: "13px", color: "#475569", cursor: "pointer", userSelect: "none" }}>
                Lembrar-me neste dispositivo
              </label>
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

// ─── Tela de Redefinição de Senha ─────────────────────────────────────────
// Shown after user clicks the password-reset link in their email.
// Supabase fires PASSWORD_RECOVERY which sets isPasswordRecovery = true in useAuth.

function TelaRedefinirSenha() {
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState({ text: "", isError: false });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (getPasswordStrength(newPassword) < 3) {
      setMessage({ text: "Escolha uma senha mais forte (pelo menos 'Boa').", isError: true });
      return;
    }
    setSubmitting(true);
    setMessage({ text: "", isError: false });

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setDone(true);
      setMessage({ text: "Senha atualizada com sucesso! Fazendo login...", isError: false });
      // Sign out so the user logs in freshly with the new password
      setTimeout(async () => {
        await supabase.auth.signOut();
      }, 2000);
    } catch (err: any) {
      setMessage({ text: err?.message ?? "Erro ao redefinir senha.", isError: true });
    } finally {
      setSubmitting(false);
    }
  }

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
        <div style={{ fontSize: "40px", marginBottom: "10px" }}>🔐</div>
        <h2 style={{ margin: "0 0 5px 0", color: "#1e293b", fontSize: "22px", fontWeight: "bold" }}>
          Nova Senha
        </h2>
        <p style={{ margin: "0 0 25px 0", color: "#64748b", fontSize: "14px" }}>
          Escolha uma senha segura para sua conta.
        </p>

        {!done ? (
          <form onSubmit={handleSubmit} style={{ textAlign: "left" }}>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "5px", color: "#475569", fontSize: "14px", fontWeight: 600 }}>
                Nova Senha:
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{ width: "100%", padding: "10px", paddingRight: "40px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", padding: "2px",
                    color: "#94a3b8", display: "flex", alignItems: "center",
                  }}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <PasswordStrengthBar password={newPassword} />
            </div>

            {message.text && (
              <p style={{ margin: "0 0 15px 0", fontSize: "13px", color: message.isError ? "#ef4444" : "#10b981", fontWeight: 600, textAlign: "center" }}>
                {message.text}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: "100%", padding: "12px", borderRadius: "6px", border: "none",
                backgroundColor: "#1e3a8a", color: "#ffffff", fontSize: "16px", fontWeight: 600,
                cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Salvando..." : "Salvar Nova Senha"}
            </button>
          </form>
        ) : (
          <p style={{ color: "#10b981", fontWeight: 600, fontSize: "15px" }}>
            {message.text}
          </p>
        )}
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

// ─── Setup screen ─────────────────────────────────────────────────────────

function TelaConfiguracao() {
  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh", backgroundColor: "#0f172a", fontFamily: "sans-serif", padding: "20px", boxSizing: "border-box",
    }}>
      <div style={{
        background: "#ffffff", padding: "40px", borderRadius: "12px",
        width: "100%", maxWidth: "480px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
      }}>
        <div style={{ fontSize: "36px", textAlign: "center", marginBottom: "12px" }}>⚙️</div>
        <h2 style={{ margin: "0 0 8px 0", color: "#1e293b", fontSize: "20px", fontWeight: "bold", textAlign: "center" }}>
          Configuração necessária
        </h2>
        <p style={{ margin: "0 0 24px 0", color: "#64748b", fontSize: "14px", textAlign: "center" }}>
          As variáveis de ambiente do Supabase não estão configuradas.
        </p>

        <ol style={{ margin: "0 0 24px 0", padding: "0 0 0 20px", color: "#475569", fontSize: "14px", lineHeight: "2" }}>
          <li>No painel do Replit, abra <strong>Secrets</strong></li>
          <li>Adicione <code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: "4px" }}>VITE_SUPABASE_URL</code></li>
          <li>Adicione <code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: "4px" }}>VITE_SUPABASE_ANON_KEY</code></li>
          <li>Reinicie o servidor de desenvolvimento</li>
        </ol>

        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", fontSize: "12px", color: "#64748b" }}>
          Encontre ambos os valores em:<br />
          <strong>Supabase → Project Settings → API</strong>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────

function App() {
  const { user, loading, isPasswordRecovery } = useAuth();

  if (!isSupabaseConfigured) {
    return <TelaConfiguracao />;
  }

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

  // Password recovery takes precedence — show reset form regardless of user state
  if (isPasswordRecovery) {
    return <TelaRedefinirSenha />;
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
