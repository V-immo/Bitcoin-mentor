import SettingsPanel from "@/components/SettingsPanel";

export default function InstellingenPage() {
  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="settings-title">Instellingen</h1>
        <p className="settings-subtitle">Pas jouw trading ervaring aan</p>
      </div>
      <SettingsPanel />
    </div>
  );
}
