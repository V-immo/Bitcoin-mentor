"use client";

import SettingsPanel from "@/components/SettingsPanel";
import { useLanguage } from "@/contexts/LanguageContext";

export default function InstellingenPage() {
  const { t } = useLanguage();

  return (
    <div className="page-container page-narrow">
      <div className="page-header">
        <h1 className="page-title">{t("instellingen_title")}</h1>
        <p className="page-subtitle">{t("instellingen_subtitle")}</p>
      </div>
      <SettingsPanel />
    </div>
  );
}
