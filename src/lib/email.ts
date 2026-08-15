import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { APP_NAME, COMPANY_NAME } from "@/lib/constants";

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

  // Dev fallback: Ethereal test inbox (preview URL logged to console)
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
  const loginUrl = `${appUrl()}/login`;
  const settingsUrl = `${appUrl()}/settings?forcePassword=1`;
  return sendEmail({
    to: input.to,
    subject: `Welcome to ${APP_NAME} — your account is ready`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
        <h2 style="color:#d32f2f;margin-bottom:8px">Welcome aboard, ${input.firstName}!</h2>
        <p>Your ${APP_NAME} leave account at <strong>${COMPANY_NAME}</strong> has been created.</p>
        <p>You can now request leave, track balances, and stay aligned with your team.</p>
        <p><strong>Login email:</strong> ${input.email}<br/>
        <strong>Temporary password:</strong> ${input.tempPassword}</p>
        <p>For your security, please sign in and change this temporary password to a strong password you choose.</p>
        <p>
          <a href="${loginUrl}" style="background:#d32f2f;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block">Sign in to ${APP_NAME}</a>
        </p>
        <p style="margin-top:12px">
          After signing in, open <a href="${settingsUrl}">Settings</a> to update your password.
        </p>
        <p style="color:#6b7280;font-size:13px">If you did not expect this email, contact your HR administrator.</p>
      </div>
    `,
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
  if (input.approved) {
    return sendEmail({
      to: input.to,
      subject: `Good news — your ${input.leaveType} leave was approved`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
          <h2 style="color:#047857;margin-bottom:8px">Great news, ${input.firstName}!</h2>
          <p>Your request for <strong>${input.leaveType}</strong> has been <strong>fully approved</strong>.</p>
          <p>
            <strong>Dates:</strong> ${input.startLabel} – ${input.endLabel}<br/>
            <strong>Days:</strong> ${input.days}
          </p>
          ${input.comment ? `<p><strong>Note from leadership:</strong> ${input.comment}</p>` : ""}
          <p>Take the rest you need — we’ve got coverage planning handled. Enjoy your time away, and come back refreshed.</p>
          <p><a href="${appUrl()}/requests">View your requests in ${APP_NAME}</a></p>
        </div>
      `,
    });
  }

  return sendEmail({
    to: input.to,
    subject: `Update on your ${input.leaveType} leave request`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
        <h2 style="color:#b45309;margin-bottom:8px">Hello ${input.firstName},</h2>
        <p>Thank you for submitting your leave request. After careful review, your
        <strong>${input.leaveType}</strong> request for <strong>${input.startLabel} – ${input.endLabel}</strong>
        (${input.days} day(s)) was <strong>not approved</strong>.</p>
        ${input.comment ? `<p><strong>Reason / note:</strong> ${input.comment}</p>` : ""}
        <p>We know this may be disappointing. Please speak with HR if you need help adjusting dates or understanding coverage constraints — we’re here to support you.</p>
        <p><a href="${appUrl()}/requests">Review the decision in ${APP_NAME}</a></p>
      </div>
    `,
  });
}
