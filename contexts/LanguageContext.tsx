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

  // Laad taal uit localStorage bij mount (client-only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("app_lang") as Lang | null;
    if (stored === "nl" || stored === "en") {
      setLangState(stored);
    }
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
