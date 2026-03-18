import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const body = await req.json();

    const prompt = `
You are a professional trading mentor.

Explain the current market situation simply for a beginner.

Price: ${body.price}
Trend 4h: ${body.trend4h}
RSI 4h: ${body.rsi4h}
Score: ${body.score}

Explain:
1 what the market is doing
2 what the user should watch
3 what mistake beginners make here
`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            input: prompt,
        }),
    });

    const json = await res.json();

    return NextResponse.json({
        text: json.output?.[0]?.content?.[0]?.text ?? "Geen analyse beschikbaar.",
    });
}
