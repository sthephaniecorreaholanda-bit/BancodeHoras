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
            </div>
          )}

          {message.text && (
            <p style={{ margin: "0 0 15px 0", fontSize: "13px", color: message.isError ? "#ef4444" : "#10b981", fontWeight: 600, textAlign: "center" }}>
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{ width: "100%", padding: "12px", borderRadius: "6px", border: "none", backgroundColor: "#1e3a8a", color: "#ffffff", fontSize: "16px", fontWeight: 600, cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? "..." : buttonLabels[view]}
          </button>
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
