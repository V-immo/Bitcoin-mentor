"use client";

import SettingsPanel from "@/components/SettingsPanel";
import { useLanguage } from "@/contexts/LanguageContext";

export default function InstellingenPage() {
  const { t } = useLanguage();

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="settings-title">{t("instellingen_title")}</h1>
        <p className="settings-subtitle">{t("instellingen_subtitle")}</p>
      </div>
      <SettingsPanel />
    </div>
  );
}
