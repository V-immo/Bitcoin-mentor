import Stripe from "stripe";
import { getDb } from "@/db/db";

export async function POST(request: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  if (!key) return new Response("Stripe niet geconfigureerd", { status: 503 });
  const stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
  const body = await request.text();
  const sig  = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return new Response("Webhook signature invalid", { status: 400 });
  }

  const db = getDb();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId  = session.metadata?.userId;
    const plan    = session.metadata?.plan;
    if (!userId) return new Response("No userId", { status: 400 });

    // Zet pro_until op basis van plan
    const months = plan === "yearly" ? 12 : 1;
    const until  = new Date();
    until.setMonth(until.getMonth() + months);
    const proUntil = until.toISOString().slice(0, 10);

    db.prepare("UPDATE users SET is_pro = 1, pro_until = ? WHERE id = ?")
      .run(proUntil, parseInt(userId));
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.userId;
    if (userId) {
      db.prepare("UPDATE users SET is_pro = 0, pro_until = '' WHERE id = ?")
        .run(parseInt(userId));
    }
  }

  // invoice.payment_failed: Stripe cancelt het abonnement automatisch na X retries
  // en stuurt dan customer.subscription.deleted — dat verwerken we hierboven al.

  return new Response("ok");
}
