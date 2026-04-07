import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";

type TradeHistory = {
  id?: string | number;
  side?: string;
  qty?: number;
  price?: number;
  pnl?: number;
  createdAt?: string;
  timestamp?: number;
};

type JournalRow = {
  date: string;
  note: string | null;
  emotion: number;
};

const EMOTION_LABELS: Record<number, string> = {
  1: "FOMO/Stress",
  2: "Onzeker",
  3: "Neutraal",
  4: "Rustig",
  5: "Zelfverzekerd",
};

function csvRow(cells: (string | number | null | undefined)[]): string {
  return cells
    .map(c => {
      const str = c == null ? "" : String(c);
      return `"${str.replace(/"/g, '""')}"`;
    })
    .join(",");
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  const userId = parseInt((session.user as { id?: string }).id ?? "0");

  const type = request.nextUrl.searchParams.get("type") ?? "trades";
  const db = getDb();

  // ── Journal export ──────────────────────────────────────────────────────────
  if (type === "journal") {
    const entries = db.prepare(
      "SELECT date, note, emotion FROM trade_journal WHERE user_id = ? ORDER BY date DESC"
    ).all(userId) as JournalRow[];

    const lines: string[] = [
      csvRow(["Datum", "Emotie", "Score (1-5)", "Notitie"]),
    ];

    for (const e of entries) {
      lines.push(csvRow([
        e.date,
        EMOTION_LABELS[e.emotion] ?? "",
        e.emotion,
        e.note ?? "",
      ]));
    }

    return new Response(lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bitcoin-mentor-journal.csv"`,
      },
    });
  }

  // ── Trades export (default) ─────────────────────────────────────────────────
  const papers = db.prepare(
    "SELECT asset, history FROM paper_trading WHERE user_id = ?"
  ).all(userId) as { asset: string; history: string }[];

  const lines: string[] = [
    csvRow(["Datum", "Asset", "Side", "Hoeveelheid", "Prijs (USD)", "PnL (USD)"]),
  ];

  for (const paper of papers) {
    let history: TradeHistory[] = [];
    try { history = JSON.parse(paper.history ?? "[]"); } catch { continue; }

    for (const t of history) {
      // datum uit createdAt of timestamp
      let date = "";
      if (t.createdAt) {
        date = t.createdAt.slice(0, 10);
      } else if (t.timestamp) {
        date = new Date(t.timestamp).toISOString().slice(0, 10);
      }

      lines.push(csvRow([
        date,
        paper.asset,
        (t.side ?? "").toUpperCase(),
        t.qty != null ? t.qty.toFixed(6) : "",
        t.price != null ? t.price.toFixed(2) : "",
        t.pnl != null ? t.pnl.toFixed(2) : "",
      ]));
    }
  }

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bitcoin-mentor-trades.csv"`,
    },
  });
}
