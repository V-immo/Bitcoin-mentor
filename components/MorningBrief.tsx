"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

type BriefData = {
  available: boolean;
  date: string;
  level: number;
  group: number;
  content: string | null;
  createdAt?: string;
};

const GROUP_LABEL: Record<number, string> = {
  1: "Beginner (level 1–2)",
  2: "Gevorderd (level 3–4)",
  3: "Expert (level 5–6)",
};
const GROUP_LABEL_EN: Record<number, string> = {
  1: "Beginner (level 1–2)",
  2: "Advanced (level 3–4)",
  3: "Expert (level 5–6)",
};

export default function MorningBrief() {
  const { lang } = useLanguage();
  const isNL = lang !== "en";
  const [data, setData] = useState<BriefData | null>(null);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    fetch("/api/me/morning-brief")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {});
  }, []);

  if (!data || !data.available || !data.content) return null;

  const groupLabel = isNL
    ? GROUP_LABEL[data.group] ?? ""
    : GROUP_LABEL_EN[data.group] ?? "";

  const handleCopy = () => {
    const text = [
      `📊 Marcus Morning Brief — ${data.date}`,
      "",
      data.content,
      "",
      "#bitcoinmentor #trading #bitcoin #crypto",
    ].join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={`morning-brief-card${open ? "" : " morning-brief-card--collapsed"}`}>
      <div className="morning-brief-header" onClick={() => setOpen(v => !v)}>
        <div className="morning-brief-header-left">
          <span className="morning-brief-icon">☀️</span>
          <div>
            <div className="morning-brief-title">
              {isNL ? "Morning Brief" : "Morning Brief"}
            </div>
            <div className="morning-brief-meta">
              Marcus · {groupLabel} · {data.date}
            </div>
          </div>
        </div>
        <div className="morning-brief-header-right">
          <button
            className="morning-brief-copy-btn"
            onClick={e => { e.stopPropagation(); handleCopy(); }}
            title={isNL ? "Kopieer voor social media" : "Copy for social media"}
          >
            {copied ? (isNL ? "✓ Gekopieerd" : "✓ Copied") : (isNL ? "↑ Exporteer" : "↑ Export")}
          </button>
          <span className="morning-brief-chevron">{open ? "▴" : "▾"}</span>
        </div>
      </div>

      {open && (
        <div className="morning-brief-body">
          <div className="morning-brief-avatar">M</div>
          <div className="morning-brief-content">
            {data.content.split("\n").map((line, i) => (
              line.trim()
                ? <p key={i} className="morning-brief-para">{line}</p>
                : <div key={i} className="morning-brief-spacer" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
