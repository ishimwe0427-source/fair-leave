"use client";

import { useActionState } from "react";
import { loginAction, type ActionResult } from "@/lib/actions/auth-actions";

const initial: ActionResult = { ok: false };

export function LoginForm({
  title,
  subtitle,
  csrfToken,
  nextPath = "/dashboard",
}: {
  title?: string;
  subtitle?: string;
  csrfToken: string;
  nextPath?: string;
}) {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <div className="animate-rise w-full max-w-[440px] overflow-hidden rounded-[1.6rem] border border-white/60 bg-white/90 shadow-[0_30px_80px_-40px_rgba(11,18,32,0.55)] backdrop-blur-xl">
      <div className="h-1.5 w-full bg-gradient-to-r from-primary via-[#ef5350] to-[#0b1220]" />
      <div className="p-8 md:p-10">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Secure access
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-[2.35rem]">
            {title || "Sign in"}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {subtitle || "Enterprise leave operations for your workforce."}
          </p>
        </div>

        <form action={action} className="space-y-5" autoComplete="on">
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <input type="hidden" name="next" value={nextPath} />
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Email</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="username"
              spellCheck={false}
              placeholder="you@company.com"
              className="w-full px-3.5 py-3.5"
            />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Password</span>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full px-3.5 py-3.5"
            />
          </label>

          {state.error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {state.error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="btn-primary w-full !py-3.5 disabled:opacity-60"
          >
            {pending ? "Signing in..." : "Sign in securely"}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
          Protected session · CSRF · lockout after failed attempts · 12h expiry
        </p>
      </div>
    </div>
  );
}
