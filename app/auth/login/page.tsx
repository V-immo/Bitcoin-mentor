"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totpToken, setTotpToken] = useState("");
  const [step, setStep] = useState<"credentials" | "totp">("credentials");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    setError("");

    // Stap 1: controleer of 2FA vereist is
    if (step === "credentials") {
      const check = await fetch("/api/auth/2fa-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const { requires2fa } = await check.json();

      if (requires2fa) {
        setStep("totp");
        setLoading(false);
        return;
      }
    }

    // Stap 2 (of direct als geen 2FA): inloggen
    const res = await signIn("credentials", {
      username,
      password,
      totp_token: totpToken || undefined,
      redirect: false,
    });

    setLoading(false);
    if (res?.error) {
      if (step === "totp") {
        setError("Ongeldige authenticatiecode — probeer opnieuw");
        setTotpToken("");
      } else {
        setError(t("login_error"));
      }
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-logo-icon">₿</span>
          <span className="login-logo-name">Bitcoin Mentor</span>
        </div>

        <div className="login-title">
          {step === "totp" ? "Tweestapsverificatie" : t("login_title")}
        </div>

        {step === "totp" && (
          <div style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center", marginBottom: 16, lineHeight: 1.6 }}>
            Open je authenticator app en voer de 6-cijferige code in voor <strong style={{ color: "var(--text)" }}>Bitcoin Mentor</strong>.
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          {step === "credentials" && (
            <>
              <div className="login-field">
                <label className="login-label">{t("login_username")}</label>
                <input
                  className="login-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t("login_username_placeholder")}
                  autoComplete="username"
                  disabled={loading}
                />
              </div>

              <div className="login-field">
                <label className="login-label">{t("login_password")}</label>
                <input
                  className="login-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>
            </>
          )}

          {step === "totp" && (
            <div className="login-field">
              <label className="login-label">Authenticatiecode</label>
              <input
                className="login-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={totpToken}
                onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                autoComplete="one-time-code"
                autoFocus
                disabled={loading}
                style={{ letterSpacing: 6, fontSize: 22, textAlign: "center" }}
              />
            </div>
          )}

          {error && <div className="login-error">{error}</div>}

          <button
            type="submit"
            className="login-btn"
            disabled={loading || (step === "credentials" ? (!username || !password) : totpToken.length < 6)}
          >
            {loading
              ? t("login_loading")
              : step === "totp"
                ? "Verificeren"
                : t("login_btn")
            }
          </button>

          {step === "totp" && (
            <button
              type="button"
              style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13, marginTop: 4, padding: "4px 0" }}
              onClick={() => { setStep("credentials"); setTotpToken(""); setError(""); }}
            >
              ← Terug naar inloggen
            </button>
          )}
        </form>

        {step === "credentials" && (
          <>
            <div style={{ textAlign: "center", marginTop: 12, fontSize: 13 }}>
              <Link href="/auth/forgot-password" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
                {t("login_forgot_password")}
              </Link>
            </div>
            <div style={{ textAlign: "center", marginTop: 10, fontSize: 13, color: "var(--text-secondary)" }}>
              {t("login_no_account")}{" "}
              <Link href="/auth/register" style={{ color: "var(--primary)", textDecoration: "none" }}>
                {t("login_register_link")}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
