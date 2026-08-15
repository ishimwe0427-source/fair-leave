"use client";

import { useActionState, useTransition } from "react";
import {
  changeOwnPasswordAction,
  type ActionResult,
} from "@/lib/actions/user-actions";
import { logoutEverywhereAction } from "@/lib/actions/auth-actions";

const initial: ActionResult = { ok: false };

export function PasswordForm({ force }: { force?: boolean }) {
  const [state, action, pending] = useActionState(changeOwnPasswordAction, initial);
  const [logoutPending, startLogout] = useTransition();

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4 rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div>
          <h2 className="font-display text-xl font-semibold">
            {force ? "Set a new password" : "Change password"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {force
              ? "You signed in with a temporary password. Choose a strong permanent one now."
              : "Use a strong password. Changing it signs out other devices."}
          </p>
        </div>
        <label className="block space-y-2 text-sm">
          <span className="font-medium">Current password</span>
          <input
            type="password"
            name="currentPassword"
            required
            autoComplete="current-password"
            className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5"
          />
        </label>
        <label className="block space-y-2 text-sm">
          <span className="font-medium">New password</span>
          <input
            type="password"
            name="newPassword"
            required
            minLength={10}
            autoComplete="new-password"
            className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5"
          />
          <span className="text-xs text-muted-foreground">
            Min 10 chars · upper · lower · number · special character
          </span>
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
          {pending ? "Updating..." : "Update password"}
        </button>
      </form>

      {!force ? (
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold">Sessions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign out of this browser, or revoke every active session everywhere.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={logoutPending}
              onClick={() =>
                startLogout(async () => {
                  await logoutEverywhereAction();
                })
              }
              className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              {logoutPending ? "Signing out..." : "Sign out everywhere"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
