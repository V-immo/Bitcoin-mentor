import { auth } from "@/auth";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2026-03-25.dahlia",
});

const PRICES: Record<string, string> = {
  monthly: process.env.STRIPE_PRICE_MONTHLY ?? "",
  yearly:  process.env.STRIPE_PRICE_YEARLY  ?? "",
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const userId = (session.user as { id?: string }).id ?? "";
  const email  = session.user.email ?? "";

  const { plan } = await request.json() as { plan: string };
  const priceId = PRICES[plan];
  if (!priceId) return Response.json({ error: "Ongeldig plan" }, { status: 400 });

  const origin = request.headers.get("origin") ?? "https://bitcoinmentor.be";

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { userId, plan },
    success_url: `${origin}/pro/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${origin}/pro`,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { userId, plan },
    },
  });

  return Response.json({ url: checkout.url });
}
