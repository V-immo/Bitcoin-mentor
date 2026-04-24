"use client";

// MarcusDailyBrief — één gecombineerde dagelijkse popup voor morning brief + debrief.
// Verschijnt automatisch eenmalig per dag zodra de gebruiker ingelogd is.
// Kan gesloten worden (opgeslagen in localStorage) en heropen worden via een kleine knop.
// "Opdracht gedaan" stuurt een stille context-melding naar Marcus (geen user-bubble).

import React, { useEffect, useState } from "react";
import { X, Share2, CheckCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/contexts/LanguageContext";

type BriefData = {
  available: boolean;
  date: string;
  level: number;
  group: number;
  content: string | null;
};

const TODAY_KEY      = () => `brief-seen-${new Date().toISOString().slice(0, 10)}`;
const TASK_DONE_KEY  = () => `brief-task-done-${new Date().toISOString().slice(0, 10)}`;

function renderInline(text: string): React.ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*")  && part.endsWith("*"))  return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

// Dispatch een custom event zodat FloatingMarcus het op kan vangen en verwerken
function notifyMarcusTaskDone(briefContent: string, isNL: boolean) {
  const summary = briefContent
    .split("\n")
    .filter(l => l.trim() && !/^#{1,3} /.test(l))
    .slice(0, 3)
    .join(" ")
    .slice(0, 300);

  const msg = isNL
    ? `Ik heb de dagelijkse opdracht uit de Morning Brief gedaan. De brief van vandaag ging over: "${summary}". Geef me kort feedback.`
    : `I completed today's daily task from the Morning Brief. Today's brief was about: "${summary}". Give me brief feedback.`;

  window.dispatchEvent(new CustomEvent("marcus-brief-task-done", { detail: { message: msg } }));
}

export default function MarcusDailyBrief() {
  const { data: session } = useSession();
  const { lang } = useLanguage();
  const isNL = lang !== "en";
  const [data, setData]           = useState<BriefData | null>(null);
  const [visible, setVisible]     = useState(false);
  const [copied, setCopied]       = useState(false);
  const [entered, setEntered]     = useState(false);
  const [taskDone, setTaskDone]   = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    // Herstel taskDone status voor vandaag
    if (localStorage.getItem(TASK_DONE_KEY())) setTaskDone(true);

    fetch("/api/me/morning-brief")
      .then(r => r.ok ? r.json() : null)
      .then((d: BriefData | null) => {
        if (!d?.available || !d.content) return;
        setData(d);
        // Toon eenmalig per dag — tenzij al gezien
        if (!localStorage.getItem(TODAY_KEY())) {
          setTimeout(() => { setVisible(true); setTimeout(() => setEntered(true), 30); }, 900);
        }
      })
      .catch(() => {});
  }, [session]);

  function close() {
    setEntered(false);
    setTimeout(() => setVisible(false), 260);
    localStorage.setItem(TODAY_KEY(), "1");
  }

  function reopen() {
    setVisible(true);
    setTimeout(() => setEntered(true), 30);
  }

  function handleCopy() {
    if (!data?.content) return;
    navigator.clipboard.writeText(
      [`Marcus Daily Brief — ${data.date}`, "", data.content, "", "#bitcoinmentor #trading #bitcoin #crypto"].join("\n")
    ).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  function handleTaskDone() {
    if (taskDone || !data?.content) return;
    setTaskDone(true);
    localStorage.setItem(TASK_DONE_KEY(), "1");
    notifyMarcusTaskDone(data.content, isNL);
    // Sluit brief na korte vertraging zodat gebruiker de check ziet
    setTimeout(() => close(), 800);
  }

  const groupLabel = ({ 1: isNL ? "Beginner" : "Beginner", 2: isNL ? "Gevorderd" : "Advanced", 3: isNL ? "Expert" : "Expert" } as Record<number, string>)[data?.group ?? 0] ?? "";

  return (
    <>
      {/* Heropen-knop — alleen zichtbaar als brief beschikbaar maar modal gesloten */}
      {data?.content && !visible && (
        <button className="daily-brief-reopen-btn" onClick={reopen} title="Marcus Daily Brief openen">
          <span className="daily-brief-reopen-avatar">M</span>
          <span className="daily-brief-reopen-label">{isNL ? "Daily Brief" : "Daily Brief"}</span>
        </button>
      )}

      {visible && data?.content && (
        <div className={`daily-brief-backdrop${entered ? " entered" : ""}`} onClick={close}>
          <div className={`daily-brief-modal${entered ? " entered" : ""}`} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="daily-brief-header">
              <div className="daily-brief-header-left">
                <div className="daily-brief-avatar">M</div>
                <div>
                  <div className="daily-brief-title">Marcus Daily Brief</div>
                  <div className="daily-brief-meta">{groupLabel} · {data.date}</div>
                </div>
              </div>
              <div className="daily-brief-header-actions">
                <button className="daily-brief-action-btn" onClick={handleCopy} title={isNL ? "Kopieer" : "Copy"}>
                  {copied ? "✓" : <Share2 size={14} />}
                </button>
                <button className="daily-brief-action-btn" onClick={close}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="daily-brief-body">
              {data.content.split("\n").map((line, i) => {
                if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
                if (/^#{1,3} /.test(line))
                  return <p key={i} className="daily-brief-heading">{renderInline(line.replace(/^#+\s/, ""))}</p>;
                return <p key={i} className="daily-brief-para">{renderInline(line)}</p>;
              })}
            </div>

            {/* Footer */}
            <div className="daily-brief-footer">
              <button
                className={`daily-brief-task-btn${taskDone ? " done" : ""}`}
                onClick={handleTaskDone}
                disabled={taskDone}
              >
                <CheckCircle size={15} />
                {taskDone
                  ? (isNL ? "Opdracht gedaan ✓" : "Task done ✓")
                  : (isNL ? "Opdracht gedaan" : "Task done")}
              </button>
              <button className="daily-brief-done-btn" onClick={close}>
                {isNL ? "Begrepen, aan de slag" : "Got it, let's go"} →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
