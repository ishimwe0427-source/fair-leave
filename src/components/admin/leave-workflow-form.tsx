"use client";

import { useActionState } from "react";
import {
  updateLeaveWorkflowAction,
  type ActionResult,
} from "@/lib/actions/org-actions";

const initial: ActionResult = { ok: false };

export function LeaveWorkflowForm({
  requireManagerApproval,
}: {
  requireManagerApproval: boolean;
}) {
  const [state, action, pending] = useActionState(updateLeaveWorkflowAction, initial);

  return (
    <form action={action} className="space-y-3 rounded-xl border border-border bg-canvas p-4">
      <div>
        <h3 className="font-display text-base font-semibold">Leave approval path</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Default: Employee → HR → MD/GM. Optionally require the line manager to review first.
        </p>
      </div>
      <label className="inline-flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="requireManagerApproval"
          defaultChecked={requireManagerApproval}
          className="mt-1"
        />
        <span>
          Manager first review (when the employee has a line manager set). Without a manager,
          the request still goes to HR.
        </span>
      </label>
      {state.error ? <p className="text-sm text-red-700">{state.error}</p> : null}
      {state.ok ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save workflow"}
      </button>
    </form>
  );
}
