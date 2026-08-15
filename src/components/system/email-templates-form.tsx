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
    emailApprovedMessage: string;
    emailDeniedMessage: string;
    emailCancelledMessage: string;
    logoUrl: string;
    companyName: string;
  };
}) {
  const [state, action, pending] = useActionState(updateEmailTemplatesAction, initial);

  return (
    <form action={action} className="space-y-5 rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div>
        <h2 className="font-display text-xl font-semibold">Email messages</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Customize what employees receive when leave is approved, denied, or cancelled.
          Company logo from Branding is included when enabled. Placeholders:{" "}
          <code className="text-xs">{"{{firstName}}"}</code>{" "}
          <code className="text-xs">{"{{leaveType}}"}</code>{" "}
          <code className="text-xs">{"{{dates}}"}</code>{" "}
          <code className="text-xs">{"{{days}}"}</code>{" "}
          <code className="text-xs">{"{{comment}}"}</code>{" "}
          <code className="text-xs">{"{{companyName}}"}</code>
        </p>
      </div>

      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="emailIncludeLogo"
          defaultChecked={settings.emailIncludeLogo}
          className="accent-[var(--primary)]"
        />
        Show company logo / picture at the top of emails
      </label>

      <div className="rounded-xl bg-canvas p-3">
        <p className="text-xs font-medium text-muted-foreground">Current logo used in emails</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={settings.logoUrl}
          alt={settings.companyName}
          className="mt-2 h-12 w-auto object-contain"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Change the logo under Branding (System Studio) or upload there first.
        </p>
      </div>

      <label className="block space-y-2 text-sm">
        <span className="font-medium">Approved leave message</span>
        <textarea
          name="emailApprovedMessage"
          rows={5}
          required
          defaultValue={settings.emailApprovedMessage}
          className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5"
        />
      </label>

      <label className="block space-y-2 text-sm">
        <span className="font-medium">Denied / not approved message</span>
        <textarea
          name="emailDeniedMessage"
          rows={5}
          required
          defaultValue={settings.emailDeniedMessage}
          className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5"
        />
      </label>

      <label className="block space-y-2 text-sm">
        <span className="font-medium">Cancelled leave message</span>
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
    </form>
  );
}
