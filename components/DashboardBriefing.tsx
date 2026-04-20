"use client";

import React, { useEffect, useState } from "react";

function renderMarkdown(text: string): React.ReactNode {
  return text.split("\n").map((line, i) => {
    if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
    const parts = line.replace(/^#+\s/, "").split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    const isHeading = /^#+\s/.test(line);
    const rendered = parts.map((p, j) => {
      if (p.startsWith("**") && p.endsWith("**")) return <strong key={j}>{p.slice(2, -2)}</strong>;
      if (p.startsWith("*") && p.endsWith("*")) return <em key={j}>{p.slice(1, -1)}</em>;
      return p;
    });
    return <div key={i} style={isHeading ? { fontWeight: 700, marginTop: 8 } : {}}>{rendered}</div>;
  });
}

type Briefing = {
  briefing: string | null;
  date: string;
  assets?: string[];
};

export default function DashboardBriefing() {
  const [data, setData] = useState<Briefing | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/briefing")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.briefing) setData(d); })
      .catch(() => {});
  }, []);

  if (!data?.briefing) return null;

  const preview = data.briefing.slice(0, 180).trimEnd();
  const hasMore = data.briefing.length > 180;

  return (
    <div className="card">
      <div className="dash-briefing-header">
        <div className="dash-briefing-avatar">M</div>
        <div>
          <div className="dash-briefing-title">Marcus · Dagelijkse Briefing</div>
          <div className="dash-briefing-date">{data.date}</div>
        </div>
        {data.assets && data.assets.length > 0 && (
          <div className="dash-briefing-assets">
            {data.assets.map(a => (
              <span key={a} className="dash-briefing-asset-chip">{a}</span>
            ))}
          </div>
        )}
      </div>
      <div className="dash-briefing-text">
        {renderMarkdown(expanded ? data.briefing : preview)}
        {hasMore && !expanded ? "…" : ""}
      </div>
      {hasMore && (
        <button className="dash-briefing-toggle" onClick={() => setExpanded(e => !e)}>
          {expanded ? "Minder tonen ↑" : "Volledig lezen ↓"}
        </button>
      )}
    </div>
  );
}
