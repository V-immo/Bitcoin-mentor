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
  const dirSymbol = opts.condition === "above" ? "↑" : "↓";
  const subject = `${dirSymbol} Alert: ${opts.asset} is ${dir} €${opts.targetPrice.toLocaleString("nl-NL")}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0e0810; color: #e5d4e7; max-width: 480px; margin: 0 auto; padding: 24px;">
  <div style="background: linear-gradient(135deg, #1a0f18, #2a1a28); border: 1px solid #3d2a3b; border-radius: 12px; padding: 28px;">
    <div style="font-size: 32px; margin-bottom: 12px;">${dirSymbol}</div>
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

export async function sendWelcomeEmail(opts: { to: string; name: string }) {
  const { transport, from } = createTransport();

  const subject = `Welkom bij Bitcoin Mentor, ${opts.name}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0e0810; color: #e5d4e7; max-width: 480px; margin: 0 auto; padding: 24px;">
  <div style="background: linear-gradient(135deg, #1a0f18, #2a1a28); border: 1px solid #3d2a3b; border-radius: 12px; padding: 28px;">
    <div style="font-size: 28px; font-weight: 800; color: #e91e63; margin-bottom: 4px;">Bitcoin Mentor</div>
    <div style="font-size: 12px; color: #bf7a99; margin-bottom: 20px; letter-spacing: 0.5px;">JOUW PERSOONLIJKE TRADINGCOACH</div>
    <h1 style="color: #e5d4e7; font-size: 20px; margin: 0 0 12px 0;">Hey ${opts.name},</h1>
    <p style="color: #bf7a99; font-size: 15px; margin: 0 0 16px 0; line-height: 1.6;">
      Ik ben Marcus. Vanaf nu coach ik je persoonlijk — elke dag een beetje beter worden als trader.
    </p>
    <p style="color: #bf7a99; font-size: 14px; margin: 0 0 20px 0; line-height: 1.6;">
      Hier is wat ik aanraad om vandaag te doen:
    </p>
    <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px;">
      <div style="background: rgba(233,30,99,0.08); border: 1px solid rgba(233,30,99,0.2); border-radius: 8px; padding: 12px 14px; font-size: 13px; color: #e5d4e7;">
        <span style="color: #e91e63; font-weight: 700; margin-right: 8px;">1.</span>
        Begin met je eerste les — kost je 10 minuten
      </div>
      <div style="background: rgba(233,30,99,0.08); border: 1px solid rgba(233,30,99,0.2); border-radius: 8px; padding: 12px 14px; font-size: 13px; color: #e5d4e7;">
        <span style="color: #e91e63; font-weight: 700; margin-right: 8px;">2.</span>
        Doe de dagelijkse quiz — bouw je streak op
      </div>
      <div style="background: rgba(233,30,99,0.08); border: 1px solid rgba(233,30,99,0.2); border-radius: 8px; padding: 12px 14px; font-size: 13px; color: #e5d4e7;">
        <span style="color: #e91e63; font-weight: 700; margin-right: 8px;">3.</span>
        Open de chart — kijk naar Bitcoin en vraag mij wat je ziet
      </div>
    </div>
    <a href="https://bitcoinmentor.be/dashboard" style="display: inline-block; background: #e91e63; color: #fff; text-decoration: none; border-radius: 8px; padding: 13px 28px; font-weight: 600; font-size: 14px;">
      → Start met leren
    </a>
    <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">— Marcus</p>
  </div>
