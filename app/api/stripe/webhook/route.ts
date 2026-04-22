import Stripe from "stripe";
import { getDb } from "@/db/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-03-31.basil",
});

export async function POST(request: Request) {
  const body = await request.text();
  const sig  = request.headers.get("stripe-signature") ?? "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

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

  if (event.type === "customer.subscription.deleted" || event.type === "invoice.payment_failed") {
    const obj = event.data.object as Stripe.Subscription | Stripe.Invoice;
    const meta = (obj as Stripe.Subscription).metadata
      ?? (obj as Stripe.Invoice).subscription_details?.metadata;
    const userId = meta?.userId;
    if (userId) {
      db.prepare("UPDATE users SET is_pro = 0, pro_until = '' WHERE id = ?")
        .run(parseInt(userId));
    }
  }

  return new Response("ok");
}
