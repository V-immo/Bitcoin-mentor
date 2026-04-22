"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Member = {
  id: number;
  username: string;
  email: string;
  loginStreak: number;
  level: number;
  xp: number;
  quizStreak: number;
  lastQuizDate: string | null;
  weakTopics: string[];
  certReady: boolean;
  activeToday: boolean;
};

type Company = { name: string; seats: number; plan: string; invitesUsed: number };

const LEVEL_LABELS = [
  "—", "Beginner", "Lerende", "Bewuste Trader", "Gedisciplineerde",
  "Pro", "Geavanceerd", "TA Expert", "On-Chain", "Portfoliobeheer", "Professioneel",
];

export default function B2BDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invites, setInvites] = useState<{ token: string; accepted: number }[]>([]);
  const [copiedToken, setCopiedToken] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/auth/login"); return; }
    if (status !== "authenticated") return;

    Promise.all([
      fetch("/api/b2b/members").then(r => r.ok ? r.json() : Promise.reject(r)),
      fetch("/api/b2b/invite").then(r => r.ok ? r.json() : { invites: [] }),
    ]).then(([data, invData]) => {
      setCompany(data.company);
      setMembers(data.members ?? []);
      setInvites(invData.invites ?? []);
    }).catch(() => setError("Geen toegang — log in als bedrijfsadmin"))
      .finally(() => setLoading(false));
  }, [session, status, router]);

  function copyLink(token: string) {
    const link = `${window.location.origin}/b2b/join/${token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(""), 2000);
    });
  }

  if (loading) return <div className="b2b-dash-loading">Laden…</div>;
  if (error)   return <div className="b2b-dash-error">{error}</div>;
  if (!company) return null;

  const certCount   = members.filter(m => m.certReady).length;
  const activeToday = members.filter(m => m.activeToday).length;
  const unusedInvites = invites.filter(i => !i.accepted);

  return (
    <div className="b2b-dash-page">
      <div className="b2b-dash-header">
        <div>
          <h1 className="b2b-dash-title">{company.name}</h1>
          <p className="b2b-dash-sub">
            {company.invitesUsed}/{company.seats} seats gebruikt ·{" "}
            {company.plan === "yearly" ? "Jaarplan" : "Maandplan"}
          </p>
        </div>
        <div className="b2b-dash-stats">
          <div className="b2b-stat-pill">
            <span className="b2b-stat-val">{certCount}</span>
            <span className="b2b-stat-label">Gecertificeerd</span>
          </div>
          <div className="b2b-stat-pill">
            <span className="b2b-stat-val">{activeToday}</span>
            <span className="b2b-stat-label">Actief vandaag</span>
          </div>
          <div className="b2b-stat-pill">
            <span className="b2b-stat-val">{members.length}</span>
            <span className="b2b-stat-label">Medewerkers</span>
          </div>
        </div>
      </div>

      {/* Medewerkers tabel */}
      <div className="b2b-section">
        <div className="b2b-section-header">
          <h2 className="b2b-section-title">Voortgang medewerkers</h2>
          <a
            href="/api/b2b/export"
            download
            className="b2b-export-btn"
          >
            CSV exporteren
          </a>
        </div>
        {members.length === 0 ? (
          <p className="b2b-empty">Nog geen medewerkers. Stuur de uitnodigingslinks hieronder.</p>
        ) : (
          <div className="b2b-table-wrap">
            <table className="b2b-table">
              <thead>
                <tr>
                  <th>Medewerker</th>
                  <th>Niveau</th>
                  <th>XP</th>
                  <th>Streak</th>
                  <th>Aandachtspunten</th>
                  <th>Certificaat</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id} className={m.activeToday ? "b2b-row--active" : ""}>
                    <td className="b2b-td-name">
                      <div className="b2b-member-avatar">{m.username.charAt(0).toUpperCase()}</div>
                      <div>
                        <div className="b2b-member-name">{m.username}</div>
                        <div className="b2b-member-email">{m.email}</div>
                      </div>
                    </td>
                    <td>
                      <span className="b2b-level-badge">
                        {LEVEL_LABELS[m.level] ?? `Lvl ${m.level}`}
                      </span>
                    </td>
                    <td className="b2b-td-num">{m.xp}</td>
                    <td className="b2b-td-num">{m.loginStreak}d</td>
                    <td className="b2b-td-topics">
                      {m.weakTopics.length > 0
                        ? m.weakTopics.join(", ")
                        : <span className="b2b-td-ok">—</span>}
                    </td>
                    <td>
                      {m.certReady
                        ? <span className="b2b-cert-ready">✓ Klaar</span>
                        : <span className="b2b-cert-pending">Bezig</span>}
                    </td>
                    <td>
                      {m.activeToday
                        ? <span className="b2b-active-dot" title="Actief vandaag" />
                        : <span className="b2b-inactive-dot" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Uitnodigingslinks */}
      <div className="b2b-section">
        <h2 className="b2b-section-title">Uitnodigingslinks</h2>
        <p className="b2b-section-sub">
          Stuur elke link naar één medewerker. De link is eenmalig bruikbaar.
        </p>
        <div className="b2b-invite-grid">
          {unusedInvites.slice(0, 20).map((inv, idx) => (
            <div key={inv.token} className="b2b-invite-row">
              <span className="b2b-invite-num">Seat {idx + 1}</span>
              <button className="b2b-invite-copy" onClick={() => copyLink(inv.token)}>
                {copiedToken === inv.token ? "✓ Gekopieerd" : "Kopieer link"}
              </button>
            </div>
          ))}
          {unusedInvites.length === 0 && (
            <p className="b2b-empty">Alle seats zijn gebruikt.</p>
          )}
        </div>
      </div>

      {/* MiCA informatie */}
      <div className="b2b-mica-banner">
        <div className="b2b-mica-icon">○</div>
        <div>
          <div className="b2b-mica-title">MiCA-conformiteit</div>
          <div className="b2b-mica-text">
            Alle medewerkers die niveau 5 halen met ≥70% quizscore ontvangen een certificaat van Bitcoin Mentor.
            Deadline ESMA-vereisten: <strong>1 juli 2026</strong>. {certCount}/{members.length} medewerkers gecertificeerd.
          </div>
        </div>
      </div>
    </div>
  );
}
