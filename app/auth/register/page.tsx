"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [refCode, setRefCode] = useState("");

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setRefCode(ref.toUpperCase());
  }, [searchParams]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError(t("register_error_mismatch"));
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: form.username, email: form.email, password: form.password, ref: refCode || undefined }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || t("register_error_failed"));
      setLoading(false);
      return;
    }

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

        <div className="login-title">{t("register_title")}</div>
        <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 13, marginBottom: 20, marginTop: -8 }}>
          {t("register_subtitle")}
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label className="login-label">{t("register_username")}</label>
            <input
              className="login-input"
              type="text"
              value={form.username}
              onChange={(e) => set("username", e.target.value)}
              placeholder={t("register_username_placeholder")}
              autoComplete="username"
              disabled={loading}
              minLength={3}
              maxLength={30}
            />
          </div>

          <div className="login-field">
            <label className="login-label">{t("register_email")}</label>
            <input
              className="login-input"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder={t("register_email_placeholder")}
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="login-field">
            <label className="login-label">
              {t("register_password")}{" "}
              <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>({t("register_password_hint")})</span>
            </label>
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
            <label className="login-label">{t("register_confirm")}</label>
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

          {refCode && (
            <div className="referral-register-banner">
              Uitnodigingscode actief: <strong>{refCode}</strong> — je krijgt +100 XP bij registratie
            </div>
          )}

          {error && <div className="login-error">{error}</div>}

          <button
            type="submit"
            className="login-btn"
            disabled={loading || !valid}
          >
            {loading ? t("register_loading") : t("register_btn")}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--text-secondary)" }}>
          {t("register_has_account")}{" "}
          <Link href="/auth/login" style={{ color: "var(--primary)", textDecoration: "none" }}>
            {t("register_login_link")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
