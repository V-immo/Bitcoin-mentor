"use client";

import { useEffect, useState } from "react";

type QuizRow = {
  id: number;
  level: number;
  lang: string;
  topic: string;
  question: string;
  created_at: string;
  times_shown: number;
};

type PoolStat = { level: number; lang: string; count: number };

const LEVELS = [1, 2, 3, 4, 5];
const LANGS  = ["nl", "en"];

const EMPTY_FORM = {
  level: 1, lang: "nl", topic: "",
  question: "", context: "",
  optA: "", optB: "", optC: "", optD: "",
  correct: "A", explanation: "",
};

export default function AdminQuizPage() {
  const [rows, setRows]           = useState<QuizRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filterLevel, setFilterLevel] = useState<number | "all">("all");
  const [filterLang, setFilterLang]   = useState<"nl" | "en" | "all">("all");
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ ...EMPTY_FORM });
  const [saving, setSaving]       = useState(false);
  const [saveMsg, setSaveMsg]     = useState<string | null>(null);
  const [genLevel, setGenLevel]   = useState(1);
  const [genLang, setGenLang]     = useState<"nl" | "en">("nl");
  const [genCount, setGenCount]   = useState(5);
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg]       = useState<string | null>(null);
  const [deleting, setDeleting]   = useState<number | null>(null);
  const [stats, setStats]         = useState<PoolStat[]>([]);
  const [bulkGen, setBulkGen]     = useState(false);
  const [bulkMsg, setBulkMsg]     = useState<string | null>(null);

  async function loadStats() {
    const res = await fetch("/api/admin/quiz?stats=1");
    const data = await res.json();
    if (Array.isArray(data)) setStats(data);
  }

  async function loadRows() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterLevel !== "all") params.set("level", String(filterLevel));
    if (filterLang  !== "all") params.set("lang",  filterLang);
    const res = await fetch(`/api/admin/quiz?${params}`);
    const data = await res.json();
    setRows(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { loadRows(); loadStats(); }, [filterLevel, filterLang]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    setSaving(true); setSaveMsg(null);
    const res = await fetch("/api/admin/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level: form.level, lang: form.lang, topic: form.topic,
        question: form.question, context: form.context,
        options: [`A. ${form.optA}`, `B. ${form.optB}`, `C. ${form.optC}`, `D. ${form.optD}`],
        correct: form.correct, explanation: form.explanation,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.ok) {
      setSaveMsg("✅ Vraag toegevoegd!");
      setForm({ ...EMPTY_FORM });
      setShowForm(false);
      loadRows();
    } else {
      setSaveMsg(`❌ ${data.error}`);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Vraag verwijderen?")) return;
    setDeleting(id);
    await fetch(`/api/admin/quiz?id=${id}`, { method: "DELETE" });
    setDeleting(null);
    loadRows();
  }

  async function handleGenerate() {
    setGenerating(true); setGenMsg(null);
    const res = await fetch("/api/admin/quiz/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: genLevel, lang: genLang, count: genCount }),
    });
    const data = await res.json();
    setGenerating(false);
    if (data.ok) {
      setGenMsg(`✅ ${data.count} vragen gegenereerd en opgeslagen.`);
      loadRows(); loadStats();
    } else {
      setGenMsg(`❌ ${data.error}`);
    }
  }

  // Genereer 10 vragen per niveau voor beide talen waar pool < 20 vragen
  async function handleBulkGenerate() {
    setBulkGen(true); setBulkMsg(null);
    let total = 0;
    const errors: string[] = [];
    for (const lvl of LEVELS) {
      for (const lang of LANGS) {
        const existing = stats.find(s => s.level === lvl && s.lang === lang)?.count ?? 0;
        if (existing >= 20) continue; // al genoeg
        try {
          const res = await fetch("/api/admin/quiz/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ level: lvl, lang, count: 10 }),
          });
          const data = await res.json();
          if (data.ok) total += data.count;
          else errors.push(`L${lvl}/${lang}: ${data.error}`);
        } catch { errors.push(`L${lvl}/${lang}: netwerk fout`); }
      }
    }
    setBulkGen(false);
    setBulkMsg(errors.length > 0
      ? `⚠️ ${total} vragen gegenereerd. Fouten: ${errors.join(", ")}`
      : total > 0
        ? `✅ ${total} vragen gegenereerd voor lege niveaus.`
        : `ℹ️ Alle niveaus hebben al 20+ vragen.`
    );
    loadRows(); loadStats();
  }

  const f = (key: keyof typeof form, val: string | number) =>
    setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Quiz Pool</h1>
        <span className="admin-page-sub">{rows.length} vragen zichtbaar</span>
      </div>

      {/* Pool Statistieken */}
      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div className="admin-card-title" style={{ marginBottom: 0 }}>📊 Pool statistieken</div>
          <button
            className="admin-btn admin-btn-primary"
            onClick={handleBulkGenerate}
            disabled={bulkGen}
            style={{ fontSize: 12, padding: "5px 12px" }}
          >
            {bulkGen ? "Genereren…" : "⚡ Vul lege niveaus bij"}
          </button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #2a1a28" }}>
                <th style={thStyle}>Niveau</th>
                {LANGS.map(l => <th key={l} style={thStyle}>{l.toUpperCase()}</th>)}
              </tr>
            </thead>
            <tbody>
              {LEVELS.map(lvl => (
                <tr key={lvl} style={{ borderBottom: "1px solid #1a0f18" }}>
                  <td style={{ padding: "7px 8px", color: "var(--primary)", fontWeight: 700 }}>Level {lvl}</td>
                  {LANGS.map(lang => {
                    const count = stats.find(s => s.level === lvl && s.lang === lang)?.count ?? 0;
                    const color = count === 0 ? "var(--red)" : count < 15 ? "var(--orange)" : "var(--green)";
                    return (
                      <td key={lang} style={{ padding: "7px 8px", color, fontWeight: 600 }}>
                        {count} vragen {count < 15 ? "⚠️" : "✓"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {bulkMsg && <div style={{ marginTop: 10, fontSize: 13 }}>{bulkMsg}</div>}
      </div>

      {/* AI Genereren */}
      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div className="admin-card-title" style={{ marginBottom: 12 }}>🤖 Genereer vragen via AI</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label style={labelStyle}>Niveau</label>
            <select style={selectStyle} value={genLevel} onChange={e => setGenLevel(parseInt(e.target.value))}>
              {LEVELS.map(l => <option key={l} value={l}>Level {l}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Taal</label>
            <select style={selectStyle} value={genLang} onChange={e => setGenLang(e.target.value as "nl" | "en")}>
              <option value="nl">NL</option>
              <option value="en">EN</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Aantal</label>
            <select style={selectStyle} value={genCount} onChange={e => setGenCount(parseInt(e.target.value))}>
              {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <button
            className="admin-btn admin-btn-primary"
            onClick={handleGenerate}
            disabled={generating}
            style={{ marginBottom: 0 }}
          >
            {generating ? "Genereren…" : "Genereer"}
          </button>
        </div>
        {genMsg && <div style={{ marginTop: 10, fontSize: 13 }}>{genMsg}</div>}
      </div>

      {/* Filter + Toevoegen knop */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <select style={selectStyle} value={String(filterLevel)} onChange={e => setFilterLevel(e.target.value === "all" ? "all" : parseInt(e.target.value))}>
          <option value="all">Alle niveaus</option>
          {LEVELS.map(l => <option key={l} value={l}>Level {l}</option>)}
        </select>
        <select style={selectStyle} value={filterLang} onChange={e => setFilterLang(e.target.value as "nl" | "en" | "all")}>
          <option value="all">NL + EN</option>
          <option value="nl">NL</option>
          <option value="en">EN</option>
        </select>
        <button
          className="admin-btn admin-btn-primary"
          onClick={() => { setShowForm(v => !v); setSaveMsg(null); }}
        >
          {showForm ? "Annuleer" : "+ Vraag toevoegen"}
        </button>
        {saveMsg && <span style={{ fontSize: 13 }}>{saveMsg}</span>}
      </div>

      {/* Handmatig toevoegen formulier */}
      {showForm && (
        <div className="admin-card" style={{ marginBottom: 20 }}>
          <div className="admin-card-title" style={{ marginBottom: 14 }}>Nieuwe vraag</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Niveau</label>
              <select style={selectStyle} value={form.level} onChange={e => f("level", parseInt(e.target.value))}>
                {LEVELS.map(l => <option key={l} value={l}>Level {l}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Taal</label>
              <select style={selectStyle} value={form.lang} onChange={e => f("lang", e.target.value)}>
                {LANGS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
              </select>
            </div>
          </div>
          <Field label="Onderwerp (topic)" value={form.topic} onChange={v => f("topic", v)} />
          <Field label="Vraag" value={form.question} onChange={v => f("question", v)} textarea />
          <Field label="Context (optioneel)" value={form.context} onChange={v => f("context", v)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Antwoord A" value={form.optA} onChange={v => f("optA", v)} />
            <Field label="Antwoord B" value={form.optB} onChange={v => f("optB", v)} />
            <Field label="Antwoord C" value={form.optC} onChange={v => f("optC", v)} />
            <Field label="Antwoord D" value={form.optD} onChange={v => f("optD", v)} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Correct antwoord</label>
            <select style={selectStyle} value={form.correct} onChange={e => f("correct", e.target.value)}>
              {["A", "B", "C", "D"].map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <Field label="Uitleg (explanation)" value={form.explanation} onChange={v => f("explanation", v)} textarea />
          <button className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Opslaan…" : "Opslaan"}
          </button>
        </div>
      )}

      {/* Tabel */}
      <div className="admin-card">
        {loading ? (
          <div className="admin-loading">Laden…</div>
        ) : rows.length === 0 ? (
          <div className="admin-empty-inline">Geen vragen gevonden voor deze filter.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #2a1a28" }}>
                  {["ID", "Lvl", "Lang", "Onderwerp", "Vraag", "Getoond", ""].map(h => (
                    <th key={h} style={{ padding: "6px 8px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} style={{ borderBottom: "1px solid #1a0f18" }}>
                    <td style={{ padding: "8px", color: "var(--text-muted)", fontSize: 11 }}>{row.id}</td>
                    <td style={{ padding: "8px" }}>
                      <span style={{ background: "var(--surface-1)", color: "var(--primary)", borderRadius: 10, padding: "1px 7px", fontWeight: 700, fontSize: 11 }}>
                        {row.level}
                      </span>
                    </td>
                    <td style={{ padding: "8px", color: "var(--text-secondary)", fontSize: 11 }}>{row.lang.toUpperCase()}</td>
                    <td style={{ padding: "8px", color: "var(--text-secondary)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.topic}
                    </td>
                    <td style={{ padding: "8px", color: "var(--text)", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.question}
                    </td>
                    <td style={{ padding: "8px", color: "var(--text-muted)", textAlign: "center" }}>{row.times_shown}</td>
                    <td style={{ padding: "8px" }}>
                      <button
                        onClick={() => handleDelete(row.id)}
                        disabled={deleting === row.id}
                        style={{ background: "none", border: "1px solid #3d2a3b", borderRadius: 6, padding: "2px 8px", cursor: "pointer", color: "var(--red)", fontSize: 11 }}
                      >
                        {deleting === row.id ? "…" : "✕"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, textarea }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean }) {
  const base: React.CSSProperties = {
    width: "100%", background: "var(--surface)", border: "1px solid #3d2a3b", borderRadius: 6,
    color: "var(--text)", padding: "7px 10px", fontSize: 13, boxSizing: "border-box",
    fontFamily: "inherit",
  };
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label}</label>
      {textarea
        ? <textarea rows={3} style={{ ...base, resize: "vertical" }} value={value} onChange={e => onChange(e.target.value)} />
        : <input style={base} value={value} onChange={e => onChange(e.target.value)} />
      }
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, color: "var(--text-secondary)", marginBottom: 4, fontWeight: 600 };
const selectStyle: React.CSSProperties = {
  background: "var(--surface)", border: "1px solid #3d2a3b", borderRadius: 6,
  color: "var(--text)", padding: "6px 10px", fontSize: 13, cursor: "pointer",
};
const thStyle: React.CSSProperties = {
  padding: "6px 8px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, whiteSpace: "nowrap",
};
