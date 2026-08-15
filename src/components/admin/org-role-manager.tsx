"use client";

import { useActionState, useTransition } from "react";
import { Role } from "@prisma/client";
import {
  createOrgRoleAction,
  deleteOrgRoleAction,
  toggleOrgRoleAction,
  updateOrgRoleAction,
  type ActionResult,
} from "@/lib/actions/org-actions";
import { ROLE_LABELS } from "@/lib/roles";

const initial: ActionResult = { ok: false };

type OrgRoleRow = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  active: boolean;
  isSystem: boolean;
  baseRole: Role;
  _count?: { users: number };
};

const BASE_OPTIONS: Role[] = [
  "EMPLOYEE",
  "MANAGER",
  "HR",
  "HR_ADMIN",
  "ADMIN",
  "MD",
  "GM",
  "SUPER_ADMIN",
];

export function OrgRoleManager({
  roles,
  assignableBaseRoles,
}: {
  roles: OrgRoleRow[];
  assignableBaseRoles: Role[];
}) {
  const [createState, createAction, creating] = useActionState(
    createOrgRoleAction,
    initial,
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-base font-semibold">User roles</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Create custom roles, rename labels, or remove unused custom roles. Each role maps to
          permission level (Employee, Manager, HR, MD, GM, Super Admin) for leave approvals.
        </p>
      </div>

      <div className="space-y-3">
        {roles.map((role) => (
          <RoleRow
            key={role.id}
            role={role}
            assignableBaseRoles={assignableBaseRoles}
          />
        ))}
      </div>

      <form action={createAction} className="space-y-3 rounded-xl border border-dashed border-border p-4">
        <p className="text-sm font-medium">Create custom role</p>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            name="name"
            required
            placeholder="Role name (e.g. Site Supervisor)"
            className="rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm"
          />
          <input
            name="code"
            required
            placeholder="CODE (e.g. SITE_SUP)"
            className="rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm uppercase"
          />
          <input
            name="description"
            placeholder="Optional description"
            className="rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm md:col-span-2"
          />
          <label className="block space-y-1 text-sm md:col-span-2">
            <span className="font-medium">Permission level</span>
            <select
              name="baseRole"
              defaultValue="EMPLOYEE"
              className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5"
            >
              {assignableBaseRoles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
        </div>
        {createState.error ? <p className="text-sm text-red-700">{createState.error}</p> : null}
        {createState.ok ? <p className="text-sm text-emerald-700">{createState.message}</p> : null}
        <button
          type="submit"
          disabled={creating}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {creating ? "Saving..." : "Create role"}
        </button>
      </form>
    </div>
  );
}

function RoleRow({
  role,
  assignableBaseRoles,
}: {
  role: OrgRoleRow;
  assignableBaseRoles: Role[];
}) {
  const [state, action, pending] = useActionState(updateOrgRoleAction, initial);
  const [busy, start] = useTransition();
  const bases = role.isSystem
    ? BASE_OPTIONS
    : assignableBaseRoles.includes(role.baseRole)
      ? assignableBaseRoles
      : [...assignableBaseRoles, role.baseRole];

  return (
    <form action={action} className="rounded-xl bg-canvas px-3 py-3">
      <input type="hidden" name="id" value={role.id} />
      <div className="grid gap-2 md:grid-cols-2">
        <input
          name="name"
          required
          defaultValue={role.name}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
        />
        {role.isSystem ? (
          <input
            disabled
            value={`${role.code} · ${ROLE_LABELS[role.baseRole]} (system)`}
            className="rounded-lg border border-border bg-white/60 px-3 py-2 text-sm text-muted-foreground"
          />
        ) : (
          <input
            name="code"
            required
            defaultValue={role.code}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm uppercase"
          />
        )}
        <input
          name="description"
          defaultValue={role.description || ""}
          placeholder="Description"
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm md:col-span-2"
        />
        {!role.isSystem ? (
          <label className="block space-y-1 text-sm md:col-span-2">
            <span className="font-medium">Permission level</span>
            <select
              name="baseRole"
              defaultValue={role.baseRole}
              className="w-full rounded-lg border border-border bg-white px-3 py-2"
            >
              {bases.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="text-xs font-semibold text-primary disabled:opacity-60"
        >
          {pending ? "..." : "Save"}
        </button>
        {!role.isSystem ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => start(async () => { await toggleOrgRoleAction(role.id); })}
              className="text-xs font-semibold text-muted-foreground"
            >
              {role.active ? "Deactivate" : "Activate"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                start(async () => {
                  const res = await deleteOrgRoleAction(role.id);
                  if (!res.ok && res.error) window.alert(res.error);
                })
              }
              className="text-xs font-semibold text-red-700"
            >
              Remove
            </button>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">Built-in · cannot remove</span>
        )}
        <span className="text-xs text-muted-foreground">
          {role._count?.users ?? 0} user(s)
          {!role.active ? " · inactive" : ""}
        </span>
      </div>
      {state.error ? <p className="mt-1 text-xs text-red-700">{state.error}</p> : null}
      {state.ok ? <p className="mt-1 text-xs text-emerald-700">{state.message}</p> : null}
    </form>
  );
}
