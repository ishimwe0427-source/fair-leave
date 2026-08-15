"use server";

import { revalidatePath } from "next/cache";
import { Gender, Role, UserStatus } from "@prisma/client";
import { z } from "zod";
import {
  canDeleteUsers,
  canManageRole,
  canManageUsers,
  canSuperAdmin,
  getSession,
  hashPassword,
} from "@/lib/auth";
import { ensureUserBalances } from "@/lib/balances";
import { prisma } from "@/lib/db";
import { generateEmployeeCode, generateTempPassword } from "@/lib/passwords";

export type ActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
  tempPassword?: string;
};

const userSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  employeeCode: z.string().optional(),
  orgRoleId: z.string().min(1),
  gender: z.enum(["MALE", "FEMALE", "UNSPECIFIED"]).default("UNSPECIFIED"),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
  country: z.string().min(2).max(8).default("RW"),
  departmentId: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
  hireDate: z.string().optional(),
});

async function requireUserManager() {
  const session = await getSession();
  if (!session || !canManageUsers(session.role)) {
    return null;
  }
  return session;
}

export async function createUserAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireUserManager();
  if (!session) return { ok: false, error: "Not allowed." };

  const parsed = userSchema.safeParse({
    email: String(formData.get("email") || "").toLowerCase(),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    employeeCode: formData.get("employeeCode") || undefined,
    orgRoleId: String(formData.get("orgRoleId") || ""),
    gender: formData.get("gender") || "UNSPECIFIED",
    status: formData.get("status") || "ACTIVE",
    jobTitle: formData.get("jobTitle") || undefined,
    phone: formData.get("phone") || undefined,
    country: formData.get("country") || "RW",
    departmentId: formData.get("departmentId") || null,
    managerId: formData.get("managerId") || null,
    hireDate: formData.get("hireDate") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: "Check required user fields." };
  }

  const orgRole = await prisma.orgRole.findFirst({
    where: { id: parsed.data.orgRoleId, active: true },
  });
  if (!orgRole) return { ok: false, error: "Selected user role is invalid or inactive." };

  const role = orgRole.baseRole as Role;
  if (!canManageRole(session.role, role)) {
    return { ok: false, error: "You cannot assign this role." };
  }
  if (role === "SUPER_ADMIN" && !canSuperAdmin(session.role)) {
    return { ok: false, error: "Only Super Admin can create Super Admins." };
  }

  const exists = await prisma.user.findFirst({
    where: {
      OR: [
        { email: parsed.data.email },
        ...(parsed.data.employeeCode
          ? [{ employeeCode: parsed.data.employeeCode }]
          : []),
      ],
    },
  });
  if (exists) return { ok: false, error: "Email or employee code already exists." };

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const { getSystemSettings } = await import("@/lib/system");
  const settings = await getSystemSettings();
  const employeeCode =
    parsed.data.employeeCode?.trim() ||
    generateEmployeeCode(settings.employeeCodePrefix || "FC");

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      employeeCode,
      role,
      orgRoleId: orgRole.id,
      gender: parsed.data.gender as Gender,
      status: parsed.data.status as UserStatus,
      jobTitle: parsed.data.jobTitle,
      phone: parsed.data.phone,
      country: parsed.data.country,
      departmentId: parsed.data.departmentId || null,
      managerId: parsed.data.managerId || null,
      hireDate: parsed.data.hireDate
        ? new Date(parsed.data.hireDate)
        : new Date(),
      passwordHash,
      mustChangePassword: true,
    },
  });

  await ensureUserBalances(user.id, user.country);
  await prisma.notification.create({
    data: {
      userId: user.id,
      type: "ACCOUNT_CREATED",
      title: "Welcome to FairLeave",
      body: "Your leave account is ready. Use the temporary password from your welcome email, then change it in Settings.",
      href: "/settings",
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: "CREATE_USER",
      entity: "User",
      entityId: user.id,
      meta: { email: user.email, role: user.role, gender: user.gender },
    },
  });

  const { sendWelcomeAccountEmail } = await import("@/lib/email");
  await sendWelcomeAccountEmail({
    to: user.email,
    firstName: user.firstName,
    email: user.email,
    tempPassword,
  });

  revalidatePath("/admin/users");
  revalidatePath("/team");

  return {
    ok: true,
    message: `User created. Welcome email sent (or logged if SMTP is not configured). Temp password also shown once below.`,
    tempPassword,
  };
}

