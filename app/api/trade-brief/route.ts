import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { MentorSignal, TradeBrief } from "@/lib/types";

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY niet geconfigureerd");
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const signal: MentorSignal = body.signal;
  const asset: string = body.asset ?? "BTCUSDT";
  const currentPrice: number = body.currentPrice ?? signal?.price ?? 0;
  const tradeAmountEur: number = body.tradeAmountEur ?? 1000;

  if (!signal || !process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "Ontbrekende data" }, { status: 400 });
  }

  const ticker = asset.replace("USDT", "");

  // Bereken trade niveaus server-side
  const entryPrice = (signal.entryZoneLow + signal.entryZoneHigh) / 2;
  const stopLoss = signal.stopLoss;
  const target = signal.resistanceZoneLow;
  const entryToStop = entryPrice - stopLoss;
  const entryToTarget = target - entryPrice;
  const riskRewardRatio = entryToStop > 0 ? Math.round((entryToTarget / entryToStop) * 100) / 100 : 0;
  const riskEur = entryToStop > 0 ? Math.round((entryToStop / entryPrice) * tradeAmountEur * 100) / 100 : 0;
  const expectedProfitEur = entryToTarget > 0 ? Math.round((entryToTarget / entryPrice) * tradeAmountEur * 100) / 100 : 0;
  const decision = signal.blockers.length === 0 && signal.canBuyNow && riskRewardRatio >= 1 ? "long" : "skip";

  const systemPrompt = `Je bent mijn directe trading partner. Geen coach, geen leraar — je tradet met mij mee alsof het echt geld is.
Je spreekt altijd Nederlands. Je bent eerlijk, direct en bondig.
Antwoord ALLEEN met geldige JSON. Geen uitleg buiten de JSON. Geen markdown. Geen code block.

Formaat:
{
  "waaromNu": "...",
  "wanneerUitStappen": "...",
  "grootsteRisico": "...",
  "verwachtScenario": "...",
  "tijdshorizon": "..."
}

Regels:
- waaromNu: 2-3 zinnen. Waarom is dit nu het moment (of waarom niet)? Gebruik exacte getallen.
- wanneerUitStappen: Concreet. Noem exacte prijsniveaus voor stop-loss EN winstdoel.
- grootsteRisico: Wat kan er misgaan? Wees eerlijk.
- verwachtScenario: Wat verwacht je dat er de komende uren/dagen gebeurt?
- tijdshorizon: Kort: "2-4 uur", "1-3 dagen", "deze week", etc.
- Schrijf in eerste persoon meervoud: "wij", "we gaan", "ons stop staat".`;

  const userPrompt = `Trading partner briefing voor ${ticker}:

Huidige prijs: $${currentPrice.toFixed(2)}
Beslissing: ${decision === "long" ? "WE GAAN LONG" : "WE SLAAN OVER"}
Instapprijs: $${entryPrice.toFixed(2)}
Stop-loss: $${stopLoss.toFixed(2)} (risico: €${riskEur} op €${tradeAmountEur})
Doel: $${target.toFixed(2)} (winst: €${expectedProfitEur} op €${tradeAmountEur})
R/R verhouding: 1:${riskRewardRatio}

Signaal data:
- Score: ${signal.score}/100 (grade: ${signal.setupGrade})
- Trend dagelijks: ${signal.trend1d}, 4H: ${signal.trend4h}, 1H: ${signal.trend1h}
- RSI 4H: ${signal.rsi4h.toFixed(1)}, dagelijks: ${signal.rsi1d.toFixed(1)}
- Marktstructuur 4H: ${signal.structure4h}
- Volume: ${signal.volume}
- Koopzone: $${signal.entryZoneLow.toFixed(2)} – $${signal.entryZoneHigh.toFixed(2)}
- Resistance: $${signal.resistanceZoneLow.toFixed(2)} – $${signal.resistanceZoneHigh.toFixed(2)}
${signal.blockers.length > 0 ? `- Blockers: ${signal.blockers.join(", ")}` : "- Geen blockers"}
${signal.warnings.length > 0 ? `- Warnings: ${signal.warnings.join(", ")}` : ""}

Genereer de briefing JSON.`;

  try {
    const response = await getClient().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";

    let explanation = { waaromNu: "", wanneerUitStappen: "", grootsteRisico: "", verwachtScenario: "", tijdshorizon: "1-3 dagen" };
    try {
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        explanation = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
      }
    } catch {
      explanation.waaromNu = text.slice(0, 200) || "Briefing kon niet worden geladen.";
    }

    const brief: TradeBrief = {
      decision,
      entryPrice: Math.round(entryPrice * 100) / 100,
      stopLoss: Math.round(stopLoss * 100) / 100,
      target: Math.round(target * 100) / 100,
      riskRewardRatio,
      tradeAmountEur,
      riskEur,
      expectedProfitEur,
      ...explanation,
      asset,
      generatedAt: new Date().toISOString(),
    };

    return Response.json(brief);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Onbekende fout";
    return Response.json({ error: msg }, { status: 500 });
  }
}
