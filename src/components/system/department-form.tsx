"use client";

import { useActionState } from "react";
import {
  createDepartmentAction,
  type ActionResult,
} from "@/lib/actions/system-actions";

const initial: ActionResult = { ok: false };

export function DepartmentForm() {
  const [state, action, pending] = useActionState(createDepartmentAction, initial);

  return (
    <form action={action} className="space-y-3 rounded-2xl border border-border bg-white p-5 shadow-sm">
      <h2 className="font-display text-lg font-semibold">3. Add department</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <input
          name="name"
          required
          placeholder="Department name"
          className="rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm"
        />
        <input
          name="code"
          required
          placeholder="CODE"
          className="rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm uppercase"
        />
      </div>
      {state.error ? <p className="text-sm text-red-700">{state.error}</p> : null}
      {state.ok ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving..." : "Create department"}
      </button>
    </form>
  );
}
