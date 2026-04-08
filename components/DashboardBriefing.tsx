"use client";

import { useEffect, useState } from "react";

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
    <div className="dash-briefing-card">
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
      <p className="dash-briefing-text">
        {expanded ? data.briefing : preview}{hasMore && !expanded ? "…" : ""}
      </p>
      {hasMore && (
        <button className="dash-briefing-toggle" onClick={() => setExpanded(e => !e)}>
          {expanded ? "Minder tonen ↑" : "Volledig lezen ↓"}
        </button>
      )}
    </div>
  );
}
