import { Palette } from "lucide-react";
import { useTheme, ACCENT_COLORS, type AccentKey } from "@/hooks/use-theme";

export default function Personalizacao() {
  const { accent, setAccent, theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl md:text-lg font-semibold flex items-center gap-2">
        <Palette size={20} className="text-primary flex-shrink-0" />
        Personalização
      </h1>

      {/* Accent color */}
      <div className="bg-card border border-card-border rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h2 className="font-semibold text-sm">Cor Principal do Sistema</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Aplicada nos botões, cards em destaque, ícones ativos e gráfico de evolução.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {ACCENT_COLORS.map((color) => {
            const isSelected = accent === color.key;
            return (
              <button
                key={color.key}
                type="button"
                onClick={() => setAccent(color.key as AccentKey)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-card-border hover:border-muted-foreground/40 bg-background"
                }`}
              >
                <span
                  className="w-6 h-6 rounded-full flex-shrink-0 shadow-sm ring-1 ring-black/10"
                  style={{ background: color.preview }}
                />
                <span
                  className={`text-sm font-medium ${
                    isSelected ? "text-primary" : "text-foreground"
                  }`}
                >
                  {color.label}
                </span>
                {isSelected && (
                  <span className="ml-auto w-2.5 h-2.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dark / Light mode */}
      <div className="bg-card border border-card-border rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h2 className="font-semibold text-sm">Modo de Exibição</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Alterne entre o tema claro e escuro.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(["light", "dark"] as const).map((t) => {
            const isSelected = theme === t;
            const label = t === "light" ? "☀️  Modo Claro" : "🌙  Modo Escuro";
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  if (theme !== t) toggleTheme();
                }}
                className={`px-4 py-3.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-card-border hover:border-muted-foreground/40 text-muted-foreground bg-background"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
