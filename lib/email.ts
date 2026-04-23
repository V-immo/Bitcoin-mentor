import nodemailer from "nodemailer";

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const pass = process.env.SMTP_PASS;
  if (!pass) return false; // geen email config — stil skippen

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass },
  });

  try {
    await transporter.sendMail({
      from: `"Bitcoin Mentor" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch {
    return false;
  }
}
