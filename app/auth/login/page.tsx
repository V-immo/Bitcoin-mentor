"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    setLoading(false);
    if (res?.error) {
      setError("Gebruikersnaam of wachtwoord onjuist.");
    } else {
      router.push("/");
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

        <div className="login-title">Inloggen</div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label className="login-label">Gebruikersnaam</label>
            <input
              className="login-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="jouw gebruikersnaam"
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <div className="login-field">
            <label className="login-label">Wachtwoord</label>
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

          {error && <div className="login-error">{error}</div>}

          <button
            type="submit"
            className="login-btn"
            disabled={loading || !username || !password}
          >
            {loading ? "Bezig…" : "Inloggen →"}
          </button>
        </form>
      </div>
    </div>
  );
}
