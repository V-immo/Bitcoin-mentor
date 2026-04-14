import { NextRequest } from "next/server";
import { auth } from "@/auth";

// ElevenLabs voice ID voor Marcus — diepe warme mannenstem
// George (JBFqnCBsd6RMkjVDRZzb) — autoritair, warm, uitstekend in Dutch met multilingual model
// Alternatief via env: ELEVENLABS_VOICE_ID overschrijven
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "JBFqnCBsd6RMkjVDRZzb";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { text, lang } = await request.json().catch(() => ({ text: "", lang: "nl" }));
  if (!text?.trim()) return new Response("No text", { status: 400 });

  const apiKey = process.env.ELEVENLABS_API_KEY;

  // Fallback: geen ElevenLabs key → 204 zodat client de browser TTS gebruikt
  if (!apiKey) {
    return new Response(null, { status: 204 });
  }

  // eleven_multilingual_v2 — beste model voor Nederlands en andere talen
  // Detecteert taal automatisch uit de tekst, geen accent problemen
  const model = (lang === "en") ? "eleven_turbo_v2_5" : "eleven_multilingual_v2";

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text: text.slice(0, 800),
        model_id: model,
        voice_settings: { stability: 0.45, similarity_boost: 0.80, style: 0.25, use_speaker_boost: true },
      }),
    });

    if (!res.ok) return new Response(null, { status: 204 });

    // Stream audio terug naar client
    return new Response(res.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response(null, { status: 204 });
  }
}
