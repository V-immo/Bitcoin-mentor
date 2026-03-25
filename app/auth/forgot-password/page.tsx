"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      setStatus("sent");
    } else {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.error ?? t("forgot_error_failed"));
      setStatus("error");
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-logo-icon">₿</span>
          <span className="login-logo-name">Bitcoin Mentor</span>
        </div>

        <div className="login-title">{t("forgot_title")}</div>

        {status === "sent" ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✉️</div>
            <p style={{ color: "var(--text-primary)", fontSize: 14, lineHeight: 1.6 }}>
              {t("forgot_sent_msg")}
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 8 }}>
              {t("forgot_sent_hint")}
            </p>
            <Link
              href="/auth/login"
              style={{ display: "inline-block", marginTop: 20, color: "var(--primary)", fontSize: 13, textDecoration: "none" }}
            >
              ← {t("forgot_back_login")}
            </Link>
          </div>
        ) : (
          <>
            <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 13, marginBottom: 20, marginTop: -8 }}>
              {t("forgot_subtitle")}
            </p>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="login-field">
                <label className="login-label">{t("forgot_email_label")}</label>
                <input
                  className="login-input"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setStatus("idle"); }}
                  placeholder={t("forgot_email_placeholder")}
                  autoComplete="email"
                  disabled={status === "loading"}
                  required
                />
              </div>

              {status === "error" && <div className="login-error">{errorMsg}</div>}

              <button
                type="submit"
                className="login-btn"
                disabled={status === "loading" || !email.includes("@")}
              >
                {status === "loading" ? t("forgot_loading") : t("forgot_btn")}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--text-secondary)" }}>
              <Link href="/auth/login" style={{ color: "var(--primary)", textDecoration: "none" }}>
                ← {t("forgot_back_login")}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
