import nodemailer from "nodemailer";

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? user ?? "noreply@bitcoinmentor.be";

  if (!host || !user || !pass) {
    throw new Error("SMTP niet geconfigureerd (SMTP_HOST, SMTP_USER, SMTP_PASS ontbreken)");
  }

  return { transport: nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } }), from };
}

export async function sendAlertEmail(opts: {
  to: string;
  asset: string;
  condition: "above" | "below";
  targetPrice: number;
  currentPrice: number;
}) {
  const { transport, from } = createTransport();

  const dir = opts.condition === "above" ? "boven" : "onder";
  const dirEmoji = opts.condition === "above" ? "📈" : "📉";
  const subject = `${dirEmoji} Alert: ${opts.asset} is ${dir} €${opts.targetPrice.toLocaleString("nl-NL")}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0e0810; color: #e5d4e7; max-width: 480px; margin: 0 auto; padding: 24px;">
  <div style="background: linear-gradient(135deg, #1a0f18, #2a1a28); border: 1px solid #3d2a3b; border-radius: 12px; padding: 28px;">
    <div style="font-size: 32px; margin-bottom: 12px;">${dirEmoji}</div>
    <h1 style="color: #e91e63; font-size: 22px; margin: 0 0 8px 0;">Prijsalert getriggerd!</h1>
    <p style="color: #bf7a99; font-size: 15px; margin: 0 0 20px 0;">
      <strong style="color: #e5d4e7;">${opts.asset}</strong> staat nu op
      <strong style="color: #26c57c; font-size: 18px;"> €${opts.currentPrice.toLocaleString("nl-NL", { maximumFractionDigits: 2 })}</strong>,
      ${opts.condition === "above" ? "boven" : "onder"} jouw alert van
      <strong style="color: #f59e0b;"> €${opts.targetPrice.toLocaleString("nl-NL", { maximumFractionDigits: 2 })}</strong>.
    </p>
    <a href="https://bitcoinmentor.be/trade" style="display: inline-block; background: #e91e63; color: #fff; text-decoration: none; border-radius: 8px; padding: 12px 24px; font-weight: 600; font-size: 14px;">
      → Open Bitcoin Mentor
    </a>
    <p style="color: #6b7280; font-size: 11px; margin-top: 20px;">
      Je ontvangt dit bericht omdat je een prijsalert hebt ingesteld op Bitcoin Mentor.<br>
      Wil je geen alerts meer? Verwijder ze via de instellingen in de app.
    </p>
  </div>
</body>
</html>
  `.trim();

  await transport.sendMail({ from, to: opts.to, subject, html });
}
