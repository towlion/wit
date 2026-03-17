"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

type Theme = "dark" | "light" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolved: "dark" | "light";
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  resolved: "dark",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function resolveTheme(theme: Theme): "dark" | "light" {
  if (theme === "system") {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    return "dark";
  }
  return theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [resolved, setResolved] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = localStorage.getItem("wit-theme") as Theme | null;
    if (stored && ["dark", "light", "system"].includes(stored)) {
      setThemeState(stored);
      const r = resolveTheme(stored);
      setResolved(r);
      document.documentElement.dataset.theme = r;
    }
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    function handler() {
      const r = resolveTheme("system");
      setResolved(r);
      document.documentElement.dataset.theme = r;
    }
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("wit-theme", t);
    const r = resolveTheme(t);
    setResolved(r);
    document.documentElement.dataset.theme = r;
    const token = localStorage.getItem("token");
    if (token) {
      /* Theme applied locally first; server sync is best-effort */
      api.patch("/profile", { theme: t }).catch((e) => console.warn("Failed to save theme preference:", e.message));
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function applyUserTheme(userTheme: string | null | undefined) {
  if (!userTheme) return;
  const t = userTheme as Theme;
  if (["dark", "light"].includes(t)) {
    localStorage.setItem("wit-theme", t);
    document.documentElement.dataset.theme = t;
  }
}
