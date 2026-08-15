import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { APP_NAME, COMPANY_NAME } from "@/lib/constants";
import { getSystemSettings } from "@/lib/system";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

let cachedTransport: Transporter | null | undefined;
let etherealUser: string | null = null;

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3010").replace(
    /\/$/,
    "",
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function applyTemplate(
  template: string,
  vars: Record<string, string>,
) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

function textToHtmlParagraphs(text: string) {
  return escapeHtml(text)
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 12px">${block.replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

async function brandedShell(innerHtml: string, headingColor = "#d32f2f") {
  const settings = await getSystemSettings();
  const base = appUrl();
  const logoPath = settings.logoUrl || "/branding/fair-construction-logo.png";
  const logoSrc = logoPath.startsWith("http") ? logoPath : `${base}${logoPath}`;
  const company = settings.companyName || COMPANY_NAME;
  const product = settings.productName || APP_NAME;
  const color = settings.primaryColor || headingColor;

  const logoBlock =
    settings.emailIncludeLogo !== false
      ? `<div style="text-align:left;margin-bottom:20px">
           <img src="${logoSrc}" alt="${escapeHtml(company)}" style="max-height:56px;max-width:220px;object-fit:contain" />
           <p style="margin:8px 0 0;font-size:12px;color:#6b7280;letter-spacing:0.04em;text-transform:uppercase">${escapeHtml(company)}</p>
         </div>`
      : `<p style="margin:0 0 16px;font-size:12px;color:#6b7280;letter-spacing:0.04em;text-transform:uppercase">${escapeHtml(company)} · ${escapeHtml(product)}</p>`;

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;max-width:560px;margin:0 auto;padding:8px">
      ${logoBlock}
      <div style="border-top:3px solid ${color};padding-top:16px">
        ${innerHtml}
      </div>
      <p style="margin-top:28px;font-size:12px;color:#9ca3af">${escapeHtml(product)} · ${escapeHtml(company)}</p>
    </div>
  `;
}

/** Real SMTP credentials present (inbox delivery). */
export function isEmailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_FROM &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS,
  );
}

async function getTransport(): Promise<Transporter | null> {
  if (cachedTransport !== undefined) return cachedTransport;

  if (isEmailConfigured()) {
    cachedTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return cachedTransport;
  }

  if (process.env.NODE_ENV !== "production") {
    try {
      const testAccount = await nodemailer.createTestAccount();
      etherealUser = testAccount.user;
      cachedTransport = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.info(
        "[FairLeave email] Using Ethereal test SMTP (dev). Messages are not delivered to real inboxes — open the preview URL logged after each send.",
        { user: testAccount.user },
      );
      return cachedTransport;
    } catch (error) {
      console.warn("[FairLeave email] Ethereal setup failed:", error);
      cachedTransport = null;
      return null;
    }
  }

  cachedTransport = null;
  return null;
}

export async function sendEmail(input: SendEmailInput) {
  try {
    const transport = await getTransport();
    if (!transport) {
      console.info("[FairLeave email skipped — configure SMTP_* in .env]", {
        to: input.to,
        subject: input.subject,
      });
      return { ok: false as const, skipped: true as const };
    }

    const info = await transport.sendMail({
      from:
        process.env.SMTP_FROM ||
        `FairLeave <${etherealUser || "noreply@fairleave.local"}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text || input.html.replace(/<[^>]+>/g, " "),
    });

    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) {
      console.info("[FairLeave email preview]", {
        to: input.to,
        subject: input.subject,
        preview,
      });
    } else {
      console.info("[FairLeave email sent]", {
        to: input.to,
        subject: input.subject,
        messageId: info.messageId,
      });
    }

    return {
      ok: true as const,
      skipped: false as const,
      preview: preview || undefined,
    };
  } catch (error) {
    console.error("[FairLeave email failed]", {
      to: input.to,
      subject: input.subject,
      error: error instanceof Error ? error.message : error,
    });
    return { ok: false as const, skipped: false as const, error: true as const };
  }
}

export async function sendWelcomeAccountEmail(input: {
  to: string;
  firstName: string;
  email: string;
  tempPassword: string;
}) {
  const settings = await getSystemSettings();
  const product = settings.productName || APP_NAME;
  const company = settings.companyName || COMPANY_NAME;
  const loginUrl = `${appUrl()}/login`;
  const settingsUrl = `${appUrl()}/settings`;
  const color = settings.primaryColor || "#d32f2f";

  const inner = `
    <h2 style="color:${color};margin:0 0 8px">Hello ${escapeHtml(input.firstName)}, your account is ready</h2>
    <p>Your <strong>${escapeHtml(product)}</strong> leave account at <strong>${escapeHtml(company)}</strong> has been created.</p>
    <p>You can sign in with the details below, then set a new password for security.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f8fafc;border-radius:8px">
      <tr><td style="padding:10px 14px"><strong>Login email</strong></td><td style="padding:10px 14px">${escapeHtml(input.email)}</td></tr>
      <tr><td style="padding:10px 14px"><strong>Temporary password</strong></td><td style="padding:10px 14px;font-family:monospace">${escapeHtml(input.tempPassword)}</td></tr>
    </table>
    <p>
      <a href="${loginUrl}" style="background:${color};color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">
        Log in to ${escapeHtml(product)}
      </a>
    </p>
    <p style="margin-top:16px"><strong>After you log in:</strong> open
      <a href="${settingsUrl}">Settings</a> and change this temporary password to one only you know.
    </p>
    <p style="color:#6b7280;font-size:13px">If you did not expect this email, contact your HR administrator.</p>
  `;

  return sendEmail({
    to: input.to,
    subject: `Your ${product} account has been created`,
    html: await brandedShell(inner, color),
  });
}

