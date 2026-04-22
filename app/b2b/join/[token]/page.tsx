"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function B2BJoinPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { token } = useParams<{ token: string }>();

  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/auth/login?callbackUrl=/b2b/join/${token}`);
    }
  }, [status, router, token]);

  async function acceptInvite() {
    setState("loading");
    try {
      const res = await fetch(`/api/b2b/accept/${token}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setState("error"); setMsg(data.error ?? "Fout"); return; }
      setState("success");
      setMsg(data.companyName ?? "");
    } catch { setState("error"); setMsg("Verbindingsfout"); }
  }

  if (status === "loading" || status === "unauthenticated") return null;

  if (state === "success") {
    return (
      <div className="b2b-join-page">
        <div className="b2b-join-card">
          <div className="b2b-join-icon">✓</div>
          <h1 className="b2b-join-title">Welkom bij {msg}!</h1>
          <p className="b2b-join-sub">
            Je bent gekoppeld aan het bedrijfsaccount. Start je eerste les en behaal je certificaat vóór 1 juli 2026.
          </p>
          <Link href="/leren" className="b2b-join-cta">Begin met leren →</Link>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="b2b-join-page">
        <div className="b2b-join-card">
          <div className="b2b-join-icon">✗</div>
          <h1 className="b2b-join-title">Uitnodiging ongeldig</h1>
          <p className="b2b-join-sub">{msg}</p>
          <Link href="/" className="b2b-join-cta">Terug naar home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="b2b-join-page">
      <div className="b2b-join-card">
        <div className="b2b-join-icon">○</div>
        <h1 className="b2b-join-title">Uitnodiging accepteren</h1>
        <p className="b2b-join-sub">
          Je bent uitgenodigd om deel te nemen aan een bedrijfsaccount op Bitcoin Mentor.
          Klik op accepteren om je account te koppelen.
        </p>
        <p className="b2b-join-user">Ingelogd als: <strong>{session?.user?.name ?? session?.user?.email}</strong></p>
        <button
          className="b2b-join-cta"
          onClick={acceptInvite}
          disabled={state === "loading"}
        >
          {state === "loading" ? "Bezig…" : "Uitnodiging accepteren"}
        </button>
        <p className="b2b-join-not-you">
          Niet jij? <Link href="/auth/login">Log in met een ander account</Link>
        </p>
      </div>
    </div>
  );
}
