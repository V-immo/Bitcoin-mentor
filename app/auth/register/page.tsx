"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError("Wachtwoorden komen niet overeen");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: form.username, email: form.email, password: form.password }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Registratie mislukt");
      setLoading(false);
      return;
    }

    // Auto-login na registratie
    const login = await signIn("credentials", {
      username: form.username,
      password: form.password,
      redirect: false,
    });

    setLoading(false);
    if (login?.error) {
      router.push("/auth/login");
    } else {
      router.push("/onboarding");
      router.refresh();
    }
  }

  const valid = form.username.length >= 3 && form.email.includes("@") && form.password.length >= 8 && form.confirm.length > 0;

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-logo-icon">₿</span>
          <span className="login-logo-name">Bitcoin Mentor</span>
        </div>

        <div className="login-title">Account aanmaken</div>
        <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 13, marginBottom: 20, marginTop: -8 }}>
          Gratis starten. Geen creditcard nodig.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label className="login-label">Gebruikersnaam</label>
            <input
              className="login-input"
              type="text"
              value={form.username}
              onChange={(e) => set("username", e.target.value)}
              placeholder="jouw gebruikersnaam"
              autoComplete="username"
              disabled={loading}
              minLength={3}
              maxLength={30}
            />
          </div>

          <div className="login-field">
            <label className="login-label">E-mailadres</label>
            <input
              className="login-input"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="jou@email.com"
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="login-field">
            <label className="login-label">Wachtwoord <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>(min. 8 tekens)</span></label>
            <input
              className="login-input"
              type="password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <div className="login-field">
            <label className="login-label">Wachtwoord bevestigen</label>
            <input
              className="login-input"
              type="password"
              value={form.confirm}
              onChange={(e) => set("confirm", e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button
            type="submit"
            className="login-btn"
            disabled={loading || !valid}
          >
            {loading ? "Account aanmaken…" : "Account aanmaken →"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--text-secondary)" }}>
          Al een account?{" "}
          <Link href="/auth/login" style={{ color: "var(--primary)", textDecoration: "none" }}>
            Inloggen →
          </Link>
        </div>
      </div>
    </div>
  );
}
