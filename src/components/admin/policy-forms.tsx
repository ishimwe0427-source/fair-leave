"use client";

import { useActionState, useTransition } from "react";
import {
  createBlackoutAction,
  createHolidayAction,
  deleteBlackoutAction,
  deleteHolidayAction,
  toggleDepartmentAction,
  upsertLeaveTypeAction,
  type ActionResult,
} from "@/lib/actions/admin-policy-actions";

const initial: ActionResult = { ok: false };

export function LeaveTypeForm() {
  const [state, action, pending] = useActionState(upsertLeaveTypeAction, initial);
  return (
    <form action={action} className="space-y-3 rounded-xl border border-border bg-canvas p-4">
      <p className="text-sm font-semibold">Add / update leave type + policy</p>
      <div className="grid gap-2 md:grid-cols-2">
        <input name="name" required placeholder="Name" className="rounded-lg border px-3 py-2 text-sm" />
        <input name="code" required placeholder="CODE" className="rounded-lg border px-3 py-2 text-sm uppercase" />
        <input name="color" type="color" defaultValue="#d32f2f" className="h-10 w-full rounded-lg border" />
        <input name="country" defaultValue="RW" className="rounded-lg border px-3 py-2 text-sm" />
        <input name="entitlementDays" type="number" step="0.5" defaultValue={21} className="rounded-lg border px-3 py-2 text-sm" />
        <input name="carryOverMax" type="number" step="0.5" defaultValue={5} className="rounded-lg border px-3 py-2 text-sm" />
        <input name="minNoticeDays" type="number" defaultValue={7} className="rounded-lg border px-3 py-2 text-sm" />
        <select name="eligibleGender" defaultValue="ALL" className="rounded-lg border px-3 py-2 text-sm">
          <option value="ALL">All genders</option>
          <option value="FEMALE">Female only (maternity)</option>
          <option value="MALE">Male only (paternity)</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-4 text-xs">
        <label className="inline-flex items-center gap-1"><input type="checkbox" name="paid" defaultChecked /> Paid</label>
        <label className="inline-flex items-center gap-1"><input type="checkbox" name="requiresDoc" /> Docs required</label>
        <label className="inline-flex items-center gap-1"><input type="checkbox" name="allowHalfDay" defaultChecked /> Half-day</label>
      </div>
      {state.error ? <p className="text-xs text-red-700">{state.error}</p> : null}
      {state.ok ? <p className="text-xs text-emerald-700">{state.message}</p> : null}
      <button type="submit" disabled={pending} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white">
        {pending ? "Saving..." : "Save leave type"}
      </button>
    </form>
  );
}

export function HolidayForm() {
  const [state, action, pending] = useActionState(createHolidayAction, initial);
  return (
    <form action={action} className="mt-3 grid gap-2 md:grid-cols-4">
      <input name="name" required placeholder="Holiday name" className="rounded-lg border px-3 py-2 text-sm md:col-span-2" />
      <input name="date" type="date" required className="rounded-lg border px-3 py-2 text-sm" />
      <input name="country" defaultValue="RW" className="rounded-lg border px-3 py-2 text-sm" />
      <button type="submit" disabled={pending} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white md:col-span-4">
        {pending ? "Adding..." : "Add holiday"}
      </button>
      {state.error ? <p className="text-xs text-red-700 md:col-span-4">{state.error}</p> : null}
    </form>
  );
}

export function BlackoutForm() {
  const [state, action, pending] = useActionState(createBlackoutAction, initial);
  return (
    <form action={action} className="mt-3 grid gap-2 md:grid-cols-2">
      <input name="name" required placeholder="Blackout name" className="rounded-lg border px-3 py-2 text-sm" />
      <input name="reason" placeholder="Reason" className="rounded-lg border px-3 py-2 text-sm" />
      <input name="startDate" type="date" required className="rounded-lg border px-3 py-2 text-sm" />
      <input name="endDate" type="date" required className="rounded-lg border px-3 py-2 text-sm" />
      <button type="submit" disabled={pending} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white md:col-span-2">
        {pending ? "Adding..." : "Add blackout"}
      </button>
      {state.error ? <p className="text-xs text-red-700 md:col-span-2">{state.error}</p> : null}
    </form>
  );
}

export function DeleteHolidayButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => { await deleteHolidayAction(id); })}
      className="text-xs font-semibold text-red-700"
    >
      Remove
    </button>
  );
}

export function DeleteBlackoutButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => { await deleteBlackoutAction(id); })}
      className="text-xs font-semibold text-red-700"
    >
      Remove
    </button>
  );
}

export function ToggleDepartmentButton({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => { await toggleDepartmentAction(id); })}
      className="text-xs font-semibold text-primary"
    >
      {active ? "Deactivate" : "Activate"}
    </button>
  );
}
