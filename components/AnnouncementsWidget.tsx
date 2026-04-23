"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

type Announcement = {
  id: number;
  title: string;
  message: string;
  created_at: string;
};

export default function AnnouncementsWidget() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/me/announcements")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Announcement[] | null) => {
        if (!data || data.length === 0) return;
        const latest = data[0];
        const key = `dismissed-announcement-${latest.id}`;
        if (localStorage.getItem(key)) return;
        setAnnouncement(latest);
      })
      .catch(() => {});
  }, []);

  if (!announcement || dismissed) return null;

  function dismiss() {
    if (!announcement) return;
    localStorage.setItem(`dismissed-announcement-${announcement.id}`, "1");
    setDismissed(true);
  }

  return (
    <div className="announcement-banner">
      <div className="announcement-content">
        <span className="announcement-title">{announcement.title}</span>
        <span className="announcement-message">{announcement.message}</span>
      </div>
      <button className="announcement-close" onClick={dismiss} aria-label="Sluiten">
        <X size={14} />
      </button>
    </div>
  );
}
