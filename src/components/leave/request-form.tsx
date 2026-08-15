"use client";

import { useActionState, useMemo, useState } from "react";
import { LeaveType } from "@prisma/client";
import { createLeaveRequestAction, type ActionResult } from "@/lib/actions/leave-actions";

const initial: ActionResult = { ok: false };

export function RequestForm({ leaveTypes }: { leaveTypes: LeaveType[] }) {
  const [state, action, pending] = useActionState(createLeaveRequestAction, initial);
  const [leaveTypeId, setLeaveTypeId] = useState(leaveTypes[0]?.id || "");

  const selectedType = useMemo(
    () => leaveTypes.find((t) => t.id === leaveTypeId),
    [leaveTypeId, leaveTypes],
  );

  return (
    <form
      action={action}
      className="animate-rise app-panel space-y-5 p-6 md:p-8"
    >
      <div>
        <h2 className="font-display text-xl font-semibold">New leave request</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Working days exclude weekends and public holidays for your country.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2 text-sm">
          <span className="font-medium">Leave type</span>
          <select
            name="leaveTypeId"
            required
            value={leaveTypeId}
            onChange={(e) => setLeaveTypeId(e.target.value)}
            className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 outline-none ring-primary focus:ring-2"
          >
            {leaveTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
                {type.requiresDoc ? " (docs required)" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" name="halfDay" className="h-4 w-4 accent-[var(--primary)]" />
          <span>Half-day request</span>
        </label>

        <label className="block space-y-2 text-sm">
          <span className="font-medium">Start date</span>
          <input
            type="date"
            name="startDate"
            required
            className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 outline-none ring-primary focus:ring-2"
          />
        </label>

        <label className="block space-y-2 text-sm">
          <span className="font-medium">End date</span>
          <input
            type="date"
            name="endDate"
            required
            className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 outline-none ring-primary focus:ring-2"
          />
        </label>
      </div>

      <label className="block space-y-2 text-sm">
        <span className="font-medium">Reason</span>
        <textarea
          name="reason"
          required
          rows={4}
          placeholder="Share context for HR and leadership..."
          className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 outline-none ring-primary focus:ring-2"
        />
      </label>

      <label className="block space-y-2 text-sm">
        <span className="font-medium">
          Late request explanation (required if start date already passed)
        </span>
        <textarea
          name="lateComment"
          rows={2}
          placeholder="If the leave start date is today or earlier, explain why it was not requested in advance..."
          className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 outline-none ring-primary focus:ring-2"
        />
      </label>

      {selectedType?.requiresDoc ? (
        <label className="block space-y-2 text-sm">
          <span className="font-medium">Supporting document</span>
          <input
            type="file"
            name="attachment"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            required
            className="block w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm"
          />
          <span className="text-xs text-muted-foreground">
            Required for {selectedType.name}. PDF or image, max 5MB.
          </span>
        </label>
      ) : null}

      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      {state.ok && state.message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {state.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Submitting..." : "Submit request"}
      </button>
    </form>
  );
}
