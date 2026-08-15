"use client";

import { useActionState } from "react";
import {
  updateEmailTemplatesAction,
  type ActionResult,
} from "@/lib/actions/system-actions";

const initial: ActionResult = { ok: false };

export function EmailTemplatesForm({
  settings,
}: {
  settings: {
    emailIncludeLogo: boolean;
    emailWelcomeMessage: string;
    emailApprovedMessage: string;
    emailDeniedMessage: string;
    emailCancelledMessage: string;
    logoUrl: string;
    companyName: string;
  };
}) {
  const [state, action, pending] = useActionState(updateEmailTemplatesAction, initial);

  return (
    <form
      action={action}
      className="space-y-5 overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
    >
      <div className="border-b border-border bg-gradient-to-r from-[#0b1220] to-[#1e293b] px-6 py-5 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-300">
          Client emails
        </p>
        <h2 className="mt-1 font-display text-xl font-semibold">Email messages</h2>
        <p className="mt-1 max-w-2xl text-sm text-white/70">
          Polished templates are ready. Edit the wording below — company logo, recipient name,
          and branding stay automatic.
        </p>
      </div>

      <div className="space-y-5 px-6 pb-6">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="emailIncludeLogo"
            defaultChecked={settings.emailIncludeLogo}
            className="accent-[var(--primary)]"
          />
          Show company logo / picture at the top of every email
        </label>

        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-canvas p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={settings.logoUrl}
            alt={settings.companyName}
            className="h-12 w-auto object-contain"
          />
          <div>
            <p className="text-sm font-semibold">{settings.companyName}</p>
            <p className="text-xs text-muted-foreground">
              Change logo in System Studio → Branding
            </p>
          </div>
        </div>

        <p className="rounded-xl border border-primary/20 bg-accent/60 px-3 py-2 text-xs text-accent-foreground">
          Placeholders you can keep or move:{" "}
          <code>{"{{firstName}}"}</code> <code>{"{{companyName}}"}</code>{" "}
          <code>{"{{leaveType}}"}</code> <code>{"{{dates}}"}</code>{" "}
          <code>{"{{days}}"}</code> <code>{"{{comment}}"}</code>
        </p>

        <label className="block space-y-2 text-sm">
          <span className="font-medium">New user welcome message</span>
          <textarea
            name="emailWelcomeMessage"
            rows={5}
            required
            defaultValue={settings.emailWelcomeMessage}
            className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5"
          />
        </label>

        <label className="block space-y-2 text-sm">
          <span className="font-medium">Leave approved message</span>
          <textarea
            name="emailApprovedMessage"
            rows={6}
            required
            defaultValue={settings.emailApprovedMessage}
            className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5"
          />
        </label>

        <label className="block space-y-2 text-sm">
          <span className="font-medium">Leave denied message</span>
          <textarea
            name="emailDeniedMessage"
            rows={6}
            required
            defaultValue={settings.emailDeniedMessage}
            className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5"
          />
        </label>

        <label className="block space-y-2 text-sm">
          <span className="font-medium">Leave cancelled message</span>
          <textarea
            name="emailCancelledMessage"
            rows={4}
            required
            defaultValue={settings.emailCancelledMessage}
            className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5"
          />
        </label>

        {state.error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        ) : null}
        {state.ok ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {state.message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save email messages"}
        </button>
      </div>
    </form>
  );
}
