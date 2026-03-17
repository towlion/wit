"use client";

import { createContext, useCallback, useContext, useState, useRef } from "react";

type ToastType = "error" | "success" | "info";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
  dismissing?: boolean;
}

interface ToastContextValue {
  toast: {
    error: (msg: string) => void;
    success: (msg: string) => void;
    info: (msg: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue>({
  toast: { error: () => {}, success: () => {}, info: () => {} },
});

export function useToast() {
  return useContext(ToastContext);
}

const MAX_TOASTS = 3;

const STYLES: Record<ToastType, string> = {
  error: "bg-[var(--danger-subtle)] border border-red-500/20 text-red-400",
  success: "bg-[var(--success-subtle)] border border-green-500/20 text-green-400",
  info: "bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)]",
};

const ICONS: Record<ToastType, React.ReactNode> = {
  error: (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 4.75a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0v-3zm.75 6a.75.75 0 110-1.5.75.75 0 010 1.5z" />
    </svg>
  ),
  success: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, dismissing: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 200);
  }, []);

  const add = useCallback(
    (type: ToastType, message: string) => {
      const id = ++idRef.current;
      setToasts((prev) => {
        const next = [...prev, { id, type, message }];
        return next.slice(-MAX_TOASTS);
      });
      const duration = type === "error" ? 6000 : 4000;
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const toast = {
    error: useCallback((msg: string) => add("error", msg), [add]),
    success: useCallback((msg: string) => add("success", msg), [add]),
    info: useCallback((msg: string) => add("info", msg), [add]),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl shadow-black/40 text-sm max-w-sm ${
              STYLES[t.type]
            } ${t.dismissing ? "animate-slide-out-right" : "animate-fade-in-up"}`}
          >
            {ICONS[t.type]}
            <span className="flex-1 min-w-0">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Dismiss notification"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
