"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Toont een taalkeuzescherm als de gebruiker nog geen taal heeft gekozen.
 * Verdwijnt na de keuze en onthoudt dit in localStorage.
 */
export default function LanguagePicker() {
  const { setLang } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const chosen = localStorage.getItem("app_lang");
    if (!chosen) setVisible(true);
  }, []);

  function choose(lang: "nl" | "en") {
    setLang(lang);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#0e0810",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 32, padding: 24,
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>₿</div>
        <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>
          Bitcoin Mentor
        </h1>
      </div>

      <div style={{ textAlign: "center" }}>
        <p style={{ color: "#bf7a99", fontSize: 16, margin: "0 0 6px 0", fontWeight: 600 }}>
          Kies je taal / Choose your language
        </p>
        <p style={{ color: "#6b7280", fontSize: 13, margin: 0 }}>
          Je kunt dit later wijzigen in instellingen · You can change this later in settings
        </p>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={() => choose("nl")}
          style={{
            padding: "18px 36px",
            borderRadius: 14,
            border: "2px solid rgba(191,122,153,0.3)",
            background: "rgba(191,122,153,0.08)",
            color: "#fff",
            fontSize: 18,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            minWidth: 140,
            transition: "all 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(191,122,153,0.18)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(191,122,153,0.08)")}
        >
          <span style={{ fontSize: 32 }}>🇳🇱</span>
          <span>Nederlands</span>
        </button>

        <button
          onClick={() => choose("en")}
          style={{
            padding: "18px 36px",
            borderRadius: 14,
            border: "2px solid rgba(191,122,153,0.3)",
            background: "rgba(191,122,153,0.08)",
            color: "#fff",
            fontSize: 18,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            minWidth: 140,
            transition: "all 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(191,122,153,0.18)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(191,122,153,0.08)")}
        >
          <span style={{ fontSize: 32 }}>🇬🇧</span>
          <span>English</span>
        </button>
      </div>
    </div>
  );
}