export async function updateUserAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireUserManager();
  if (!session) return { ok: false, error: "Not allowed." };

  const id = String(formData.get("id") || "");
  if (!id) return { ok: false, error: "Missing user id." };

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "User not found." };
  if (!canManageRole(session.role, existing.role)) {
    return { ok: false, error: "You cannot edit this user." };
  }
  if (existing.role === "SUPER_ADMIN" && !canSuperAdmin(session.role)) {
    return { ok: false, error: "Only Super Admin can manage Super Admin accounts." };
  }

  const parsed = userSchema.safeParse({
    email: String(formData.get("email") || "").toLowerCase(),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    employeeCode: formData.get("employeeCode") || existing.employeeCode,
    orgRoleId: String(formData.get("orgRoleId") || existing.orgRoleId || ""),
    gender: formData.get("gender") || existing.gender,
    status: formData.get("status") || existing.status,
    jobTitle: formData.get("jobTitle") || undefined,
    phone: formData.get("phone") || undefined,
    country: formData.get("country") || existing.country,
    departmentId: formData.get("departmentId") || null,
    managerId: formData.get("managerId") || null,
    hireDate: formData.get("hireDate") || undefined,
  });

  if (!parsed.success) return { ok: false, error: "Invalid form data." };

  const orgRole = await prisma.orgRole.findFirst({
    where: { id: parsed.data.orgRoleId, active: true },
  });
  if (!orgRole) return { ok: false, error: "Selected user role is invalid or inactive." };

  const role = orgRole.baseRole as Role;
  if (!canManageRole(session.role, role)) {
    return { ok: false, error: "You cannot assign this role." };
  }
  if (
    (existing.role === "SUPER_ADMIN" || role === "SUPER_ADMIN") &&
    !canSuperAdmin(session.role)
  ) {
    return { ok: false, error: "Only Super Admin can manage Super Admin accounts." };
  }
  if (existing.id === session.id && role !== existing.role) {
    return { ok: false, error: "You cannot change your own role here." };
  }

  await prisma.user.update({
    where: { id },
    data: {
      email: parsed.data.email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      employeeCode: parsed.data.employeeCode || existing.employeeCode,
      role,
      orgRoleId: orgRole.id,
      gender: parsed.data.gender as Gender,
      status: parsed.data.status as UserStatus,
      jobTitle: parsed.data.jobTitle,
      phone: parsed.data.phone,
      country: parsed.data.country,
      departmentId: parsed.data.departmentId || null,
      managerId: parsed.data.managerId || null,
      hireDate: parsed.data.hireDate
        ? new Date(parsed.data.hireDate)
        : existing.hireDate,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: "UPDATE_USER",
      entity: "User",
      entityId: id,
      meta: { gender: parsed.data.gender, role },
    },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);
  revalidatePath("/team");

  return { ok: true, message: "User updated." };
}

export async function deleteUserAction(userId: string): Promise<ActionResult> {
  const session = await requireUserManager();
  if (!session) return { ok: false, error: "Not allowed." };
  if (!canDeleteUsers(session.role)) {
    return { ok: false, error: "Your role cannot delete users." };
  }
  if (session.id === userId) {
    return { ok: false, error: "You cannot delete your own account." };
  }

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) return { ok: false, error: "User not found." };
  if (!canManageRole(session.role, existing.role)) {
    return { ok: false, error: "You cannot delete this user." };
  }
  if (existing.role === "SUPER_ADMIN" && !canSuperAdmin(session.role)) {
    return { ok: false, error: "Only Super Admin can delete Super Admins." };
  }

  await prisma.user.delete({ where: { id: userId } });
  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: "DELETE_USER",
      entity: "User",
      entityId: userId,
      meta: { email: existing.email },
    },
  });

  revalidatePath("/admin/users");
  return { ok: true, message: "User deleted." };
}

export async function resetUserPasswordAction(
  userId: string,
): Promise<ActionResult> {
  const session = await requireUserManager();
  if (!session) return { ok: false, error: "Not allowed." };

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) return { ok: false, error: "User not found." };
  if (!canManageRole(session.role, existing.role)) {
    return { ok: false, error: "Not allowed for this user." };
  }
  if (existing.role === "SUPER_ADMIN" && !canSuperAdmin(session.role)) {
    return { ok: false, error: "Only Super Admin can reset Super Admin passwords." };
  }

  const tempPassword = generateTempPassword();
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(tempPassword),
      mustChangePassword: true,
    },
  });

  await prisma.notification.create({
    data: {
      userId,
      type: "CREDENTIALS_ISSUED",
      title: "Password reset",
      body: "Your password was reset by an administrator. Use the temporary password provided by HR.",
      href: "/settings",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: "RESET_PASSWORD",
      entity: "User",
      entityId: userId,
    },
  });

  return {
    ok: true,
    message: "Temporary password generated. Copy it now — it won't be shown again.",
    tempPassword,
  };
}

export async function changeOwnPasswordAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Please sign in." };

  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");

  const {
    validatePasswordStrength,
    verifyPassword,
    hashPassword,
    createSession,
    revokeAllSessions,
  } = await import("@/lib/auth");

  const strengthError = validatePasswordStrength(newPassword);
  if (strengthError) return { ok: false, error: strengthError };

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return { ok: false, error: "User not found." };

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) return { ok: false, error: "Current password is incorrect." };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      mustChangePassword: false,
    },
  });

  await revokeAllSessions(user.id);
  await createSession({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    employeeCode: user.employeeCode,
    departmentId: user.departmentId,
    managerId: user.managerId,
    mustChangePassword: false,
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "PASSWORD_CHANGED",
      entity: "User",
      entityId: user.id,
    },
  });

  return {
    ok: true,
    message: "Password updated. Other devices were signed out.",
  };
}
