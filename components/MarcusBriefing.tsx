"use client";

import { useEffect, useState } from "react";

type BriefingData = {
  briefing: string | null;
  assets: string[];
  date: string;
  createdAt?: string;
};

function markdownToHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .split("\n")
    .map(line => line.trim() === "" ? "<div style='height:6px'></div>" : `<div>${line}</div>`)
    .join("");
}

export default function MarcusBriefing({ defaultExpanded = true }: { defaultExpanded?: boolean }) {
  const [data, setData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    fetch("/api/briefing")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!data?.briefing) return null;

  const timeStr = data.createdAt
    ? new Date(data.createdAt + "Z").toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })
    : "";

  const preview = data.briefing.split("\n").slice(0, 3).join("\n");

  return (
    <div className="marcus-briefing-card">
      <div className="marcus-briefing-header" onClick={() => setExpanded(v => !v)}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="marcus-avatar-m" style={{ width: 28, height: 28, fontSize: 14, flexShrink: 0 }}>M</div>
          <div>
            <div className="marcus-briefing-title">Dagelijkse Swing Briefing</div>
            <div className="marcus-briefing-meta">
              {data.date}{timeStr ? ` · ${timeStr}` : ""}
              {data.assets?.length > 0 && (
                <span style={{ marginLeft: 8 }}>
                  {data.assets.map(a => <span key={a} className="marcus-briefing-asset-chip">{a}</span>)}
                </span>
              )}
            </div>
          </div>
        </div>
        <span className="marcus-briefing-toggle">{expanded ? "▲" : "▼"}</span>
      </div>

      {!expanded && (
        <div className="marcus-briefing-preview"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(preview) }}
        />
      )}

      {expanded && (
        <div className="marcus-briefing-body"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(data.briefing) }}
        />
      )}
    </div>
  );
}
