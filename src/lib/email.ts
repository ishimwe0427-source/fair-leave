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

function applyTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

function textToHtmlParagraphs(text: string) {
  const cleaned = text.trim();
  if (!cleaned) return "";
  return escapeHtml(cleaned)
    .split(/\n{2,}/)
    .map(
      (block) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#334155">${block.replace(/\n/g, "<br/>")}</p>`,
    )
    .join("");
}

type Brand = {
  company: string;
  product: string;
  color: string;
  logoSrc: string;
  includeLogo: boolean;
  supportEmail: string;
};

async function getBrand(): Promise<Brand> {
  const settings = await getSystemSettings();
  const base = appUrl();
  const logoPath = settings.logoUrl || "/branding/fair-construction-logo.png";
  return {
    company: settings.companyName || COMPANY_NAME,
    product: settings.productName || APP_NAME,
    color: settings.primaryColor || "#d32f2f",
    logoSrc: logoPath.startsWith("http") ? logoPath : `${base}${logoPath}`,
    includeLogo: settings.emailIncludeLogo !== false,
    supportEmail: settings.supportEmail || "support@fairconstruction.rw",
  };
}

function emailLayout(brand: Brand, opts: {
  eyebrow: string;
  title: string;
  titleColor?: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaHref?: string;
  ctaColor?: string;
}) {
  const titleColor = opts.titleColor || brand.color;
  const ctaColor = opts.ctaColor || brand.color;
  const logo = brand.includeLogo
    ? `<tr><td style="padding:28px 32px 8px;text-align:center;background:#0b1220">
         <img src="${brand.logoSrc}" alt="${escapeHtml(brand.company)}" width="160" style="max-height:52px;max-width:180px;object-fit:contain;display:inline-block" />
         <p style="margin:10px 0 0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.55)">${escapeHtml(brand.company)}</p>
       </td></tr>`
    : `<tr><td style="padding:24px 32px 8px;text-align:center;background:#0b1220">
         <p style="margin:0;font-size:18px;font-weight:700;color:#fff;font-family:Georgia,serif">${escapeHtml(brand.product)}</p>
         <p style="margin:6px 0 0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.55)">${escapeHtml(brand.company)}</p>
       </td></tr>`;

  const cta = opts.ctaLabel && opts.ctaHref
    ? `<tr><td style="padding:8px 32px 8px">
         <a href="${opts.ctaHref}" style="display:inline-block;background:${ctaColor};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 22px;border-radius:10px">${escapeHtml(opts.ctaLabel)}</a>
       </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#e8edf3">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#e8edf3;padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 18px 50px rgba(15,23,42,0.12)">
        ${logo}
        <tr><td style="height:4px;background:${brand.color};font-size:0;line-height:0">&nbsp;</td></tr>
        <tr><td style="padding:28px 32px 6px">
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:${brand.color}">${escapeHtml(opts.eyebrow)}</p>
          <h1 style="margin:0 0 18px;font-size:26px;line-height:1.25;color:${titleColor};font-family:Georgia,'Times New Roman',serif">${escapeHtml(opts.title)}</h1>
          ${opts.bodyHtml}
        </td></tr>
        ${cta}
        <tr><td style="padding:20px 32px 28px">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8">
            Sent by ${escapeHtml(brand.product)} for ${escapeHtml(brand.company)}.
            Need help? Contact <a href="mailto:${escapeHtml(brand.supportEmail)}" style="color:${brand.color}">${escapeHtml(brand.supportEmail)}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

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
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      console.info("[FairLeave email] Using Ethereal test SMTP (dev).", {
        user: testAccount.user,
      });
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

    return { ok: true as const, skipped: false as const, preview: preview || undefined };
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
  const brand = await getBrand();
  const loginUrl = `${appUrl()}/login`;
  const message = applyTemplate(settings.emailWelcomeMessage, {
    firstName: input.firstName,
    leaveType: "",
    dates: "",
    days: "",
    comment: "",
    companyName: brand.company,
    productName: brand.product,
  });

  const bodyHtml = `
    ${textToHtmlParagraphs(message)}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px">
      <tr><td style="padding:14px 16px;font-size:13px;color:#64748b">Login email</td>
          <td style="padding:14px 16px;font-size:14px;font-weight:700;color:#0f172a;text-align:right">${escapeHtml(input.email)}</td></tr>
      <tr><td style="padding:14px 16px;border-top:1px solid #e2e8f0;font-size:13px;color:#64748b">Temporary password</td>
          <td style="padding:14px 16px;border-top:1px solid #e2e8f0;font-size:15px;font-weight:700;font-family:Consolas,monospace;color:#0f172a;text-align:right">${escapeHtml(input.tempPassword)}</td></tr>
    </table>
    <p style="margin:0 0 8px;font-size:13px;color:#64748b">For security, change this password in <strong>Settings</strong> right after your first login.</p>
  `;

  return sendEmail({
    to: input.to,
    subject: `Welcome to ${brand.product}, ${input.firstName} — your account is ready`,
    html: emailLayout(brand, {
      eyebrow: "Account created",
      title: `Welcome aboard, ${input.firstName}`,
      bodyHtml,
      ctaLabel: `Sign in to ${brand.product}`,
      ctaHref: loginUrl,
    }),
  });
}

export async function sendPasswordResetEmail(input: {
  to: string;
  firstName: string;
  email: string;
  tempPassword: string;
}) {
  const brand = await getBrand();
  const loginUrl = `${appUrl()}/login`;
  const bodyHtml = `
    <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#334155">Hello <strong>${escapeHtml(input.firstName)}</strong>,</p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#334155">An administrator reset your ${escapeHtml(brand.product)} password. Use the temporary password below, then update it in Settings.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px">
      <tr><td style="padding:14px 16px;font-size:13px;color:#64748b">Login email</td>
          <td style="padding:14px 16px;font-size:14px;font-weight:700;color:#0f172a;text-align:right">${escapeHtml(input.email)}</td></tr>
      <tr><td style="padding:14px 16px;border-top:1px solid #e2e8f0;font-size:13px;color:#64748b">Temporary password</td>
          <td style="padding:14px 16px;border-top:1px solid #e2e8f0;font-size:15px;font-weight:700;font-family:Consolas,monospace;color:#0f172a;text-align:right">${escapeHtml(input.tempPassword)}</td></tr>
    </table>
  `;

  return sendEmail({
    to: input.to,
    subject: `${brand.product} — password reset for ${input.firstName}`,
    html: emailLayout(brand, {
      eyebrow: "Security",
      title: "Your password was reset",
      bodyHtml,
      ctaLabel: "Log in now",
      ctaHref: loginUrl,
    }),
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
  const brand = await getBrand();
  const dates = `${input.startLabel} – ${input.endLabel}`;
  const vars = {
    firstName: input.firstName,
    leaveType: input.leaveType,
    dates,
    days: String(input.days),
    comment: input.comment ? `Note from leadership: ${input.comment}` : "",
    companyName: brand.company,
    productName: brand.product,
  };

  if (input.approved) {
    const message = applyTemplate(settings.emailApprovedMessage, vars);
    return sendEmail({
      to: input.to,
      subject: `Approved — ${input.firstName}, your ${input.leaveType} leave is confirmed`,
      html: emailLayout(brand, {
        eyebrow: "Leave approved",
        title: `Great news, ${input.firstName}`,
        titleColor: "#047857",
        bodyHtml: textToHtmlParagraphs(message),
        ctaLabel: "Open my leave requests",
        ctaHref: `${appUrl()}/requests`,
        ctaColor: "#047857",
      }),
    });
  }

  const message = applyTemplate(settings.emailDeniedMessage, vars);
  return sendEmail({
    to: input.to,
    subject: `Update — ${input.firstName}, your ${input.leaveType} request`,
    html: emailLayout(brand, {
      eyebrow: "Leave decision",
      title: `Hello ${input.firstName}`,
      titleColor: "#b45309",
      bodyHtml: textToHtmlParagraphs(message),
      ctaLabel: "Review on dashboard",
      ctaHref: `${appUrl()}/dashboard`,
    }),
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
  const brand = await getBrand();
  const dates = `${input.startLabel} – ${input.endLabel}`;
  const message = applyTemplate(settings.emailCancelledMessage, {
    firstName: input.firstName,
    leaveType: input.leaveType,
    dates,
    days: String(input.days),
    comment: input.bySelf ? "" : "This cancellation was made by an administrator.",
    companyName: brand.company,
    productName: brand.product,
  });

  return sendEmail({
    to: input.to,
    subject: `Cancelled — ${input.firstName}, your ${input.leaveType} leave`,
    html: emailLayout(brand, {
      eyebrow: "Leave cancelled",
      title: `Hello ${input.firstName}`,
      titleColor: "#b45309",
      bodyHtml: textToHtmlParagraphs(message),
      ctaLabel: "Open my requests",
      ctaHref: `${appUrl()}/requests`,
    }),
  });
}
