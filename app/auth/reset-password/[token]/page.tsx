"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string;

  const [form, setForm] = useState({ password: "", confirm: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const valid = form.password.length >= 8 && form.password === form.confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;

    setStatus("loading");
    setErrorMsg("");

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: form.password }),
    });

    if (res.ok) {
      setStatus("done");
      setTimeout(() => router.push("/auth/login"), 3000);
    } else {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.error ?? t("reset_error_failed"));
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

        <div className="login-title">{t("reset_title")}</div>

        {status === "done" ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <p style={{ color: "var(--text-primary)", fontSize: 14 }}>{t("reset_success_msg")}</p>
            <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 8 }}>{t("reset_redirect_hint")}</p>
            <Link href="/auth/login" style={{ display: "inline-block", marginTop: 20, color: "var(--primary)", fontSize: 13, textDecoration: "none" }}>
              {t("reset_to_login")}
            </Link>
          </div>
        ) : (
          <>
            <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 13, marginBottom: 20, marginTop: -8 }}>
              {t("reset_subtitle")}
            </p>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="login-field">
                <label className="login-label">
                  {t("reset_password_label")}{" "}
                  <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>({t("register_password_hint")})</span>
                </label>
                <input
                  className="login-input"
                  type="password"
                  value={form.password}
                  onChange={(e) => { setForm(f => ({ ...f, password: e.target.value })); setStatus("idle"); }}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={status === "loading"}
                  minLength={8}
                />
              </div>

              <div className="login-field">
                <label className="login-label">{t("reset_confirm_label")}</label>
                <input
                  className="login-input"
                  type="password"
                  value={form.confirm}
                  onChange={(e) => { setForm(f => ({ ...f, confirm: e.target.value })); setStatus("idle"); }}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={status === "loading"}
                />
              </div>

              {form.confirm.length > 0 && form.password !== form.confirm && (
                <div className="login-error">{t("register_error_mismatch")}</div>
              )}
              {status === "error" && <div className="login-error">{errorMsg}</div>}

              <button
                type="submit"
                className="login-btn"
                disabled={status === "loading" || !valid}
              >
                {status === "loading" ? t("reset_loading") : t("reset_btn")}
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
