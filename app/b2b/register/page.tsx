"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

const PLANS = [
  { key: "monthly", label: "Maandelijks", price: "€29", unit: "/seat/maand", highlight: false },
  { key: "yearly",  label: "Jaarlijks",  price: "€249", unit: "/seat/jaar", highlight: true, saving: "Bespaar 28%" },
];

export default function B2BRegisterPage() {
  const [form, setForm] = useState({
    companyName: "", email: "", password: "", seats: "5", plan: "yearly",
  });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone]     = useState(false);
  const [tokens, setTokens] = useState<string[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/b2b/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Registratie mislukt"); setLoading(false); return; }

      setTokens(data.inviteTokens ?? []);
      setDone(true);

      // Auto-login
      await signIn("credentials", { email: form.email, password: form.password, redirect: false });
    } catch { setError("Verbindingsfout"); }
    setLoading(false);
  }

  function copyToken(token: string, idx: number) {
    const link = `${window.location.origin}/b2b/join/${token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  }

  if (done) {
    return (
      <div className="b2b-register-page">
        <div className="b2b-register-card">
          <div className="b2b-success-icon">✅</div>
          <h1 className="b2b-register-title">Bedrijf aangemaakt</h1>
          <p className="b2b-register-sub">
            Stuur de onderstaande links naar je medewerkers. Elke link is eenmalig bruikbaar.
          </p>
          <div className="b2b-invite-list">
            {tokens.map((token, idx) => (
              <div key={token} className="b2b-invite-row">
                <span className="b2b-invite-num">Seat {idx + 1}</span>
                <span className="b2b-invite-link">
                  {`${window.location.origin}/b2b/join/${token}`.slice(0, 40)}…
                </span>
                <button
                  className="b2b-invite-copy"
                  onClick={() => copyToken(token, idx)}
                >
                  {copiedIdx === idx ? "✓" : "Kopieer"}
                </button>
              </div>
            ))}
          </div>
          <Link href="/b2b/dashboard" className="b2b-dashboard-btn">
            Naar bedrijfsdashboard →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="b2b-register-page">
      <div className="b2b-register-card">
        <div className="b2b-register-header">
          <span className="b2b-register-badge">MiCA-gereed · ESMA 2026</span>
          <h1 className="b2b-register-title">Bitcoin Mentor voor bedrijven</h1>
          <p className="b2b-register-sub">
            Voldoe aan de MiCA-vereisten: gecertificeerde crypto-basiskennis voor al je medewerkers.
            Voortgang en certificaten per medewerker. Factuur per seat.
          </p>
        </div>

        {/* Plan selector */}
        <div className="b2b-plan-grid">
          {PLANS.map(p => (
            <button
              key={p.key}
              className={`b2b-plan-card ${form.plan === p.key ? "b2b-plan-card--active" : ""}`}
              onClick={() => set("plan", p.key)}
              type="button"
            >
              {p.saving && <span className="b2b-plan-saving">{p.saving}</span>}
              <div className="b2b-plan-label">{p.label}</div>
              <div className="b2b-plan-price">{p.price}<span className="b2b-plan-unit">{p.unit}</span></div>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="b2b-register-form">
          <label className="b2b-label">Bedrijfsnaam</label>
          <input className="b2b-input" value={form.companyName} onChange={e => set("companyName", e.target.value)} placeholder="Acme BV" required />

          <label className="b2b-label">Contact e-mail (= admin login)</label>
          <input className="b2b-input" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="admin@acme.be" required />

          <label className="b2b-label">Wachtwoord</label>
          <input className="b2b-input" type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Minimaal 8 tekens" required />

          <label className="b2b-label">Aantal seats (medewerkers)</label>
          <input
            className="b2b-input" type="number" min="1" max="500"
            value={form.seats} onChange={e => set("seats", e.target.value)} required
          />

          <div className="b2b-price-summary">
            Totaal:{" "}
            <strong>
              {form.plan === "yearly"
                ? `€${249 * (parseInt(form.seats) || 1)}/jaar`
                : `€${29 * (parseInt(form.seats) || 1)}/maand`}
            </strong>
            {" "}· Facturering na activatie
          </div>

          {error && <p className="b2b-error">{error}</p>}

          <button className="b2b-submit-btn" type="submit" disabled={loading}>
            {loading ? "Aanmaken…" : "Bedrijf registreren"}
          </button>
        </form>

        <p className="b2b-login-link">
          Al een account? <Link href="/auth/login">Inloggen</Link>
        </p>
      </div>
    </div>
  );
}
