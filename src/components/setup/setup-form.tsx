"use client";

import { useActionState } from "react";
import {
  completeSetupAction,
  type SetupResult,
} from "@/lib/actions/setup-actions";

const initial: SetupResult = { ok: false };

export function SetupForm({ csrfToken }: { csrfToken: string }) {
  const [state, action, pending] = useActionState(completeSetupAction, initial);

  return (
    <form action={action} className="animate-rise w-full max-w-xl space-y-5 rounded-3xl border border-border bg-white/95 p-8 shadow-xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          First-time setup
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          Launch FairLeave
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your company profile and the Super Admin account. This is a one-time step.
        </p>
      </div>

      <input type="hidden" name="csrfToken" value={csrfToken} />

      <div className="grid gap-4 md:grid-cols-2">
        <Field name="companyName" label="Company name" defaultValue="Fair Construction Ltd" />
        <Field name="productName" label="Product name" defaultValue="FairLeave" />
        <Field
          name="supportEmail"
          label="Support email"
          type="email"
          defaultValue="support@fairconstruction.rw"
        />
        <Field name="firstName" label="Admin first name" />
        <Field name="lastName" label="Admin last name" />
        <Field name="email" label="Admin email" type="email" autoComplete="username" />
      </div>

      <label className="block space-y-2 text-sm md:col-span-2">
        <span className="font-medium">Admin password</span>
        <input
          name="password"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 outline-none ring-primary focus:ring-2"
        />
        <span className="text-xs text-muted-foreground">
          At least 10 characters, with upper, lower, number, and special character.
        </span>
      </label>

      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Creating workspace..." : "Complete setup & enter System Studio"}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  autoComplete,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 outline-none ring-primary focus:ring-2"
      />
    </label>
  );
}
