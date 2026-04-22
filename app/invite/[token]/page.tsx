"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSession } from "next-auth/react";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const { lang } = useLanguage();
  const { data: session, status } = useSession();
  const router = useRouter();
  const isNL = lang === "nl";

  const [state, setState] = useState<"idle" | "loading" | "success" | "already" | "error">("idle");
  const [friendName, setFriendName] = useState("");

  useEffect(() => {
    if (!token) return;
    try {
      const id = parseInt(atob(decodeURIComponent(token as string)));
      if (!isNaN(id)) {
        fetch(`/api/users/public/${id}`)
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d?.username) setFriendName(d.username); })
          .catch(() => {});
      }
    } catch { /* ignore */ }
  }, [token]);

  async function accept() {
    if (status !== "authenticated") {
      router.push(`/auth/login?callbackUrl=/invite/${token}`);
      return;
    }
    setState("loading");
    try {
      const res = await fetch("/api/me/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) { setState("error"); return; }
      if (data.alreadyFriends) {
        setState("already");
        setFriendName(data.username ?? friendName);
      } else {
        setState("success");
        setFriendName(data.username ?? friendName);
      }
    } catch {
      setState("error");
    }
  }

  const name = friendName || (isNL ? "een trader" : "a trader");

  return (
    <main className="container-page" style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="card" style={{ textAlign: "center", padding: "40px 24px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>◉</div>

        {state === "success" && (
          <>
            <h1 style={{ fontSize: "1.3rem", marginBottom: 8 }}>
              {isNL ? `Verbonden met ${friendName}!` : `Connected with ${friendName}!`}
            </h1>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 20 }}>
              {isNL
                ? "Jullie streaks zijn nu zichtbaar voor elkaar op het dashboard."
                : "Your streaks are now visible to each other on the dashboard."}
            </p>
            <Link href="/dashboard" className="liveready-btn-primary" style={{ display: "inline-block" }}>
              {isNL ? "→ Naar dashboard" : "→ Go to dashboard"}
            </Link>
          </>
        )}

        {state === "already" && (
          <>
            <h1 style={{ fontSize: "1.3rem", marginBottom: 8 }}>
              {isNL ? `Al verbonden met ${friendName}` : `Already connected with ${friendName}`}
            </h1>
            <Link href="/dashboard" className="liveready-btn-primary" style={{ display: "inline-block", marginTop: 16 }}>
              {isNL ? "→ Naar dashboard" : "→ Go to dashboard"}
            </Link>
          </>
        )}

        {state === "error" && (
          <>
            <h1 style={{ fontSize: "1.3rem", marginBottom: 8 }}>
              {isNL ? "Ongeldig uitnodigingslink" : "Invalid invite link"}
            </h1>
            <Link href="/dashboard" style={{ color: "var(--primary)" }}>
              {isNL ? "Terug naar dashboard" : "Back to dashboard"}
            </Link>
          </>
        )}

        {(state === "idle" || state === "loading") && (
          <>
            <h1 style={{ fontSize: "1.3rem", marginBottom: 8 }}>
              {isNL
                ? `${name} nodigt je uit om streaks bij te houden`
                : `${name} invites you to track streaks together`}
            </h1>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 24, lineHeight: 1.55 }}>
              {isNL
                ? "Verbind je account en zie elkaars dagelijkse streak op Bitcoin Mentor."
                : "Connect your account and see each other's daily streak on Bitcoin Mentor."}
            </p>
            <button
              onClick={accept}
              disabled={state === "loading"}
              className="liveready-btn-primary"
              style={{ width: "100%", opacity: state === "loading" ? 0.7 : 1 }}
            >
              {state === "loading"
                ? (isNL ? "Verbinden…" : "Connecting…")
                : status === "authenticated"
                  ? (isNL ? "✓ Verbinden" : "✓ Connect")
                  : (isNL ? "Inloggen & verbinden" : "Log in & connect")}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
