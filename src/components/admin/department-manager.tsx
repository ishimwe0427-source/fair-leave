"use client";

import { useActionState, useTransition } from "react";
import {
  createDepartmentAction,
  type ActionResult,
} from "@/lib/actions/system-actions";
import {
  deleteDepartmentAction,
  updateDepartmentAction,
} from "@/lib/actions/org-actions";
import { toggleDepartmentAction } from "@/lib/actions/admin-policy-actions";

const initial: ActionResult = { ok: false };

type Dept = {
  id: string;
  name: string;
  code: string;
  active: boolean;
};

export function DepartmentManager({ departments }: { departments: Dept[] }) {
  const [createState, createAction, creating] = useActionState(
    createDepartmentAction,
    initial,
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-base font-semibold">Departments</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Create, rename, activate/deactivate, or remove departments (remove only when empty).
        </p>
      </div>

      <div className="space-y-3">
        {departments.map((dept) => (
          <DepartmentRow key={dept.id} dept={dept} />
        ))}
      </div>

      <form action={createAction} className="space-y-3 rounded-xl border border-dashed border-border p-4">
        <p className="text-sm font-medium">Add department</p>
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
        {createState.error ? <p className="text-sm text-red-700">{createState.error}</p> : null}
        {createState.ok ? <p className="text-sm text-emerald-700">{createState.message}</p> : null}
        <button
          type="submit"
          disabled={creating}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {creating ? "Saving..." : "Create department"}
        </button>
      </form>
    </div>
  );
}

function DepartmentRow({ dept }: { dept: Dept }) {
  const [state, action, pending] = useActionState(updateDepartmentAction, initial);
  const [busy, start] = useTransition();

  return (
    <form action={action} className="rounded-xl bg-canvas px-3 py-3">
      <input type="hidden" name="id" value={dept.id} />
      <div className="grid gap-2 md:grid-cols-[1.4fr_0.8fr_auto] md:items-center">
        <input
          name="name"
          required
          defaultValue={dept.name}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
        />
        <input
          name="code"
          required
          defaultValue={dept.code}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm uppercase"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={pending}
            className="text-xs font-semibold text-primary disabled:opacity-60"
          >
            {pending ? "..." : "Save"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => start(async () => { await toggleDepartmentAction(dept.id); })}
            className="text-xs font-semibold text-muted-foreground"
          >
            {dept.active ? "Deactivate" : "Activate"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              start(async () => {
                const res = await deleteDepartmentAction(dept.id);
                if (!res.ok && res.error) window.alert(res.error);
              })
            }
            className="text-xs font-semibold text-red-700"
          >
            Remove
          </button>
        </div>
      </div>
      {!dept.active ? (
        <p className="mt-1 text-xs text-muted-foreground">Inactive — hidden from new user forms</p>
      ) : null}
      {state.error ? <p className="mt-1 text-xs text-red-700">{state.error}</p> : null}
      {state.ok ? <p className="mt-1 text-xs text-emerald-700">{state.message}</p> : null}
    </form>
  );
}