</body>
</html>
  `.trim();

  await transport.sendMail({ from, to: opts.to, subject, html });
}

export async function sendDripEmail(opts: {
  to: string;
  name: string;
  step: 1 | 2;  // 1 = dag 3, 2 = dag 7
  token: string;
}) {
  const { transport, from } = createTransport();

  const unsubUrl = `https://bitcoinmentor.be/api/me/unsubscribe-reminders?token=${opts.token}`;

  const subject = opts.step === 1
    ? `${opts.name}, je hebt 3 dagen niet geoefend`
    : `${opts.name} — ben je Bitcoin vergeten?`;

  const body = opts.step === 1
    ? `<p style="color: #bf7a99; font-size: 15px; margin: 0 0 16px 0; line-height: 1.6;">
        Je bent 3 dagen geleden begonnen maar sindsdien heb ik je niet meer gezien.<br>
        Dat begrijp ik — starten is makkelijk, volhouden is het moeilijkste.
      </p>
      <p style="color: #bf7a99; font-size: 14px; margin: 0 0 20px 0; line-height: 1.6;">
        Doe vandaag alleen de quiz — dat is 5 minuten en genoeg om je streak te redden.
      </p>`
    : `<p style="color: #bf7a99; font-size: 15px; margin: 0 0 16px 0; line-height: 1.6;">
        Een week zonder oefenen. De markt heeft niet stilgestaan.
      </p>
      <p style="color: #bf7a99; font-size: 14px; margin: 0 0 20px 0; line-height: 1.6;">
        Ik weet niet wat je tegenhoudt, maar ik ben er nog als je terugkomt.
        Alles staat waar je het hebt achtergelaten.
      </p>`;

  const cta = opts.step === 1
    ? "Doe de quiz van vandaag"
    : "Kom terug";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0e0810; color: #e5d4e7; max-width: 480px; margin: 0 auto; padding: 24px;">
  <div style="background: linear-gradient(135deg, #1a0f18, #2a1a28); border: 1px solid #3d2a3b; border-radius: 12px; padding: 28px;">
    <div style="font-size: 28px; font-weight: 800; color: #e91e63; margin-bottom: 16px;">Bitcoin Mentor</div>
    <h1 style="color: #e5d4e7; font-size: 20px; margin: 0 0 12px 0;">Hey ${opts.name},</h1>
    ${body}
    <a href="https://bitcoinmentor.be/leren" style="display: inline-block; background: #e91e63; color: #fff; text-decoration: none; border-radius: 8px; padding: 13px 28px; font-weight: 600; font-size: 14px;">
      → ${cta}
    </a>
    <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">— Marcus</p>
    <p style="color: #4b5563; font-size: 11px; margin-top: 12px;">
      <a href="${unsubUrl}" style="color: #6b7280;">Geen e-mails meer ontvangen</a>
    </p>
  </div>
</body>
</html>
  `.trim();

  await transport.sendMail({ from, to: opts.to, subject, html });
}

export async function sendReminderEmail(opts: { to: string; name: string; token: string }) {
  const { transport, from } = createTransport();

  const subject = `${opts.name}, je streak staat op het spel`;
  const unsubUrl = `https://bitcoinmentor.be/api/me/unsubscribe-reminders?token=${opts.token}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0e0810; color: #e5d4e7; max-width: 480px; margin: 0 auto; padding: 24px;">
  <div style="background: linear-gradient(135deg, #1a0f18, #2a1a28); border: 1px solid #3d2a3b; border-radius: 12px; padding: 28px;">
    <div style="font-size: 32px; margin-bottom: 12px; color: #e91e63; font-weight: 700;">!</div>
    <h1 style="color: #e91e63; font-size: 22px; margin: 0 0 8px 0;">Hey ${opts.name},</h1>
    <p style="color: #bf7a99; font-size: 15px; margin: 0 0 20px 0;">
      Je hebt vandaag je dagelijkse missies nog niet afgerond.<br>
      Doe de quiz, lees een les — het kost je maar 10 minuten.
    </p>
    <a href="https://bitcoinmentor.be/leren" style="display: inline-block; background: #e91e63; color: #fff; text-decoration: none; border-radius: 8px; padding: 12px 24px; font-weight: 600; font-size: 14px;">
      → Ga nu naar Bitcoin Mentor
    </a>
    <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">— Marcus</p>
    <p style="color: #4b5563; font-size: 11px; margin-top: 12px;">
      <a href="${unsubUrl}" style="color: #6b7280;">Geen reminders meer ontvangen</a>
    </p>
  </div>
</body>
</html>
  `.trim();

  await transport.sendMail({ from, to: opts.to, subject, html });
}
