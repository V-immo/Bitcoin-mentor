import { buildMentorSignal } from "@/lib/mentor";

export async function GET() {
  try {
    const data = await buildMentorSignal();
    return Response.json({ ok: true, data });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Onbekende fout",
      },
      { status: 500 }
    );
  }
}
