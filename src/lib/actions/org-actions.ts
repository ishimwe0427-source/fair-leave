"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { z } from "zod";
import { canAdminister, canManageRole, canSuperAdmin, getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type ActionResult = { ok: boolean; error?: string; message?: string };

async function requireAdmin() {
  const session = await getSession();
  if (!session || !canAdminister(session.role)) return null;
  return session;
}

function revalidateOrg() {
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/system");
}

const BASE_ROLES = [
  "EMPLOYEE",
  "MANAGER",
  "HR",
  "HR_ADMIN",
  "ADMIN",
  "MD",
  "GM",
  "SUPER_ADMIN",
] as const;

export async function updateDepartmentAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Not allowed." };

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const code = String(formData.get("code") || "")
    .trim()
    .toUpperCase();
  if (!id || !name || !code) return { ok: false, error: "Name and code required." };

  try {
    await prisma.department.update({
      where: { id },
      data: { name, code },
    });
  } catch {
    return { ok: false, error: "Could not update — code may already exist." };
  }

  revalidateOrg();
  return { ok: true, message: "Department updated." };
}

export async function deleteDepartmentAction(id: string): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Not allowed." };

  const users = await prisma.user.count({ where: { departmentId: id } });
  if (users > 0) {
    return {
      ok: false,
      error: `Cannot remove — ${users} user(s) still assigned. Reassign them or deactivate instead.`,
    };
  }

  try {
    await prisma.department.delete({ where: { id } });
  } catch {
    return { ok: false, error: "Department not found." };
  }

  revalidateOrg();
  return { ok: true, message: "Department removed." };
}

export async function createOrgRoleAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Not allowed." };

  const parsed = z
    .object({
      name: z.string().min(2).max(80),
      code: z.string().min(2).max(40),
      description: z.string().max(240).optional(),
      baseRole: z.enum(BASE_ROLES),
    })
    .safeParse({
      name: String(formData.get("name") || "").trim(),
      code: String(formData.get("code") || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "_"),
      description: String(formData.get("description") || "").trim() || undefined,
      baseRole: String(formData.get("baseRole") || "EMPLOYEE"),
    });

  if (!parsed.success) return { ok: false, error: "Check role name, code, and base permissions." };

  const baseRole = parsed.data.baseRole as Role;
  if (!canManageRole(session.role, baseRole)) {
    return { ok: false, error: "You cannot create a role with these permissions." };
  }
  if (baseRole === "SUPER_ADMIN" && !canSuperAdmin(session.role)) {
    return { ok: false, error: "Only Super Admin can create Super Admin–based roles." };
  }

  try {
    await prisma.orgRole.create({
      data: {
        name: parsed.data.name,
        code: parsed.data.code,
        description: parsed.data.description,
        baseRole,
        isSystem: false,
        active: true,
      },
    });
  } catch {
    return { ok: false, error: "Role code already exists." };
  }

  revalidateOrg();
  return { ok: true, message: "User role created." };
}

export async function updateOrgRoleAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Not allowed." };

  const id = String(formData.get("id") || "");
  if (!id) return { ok: false, error: "Missing role id." };

  const existing = await prisma.orgRole.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Role not found." };

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  if (!name) return { ok: false, error: "Name required." };

  if (existing.isSystem) {
    await prisma.orgRole.update({
      where: { id },
      data: { name, description },
    });
    revalidateOrg();
    return { ok: true, message: "System role label updated." };
  }

  const code = String(formData.get("code") || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  const baseRole = String(formData.get("baseRole") || existing.baseRole) as Role;
  if (!BASE_ROLES.includes(baseRole as (typeof BASE_ROLES)[number])) {
    return { ok: false, error: "Invalid base permissions." };
  }
  if (!canManageRole(session.role, baseRole)) {
    return { ok: false, error: "You cannot set these permissions." };
  }
  if (baseRole === "SUPER_ADMIN" && !canSuperAdmin(session.role)) {
    return { ok: false, error: "Only Super Admin can use Super Admin permissions." };
  }

  try {
    await prisma.orgRole.update({
      where: { id },
      data: { name, code, description, baseRole },
    });
    // Keep assigned users' workflow role in sync
    await prisma.user.updateMany({
      where: { orgRoleId: id },
      data: { role: baseRole },
    });
  } catch {
    return { ok: false, error: "Could not update — code may already exist." };
  }

  revalidateOrg();
  return { ok: true, message: "User role updated." };
}

export async function toggleOrgRoleAction(id: string): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Not allowed." };

  const role = await prisma.orgRole.findUnique({ where: { id } });
  if (!role) return { ok: false, error: "Role not found." };
  if (role.isSystem && role.active) {
    return { ok: false, error: "System roles stay active. Edit the label instead, or create a custom role." };
  }

  await prisma.orgRole.update({
    where: { id },
    data: { active: !role.active },
  });
  revalidateOrg();
  return {
    ok: true,
    message: role.active ? "Role deactivated." : "Role activated.",
  };
}

export async function deleteOrgRoleAction(id: string): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Not allowed." };

  const role = await prisma.orgRole.findUnique({ where: { id } });
  if (!role) return { ok: false, error: "Role not found." };
  if (role.isSystem) {
    return { ok: false, error: "System roles cannot be removed." };
  }

  const users = await prisma.user.count({ where: { orgRoleId: id } });
  if (users > 0) {
    return {
      ok: false,
      error: `Cannot remove — ${users} user(s) still have this role. Reassign them first.`,
    };
  }

  await prisma.orgRole.delete({ where: { id } });
  revalidateOrg();
  return { ok: true, message: "User role removed." };
}

export async function updateLeaveWorkflowAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Not allowed." };

  const settings = await prisma.systemSettings.findUnique({ where: { id: "default" } });
  const current = (settings?.featureFlags as Record<string, unknown>) || {};
  const requireManagerApproval = formData.get("requireManagerApproval") === "on";

  await prisma.systemSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      featureFlags: { ...current, requireManagerApproval },
    },
    update: {
      featureFlags: { ...current, requireManagerApproval },
    },
  });

  revalidatePath("/admin");
  revalidatePath("/system");
  revalidatePath("/requests/new");
  return {
    ok: true,
    message: requireManagerApproval
      ? "Manager first review is ON (when the employee has a line manager)."
      : "Manager first review is OFF — requests go straight to HR.",
  };
}
