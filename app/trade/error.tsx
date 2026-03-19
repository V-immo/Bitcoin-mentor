"use client";

import { useEffect } from "react";

export default function TradeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Trade page error:", error);
  }, [error]);

  return (
    <main className="container-page clean-page">
      <div className="card" style={{ maxWidth: 480, margin: "60px auto", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <div className="value-sm red" style={{ marginBottom: 8 }}>Er ging iets mis</div>
        <p className="small-text muted" style={{ marginBottom: 16 }}>
          De handelspagina kon niet laden. Probeer opnieuw of herlaad de pagina.
        </p>
        {error?.message && (
          <p style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 16, fontFamily: "monospace", background: "rgba(255,255,255,0.04)", padding: "8px 12px", borderRadius: 6 }}>
            {error.message}
          </p>
        )}
        <button className="admin-btn admin-btn-primary" onClick={reset}>
          Opnieuw proberen
        </button>
      </div>
    </main>
  );
}