export async function sendPasswordResetEmail(input: {
  to: string;
  firstName: string;
  email: string;
  tempPassword: string;
}) {
  const settings = await getSystemSettings();
  const product = settings.productName || APP_NAME;
  const color = settings.primaryColor || "#d32f2f";
  const loginUrl = `${appUrl()}/login`;
  const settingsUrl = `${appUrl()}/settings`;

  const inner = `
    <h2 style="color:${color};margin:0 0 8px">Hello ${escapeHtml(input.firstName)},</h2>
    <p>An administrator reset your <strong>${escapeHtml(product)}</strong> password.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f8fafc;border-radius:8px">
      <tr><td style="padding:10px 14px"><strong>Login email</strong></td><td style="padding:10px 14px">${escapeHtml(input.email)}</td></tr>
      <tr><td style="padding:10px 14px"><strong>New temporary password</strong></td><td style="padding:10px 14px;font-family:monospace">${escapeHtml(input.tempPassword)}</td></tr>
    </table>
    <p>
      <a href="${loginUrl}" style="background:${color};color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">
        Log in now
      </a>
    </p>
    <p style="margin-top:16px">After signing in, go to
      <a href="${settingsUrl}">Settings</a> and change this temporary password immediately.
    </p>
  `;

  return sendEmail({
    to: input.to,
    subject: `${product} — your password was reset`,
    html: await brandedShell(inner, color),
  });
}

export async function sendLeaveDecisionEmail(input: {
  to: string;
  firstName: string;
  leaveType: string;
  startLabel: string;
  endLabel: string;
  days: number;
  approved: boolean;
  comment?: string | null;
}) {
  const settings = await getSystemSettings();
  const product = settings.productName || APP_NAME;
  const company = settings.companyName || COMPANY_NAME;
  const dashboardUrl = `${appUrl()}/dashboard`;
  const requestsUrl = `${appUrl()}/requests`;
  const dates = `${input.startLabel} – ${input.endLabel}`;
  const commentLine = input.comment
    ? `Note: ${input.comment}`
    : "";

  const vars = {
    firstName: input.firstName,
    leaveType: input.leaveType,
    dates,
    days: String(input.days),
    comment: commentLine,
    companyName: company,
    productName: product,
  };

  if (input.approved) {
    const message = applyTemplate(settings.emailApprovedMessage, vars);
    const color = "#047857";
    const inner = `
      <h2 style="color:${color};margin:0 0 8px">Great news, ${escapeHtml(input.firstName)}!</h2>
      ${textToHtmlParagraphs(message)}
      <p>This result is also on your <a href="${dashboardUrl}">dashboard notifications</a>.</p>
      <p>
        <a href="${requestsUrl}" style="background:${color};color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">
          View my leave requests
        </a>
      </p>
    `;
    return sendEmail({
      to: input.to,
      subject: `Good news — your ${input.leaveType} leave was approved`,
      html: await brandedShell(inner, color),
    });
  }

  const message = applyTemplate(settings.emailDeniedMessage, vars);
  const color = "#b45309";
  const inner = `
    <h2 style="color:${color};margin:0 0 8px">Hello ${escapeHtml(input.firstName)},</h2>
    ${textToHtmlParagraphs(message)}
    <p>This decision is also shown on your <a href="${dashboardUrl}">dashboard</a>.</p>
    <p>
      <a href="${requestsUrl}" style="background:${settings.primaryColor || "#d32f2f"};color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">
        Review the decision
      </a>
    </p>
  `;
  return sendEmail({
    to: input.to,
    subject: `Update on your ${input.leaveType} leave request`,
    html: await brandedShell(inner, color),
  });
}

export async function sendLeaveCancelledEmail(input: {
  to: string;
  firstName: string;
  leaveType: string;
  startLabel: string;
  endLabel: string;
  days: number;
  bySelf: boolean;
}) {
  const settings = await getSystemSettings();
  const product = settings.productName || APP_NAME;
  const company = settings.companyName || COMPANY_NAME;
  const dashboardUrl = `${appUrl()}/dashboard`;
  const dates = `${input.startLabel} – ${input.endLabel}`;
  const message = applyTemplate(settings.emailCancelledMessage, {
    firstName: input.firstName,
    leaveType: input.leaveType,
    dates,
    days: String(input.days),
    comment: input.bySelf ? "" : "Cancelled by an administrator.",
    companyName: company,
    productName: product,
  });
  const color = "#b45309";
  const inner = `
    <h2 style="color:${color};margin:0 0 8px">Hello ${escapeHtml(input.firstName)},</h2>
    ${textToHtmlParagraphs(message)}
    <p>You can also see this on your <a href="${dashboardUrl}">dashboard</a>.</p>
    <p><a href="${appUrl()}/requests">Open my requests</a></p>
  `;
  return sendEmail({
    to: input.to,
    subject: `Your ${input.leaveType} leave was cancelled`,
    html: await brandedShell(inner, color),
  });
}
