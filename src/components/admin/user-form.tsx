"use client";

import { useActionState } from "react";
import { Gender, Role, UserStatus } from "@prisma/client";
import {
  createUserAction,
  updateUserAction,
  type ActionResult,
} from "@/lib/actions/user-actions";
import { ROLE_LABELS } from "@/lib/roles";

const initial: ActionResult = { ok: false };

type Dept = { id: string; name: string; code: string };
type Manager = { id: string; firstName: string; lastName: string; email: string };
type OrgRoleOption = {
  id: string;
  name: string;
  code: string;
  baseRole: Role;
};

export function UserForm({
  mode,
  departments,
  managers,
  orgRoles,
  user,
}: {
  mode: "create" | "edit";
  departments: Dept[];
  managers: Manager[];
  orgRoles: OrgRoleOption[];
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    role: Role;
    gender: Gender;
    status: UserStatus;
    jobTitle: string | null;
    phone: string | null;
    country: string;
    departmentId: string | null;
    orgRoleId: string | null;
    managerId: string | null;
    hireDate: Date;
  };
}) {
  const action = mode === "create" ? createUserAction : updateUserAction;
  const [state, formAction, pending] = useActionState(action, initial);
  const defaultOrgRoleId =
    user?.orgRoleId ||
    orgRoles.find((r) => r.baseRole === (user?.role || "EMPLOYEE"))?.id ||
    orgRoles[0]?.id ||
    "";

  return (
    <form action={formAction} className="app-panel space-y-4 p-6 md:p-8">
      {mode === "edit" && user ? <input type="hidden" name="id" value={user.id} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="First name" name="firstName" required defaultValue={user?.firstName} />
        <Field label="Last name" name="lastName" required defaultValue={user?.lastName} />
        <Field label="Email" name="email" type="email" required defaultValue={user?.email} />
        <Field
          label="Employee code"
          name="employeeCode"
          defaultValue={user?.employeeCode}
          placeholder="Auto-generated if empty"
        />
        <label className="block space-y-2 text-sm">
          <span className="font-medium">User role</span>
          <select
            name="orgRoleId"
            required
            defaultValue={defaultOrgRoleId}
            className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5"
          >
            {orgRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name} · {ROLE_LABELS[role.baseRole]}
              </option>
            ))}
          </select>
          <span className="block text-xs text-muted-foreground">
            Manage custom roles under Policies. Permission level controls leave approvals.
          </span>
        </label>
        <label className="block space-y-2 text-sm">
          <span className="font-medium">Gender</span>
          <select
            name="gender"
            required
            defaultValue={user?.gender || "UNSPECIFIED"}
            className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5"
          >
            <option value="FEMALE">Female — maternity leave available</option>
            <option value="MALE">Male — paternity leave available</option>
            <option value="UNSPECIFIED">Not set</option>
          </select>
          <span className="block text-xs text-muted-foreground">
            Controls maternity / paternity visibility. Other leave types stay available for everyone.
          </span>
        </label>
        <label className="block space-y-2 text-sm">
          <span className="font-medium">Status</span>
          <select
            name="status"
            defaultValue={user?.status || "ACTIVE"}
            className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5"
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </label>
        <Field label="Job title" name="jobTitle" defaultValue={user?.jobTitle || ""} />
        <Field label="Phone" name="phone" defaultValue={user?.phone || ""} />
        <Field label="Country" name="country" defaultValue={user?.country || "RW"} />
        <Field
          label="Hire date"
          name="hireDate"
          type="date"
          defaultValue={
            user?.hireDate
              ? new Date(user.hireDate).toISOString().slice(0, 10)
              : ""
          }
        />
        <label className="block space-y-2 text-sm">
          <span className="font-medium">Department</span>
          <select
            name="departmentId"
            defaultValue={user?.departmentId || ""}
            className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5"
          >
            <option value="">No department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2 text-sm md:col-span-2">
          <span className="font-medium">Line manager (optional)</span>
          <select
            name="managerId"
            defaultValue={user?.managerId || ""}
            className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5"
          >
            <option value="">No manager</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName} · {m.email}
              </option>
            ))}
          </select>
          <span className="block text-xs text-muted-foreground">
            Day-to-day reporting line. If <strong>Manager first review</strong> is enabled in
            Policies, leave goes Manager → HR → MD/GM. Otherwise HR → MD/GM (manager still
            notified for coverage).
          </span>
        </label>
      </div>

      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}
      {state.ok ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p>{state.message}</p>
          {state.tempPassword ? (
            <p className="mt-2 font-mono text-base font-semibold">
              Temp password: {state.tempPassword}
            </p>
          ) : null}
        </div>
      ) : null}

      <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
        {pending ? "Saving..." : mode === "create" ? "Create user" : "Save changes"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 outline-none ring-primary focus:ring-2"
      />
    </label>
  );
}
