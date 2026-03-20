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

  // Laad taal uit localStorage bij mount
  useEffect(() => {
    const stored = localStorage.getItem("app_lang") as Lang | null;
    if (stored === "nl" || stored === "en") {
      setLangState(stored);
    } else {
      // Sync vanuit DB als ingelogd
      fetch("/api/me/settings")
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.aiLanguage === "en") setLangState("en");
        })
        .catch(() => {});
    }
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem("app_lang", l);
    // Sync naar DB
    fetch("/api/me/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiLanguage: l }),
    }).catch(() => {});
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
