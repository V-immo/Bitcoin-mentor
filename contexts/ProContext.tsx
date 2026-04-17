"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useSession } from "next-auth/react";

type ProContextValue = {
  isPro: boolean;
  loading: boolean;
  refresh: () => void;
};

const ProContext = createContext<ProContextValue>({ isPro: false, loading: true, refresh: () => {} });

export function ProProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  async function fetchPro() {
    if (!session?.user) { setIsPro(false); setLoading(false); return; }
    try {
      const r = await fetch("/api/me/pro");
      if (r.ok) {
        const d = await r.json();
        setIsPro(!!d.isPro);
      }
    } catch { /* fallback: free */ }
    setLoading(false);
  }

  useEffect(() => {
    if (status === "loading") return;
    fetchPro();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <ProContext.Provider value={{ isPro, loading, refresh: fetchPro }}>
      {children}
    </ProContext.Provider>
  );
}

export function usePro() {
  return useContext(ProContext);
}
