/**
 * Quick SMTP connectivity check — does not print the password.
 *   npx tsx scripts/test-smtp.ts
 */
import nodemailer from "nodemailer";

async function main() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const from = process.env.SMTP_FROM || `FairLeave <${user}>`;

  if (!user || !pass) {
    console.error("Missing SMTP_USER or SMTP_PASS in environment / .env");
    process.exit(1);
  }

  console.log(`Testing SMTP as ${user} via ${host}:${port}...`);

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });

  await transport.verify();
  console.log("SMTP verify OK — sending test message...");

  const info = await transport.sendMail({
    from,
    to: user,
    subject: "FairLeave SMTP test — success",
    text: "If you received this, FairLeave can send welcome and leave decision emails.",
    html: `<p>If you received this, <strong>FairLeave</strong> can send welcome and leave decision emails.</p>`,
  });

  console.log("Test email sent. messageId:", info.messageId);
  console.log(`Check inbox (and spam) for: ${user}`);
}

main().catch((err) => {
  console.error("SMTP test failed:");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
