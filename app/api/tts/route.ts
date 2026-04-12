import { NextRequest } from "next/server";
import { auth } from "@/auth";

// ElevenLabs voice ID voor Marcus — diepe mannenstem
// Default: "onwK4e9ZLuTAKqWW03F9" (Daniel) of "N2lVS1w4EtoT3dr4eOWO" (Callum)
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "onwK4e9ZLuTAKqWW03F9";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { text } = await request.json().catch(() => ({ text: "" }));
  if (!text?.trim()) return new Response("No text", { status: 400 });

  const apiKey = process.env.ELEVENLABS_API_KEY;

  // Fallback: geen ElevenLabs key → 204 zodat client de browser TTS gebruikt
  if (!apiKey) {
    return new Response(null, { status: 204 });
  }

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
        model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.1, use_speaker_boost: true },
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
