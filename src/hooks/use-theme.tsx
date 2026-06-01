import { useState, useEffect, createContext, useContext } from "react";

type Theme = "light" | "dark";

export type AccentKey = "esmeralda" | "azul" | "grafite" | "terracota";

export interface AccentColor {
  key: AccentKey;
  label: string;
  light: string;
  dark: string;
  preview: string;
}

export const ACCENT_COLORS: AccentColor[] = [
  {
    key: "esmeralda",
    label: "Verde Esmeralda",
    light: "160 70% 36%",
    dark: "160 72% 44%",
    preview: "hsl(160, 70%, 36%)",
  },
  {
    key: "azul",
    label: "Azul Noturno",
    light: "217 91% 45%",
    dark: "213 85% 62%",
    preview: "hsl(217, 91%, 45%)",
  },
  {
    key: "grafite",
    label: "Cinza Grafite",
    light: "215 16% 42%",
    dark: "215 14% 62%",
    preview: "hsl(215, 16%, 42%)",
  },
  {
    key: "terracota",
    label: "Terracota",
    light: "16 68% 44%",
    dark: "16 70% 58%",
    preview: "hsl(16, 68%, 44%)",
  },
];

function applyAccent(key: AccentKey) {
  const accent = ACCENT_COLORS.find((a) => a.key === key) ?? ACCENT_COLORS[0];
  let el = document.getElementById("bh-accent-style") as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = "bh-accent-style";
    document.head.appendChild(el);
  }
  el.textContent = `
    :root {
      --primary: ${accent.light};
      --ring: ${accent.light};
      --sidebar-primary: ${accent.light};
      --sidebar-ring: ${accent.light};
      --chart-1: ${accent.light};
    }
    .dark {
      --primary: ${accent.dark};
      --ring: ${accent.dark};
      --sidebar-primary: ${accent.dark};
      --sidebar-ring: ${accent.dark};
      --chart-1: ${accent.dark};
    }
  `;
}

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  accent: AccentKey;
  setAccent: (key: AccentKey) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggleTheme: () => {},
  accent: "esmeralda",
  setAccent: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("bh-theme") as Theme | null;
    return stored ?? "light";
  });

  const [accent, setAccentState] = useState<AccentKey>(() => {
    const stored = localStorage.getItem("bh-accent") as AccentKey | null;
    return stored ?? "esmeralda";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("bh-theme", theme);
  }, [theme]);

  useEffect(() => {
    applyAccent(accent);
    localStorage.setItem("bh-accent", accent);
  }, [accent]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  const setAccent = (key: AccentKey) => setAccentState(key);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
