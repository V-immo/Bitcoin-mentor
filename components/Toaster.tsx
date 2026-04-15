"use client";

import { useEffect, useRef, useState } from "react";
import type { ToastType } from "@/lib/toast";

type Toast = { id: number; message: string; type: ToastType };

let nextId = 0;
const AUTO_DISMISS_MS = 4500;

const THEME: Record<ToastType, { bg: string; border: string; icon: string; iconColor: string }> = {
  error:   { bg: "rgba(239,68,68,0.15)",  border: "rgba(239,68,68,0.45)",  icon: "✕", iconColor: "var(--red)" },
  success: { bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.35)",  icon: "✓", iconColor: "var(--green)" },
  info:    { bg: "rgba(233,30,99,0.12)",  border: "rgba(233,30,99,0.35)",  icon: "ℹ", iconColor: "var(--primary)" },
};

export default function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  function remove(id: number) {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  useEffect(() => {
    function handler(e: Event) {
      const { message, type } = (e as CustomEvent<{ message: string; type: ToastType }>).detail;
      const id = nextId++;
      setToasts(prev => [...prev.slice(-3), { id, message, type }]);
      timers.current[id] = setTimeout(() => {
        delete timers.current[id];
        setToasts(prev => prev.filter(t => t.id !== id));
      }, AUTO_DISMISS_MS);
    }
    window.addEventListener("app-toast", handler);
    return () => {
      window.removeEventListener("app-toast", handler);
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 24,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      alignItems: "center",
      pointerEvents: "none",
    }}>
      {toasts.map(t => {
        const th = THEME[t.type];
        return (
          <div key={t.id} style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: th.bg,
            border: `1px solid ${th.border}`,
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text)",
            backdropFilter: "blur(12px)",
            maxWidth: 360,
            pointerEvents: "auto",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            animation: "toast-in 0.2s ease",
          }}>
            <span style={{ color: th.iconColor, fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
              {th.icon}
            </span>
            <span style={{ flex: 1, lineHeight: 1.4 }}>{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#8a5068",
                fontSize: 16,
                lineHeight: 1,
                padding: "0 0 0 4px",
                flexShrink: 0,
              }}
              aria-label="Sluiten"
            >×</button>
          </div>
        );
      })}
    </div>
  );
}
