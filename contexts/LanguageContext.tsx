"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { Lang, TranslationKey } from "@/lib/translations";
import { getTranslations } from "@/lib/translations";

type LanguageContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "nl",
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("nl");

  // Laad taal: localStorage voor snelle initialisatie, DB is altijd de bron van waarheid
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Snelle render vanuit localStorage (voorkomt flash)
    const stored = localStorage.getItem("app_lang") as Lang | null;
    if (stored === "nl" || stored === "en") setLangState(stored);

    // DB is altijd de echte bron — overschrijft localStorage indien anders
    fetch("/api/me/settings")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const dbLang = d?.aiLanguage;
        const resolved: Lang = dbLang === "en" ? "en" : "nl";
        setLangState(resolved);
        localStorage.setItem("app_lang", resolved);
      })
      .catch(() => {
        // Kon DB niet bereiken — behoud huidige waarde
        if (!stored || (stored !== "nl" && stored !== "en")) {
          setLangState("nl");
          localStorage.setItem("app_lang", "nl");
        }
      });
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    if (typeof window !== "undefined") {
      localStorage.setItem("app_lang", l);
      // Sync naar DB (enkel in browser)
      window.fetch("/api/me/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiLanguage: l }),
      }).catch(() => {});
    }
  }

  const translations = getTranslations(lang);
  function t(key: TranslationKey): string {
    return translations[key] ?? key;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
