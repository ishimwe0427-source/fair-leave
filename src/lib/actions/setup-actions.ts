"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  createSession,
  hashPassword,
  validatePasswordStrength,
  verifyMintedCsrf,
} from "@/lib/auth";
import { needsSetup } from "@/lib/setup";
import { ensureBaselineCatalog } from "@/lib/bootstrap";

export type SetupResult = {
  ok: boolean;
  error?: string;
};

const setupSchema = z.object({
  companyName: z.string().min(2).max(120),
  productName: z.string().min(2).max(80),
  supportEmail: z.string().email().max(254),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email().max(254),
  password: z.string().min(10).max(200),
  csrfToken: z.string().min(16),
});

export async function completeSetupAction(
  _prev: SetupResult,
  formData: FormData,
): Promise<SetupResult> {
  if (!(await needsSetup())) {
    return { ok: false, error: "Setup is already complete. Sign in instead." };
  }

  const parsed = setupSchema.safeParse({
    companyName: String(formData.get("companyName") || "").trim(),
    productName: String(formData.get("productName") || "").trim(),
    supportEmail: String(formData.get("supportEmail") || "")
      .trim()
      .toLowerCase(),
    firstName: String(formData.get("firstName") || "").trim(),
    lastName: String(formData.get("lastName") || "").trim(),
    email: String(formData.get("email") || "").trim().toLowerCase(),
    password: formData.get("password"),
    csrfToken: formData.get("csrfToken"),
  });

  if (!parsed.success) {
    return { ok: false, error: "Check all fields and try again." };
  }

  if (!verifyMintedCsrf(parsed.data.csrfToken)) {
    return { ok: false, error: "Security check failed. Refresh and try again." };
  }

  const strength = validatePasswordStrength(parsed.data.password);
  if (strength) return { ok: false, error: strength };

  await ensureBaselineCatalog(prisma);

  const prefix = parsed.data.companyName
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 4)
    .toUpperCase() || "FL";

  await prisma.systemSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      companyName: parsed.data.companyName,
      productName: parsed.data.productName,
      supportEmail: parsed.data.supportEmail,
      loginTitle: `Sign in to ${parsed.data.productName}`,
      loginSubtitle: `Secure leave operations for ${parsed.data.companyName}.`,
      landingHeadline: "Leave operations that keep teams productive",
      landingBody:
        "Request, approve, and track leave with country policies, balances, and Super Admin white-label controls.",
      employeeCodePrefix: prefix,
    },
    update: {
      companyName: parsed.data.companyName,
      productName: parsed.data.productName,
      supportEmail: parsed.data.supportEmail,
      loginTitle: `Sign in to ${parsed.data.productName}`,
      loginSubtitle: `Secure leave operations for ${parsed.data.companyName}.`,
      employeeCodePrefix: prefix,
    },
  });

  let department = await prisma.department.findFirst({
    where: { code: "EXE" },
  });
  if (!department) {
    department = await prisma.department.create({
      data: { name: "Executive Office", code: "EXE" },
    });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const superOrgRole = await prisma.orgRole.findUnique({
    where: { code: "SUPER_ADMIN" },
  });
  const admin = await prisma.user.create({
    data: {
      email: parsed.data.email,
      passwordHash,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      employeeCode: `${prefix}-SA-001`,
      role: "SUPER_ADMIN",
      orgRoleId: superOrgRole?.id,
      jobTitle: "System Owner",
      country: "RW",
      hireDate: new Date(),
      departmentId: department.id,
      mustChangePassword: false,
      avatarColor: "#7f1d1d",
    },
  });

  // Create balances for the Super Admin against baseline leave types
  const year = new Date().getFullYear();
  const leaveTypes = await prisma.leaveType.findMany({ where: { active: true } });
  for (const leaveType of leaveTypes) {
    const policy = await prisma.leavePolicy.findUnique({
      where: {
        leaveTypeId_country: { leaveTypeId: leaveType.id, country: "RW" },
      },
    });
    await prisma.leaveBalance.create({
      data: {
        userId: admin.id,
        leaveTypeId: leaveType.id,
        year,
        entitled: policy?.entitlementDays ?? 0,
        carried: 0,
        used: 0,
        pending: 0,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "SETUP_COMPLETE",
      entity: "System",
      meta: {
        company: parsed.data.companyName,
        product: parsed.data.productName,
      },
    },
  });

  await createSession({
    id: admin.id,
    email: admin.email,
    firstName: admin.firstName,
    lastName: admin.lastName,
    role: admin.role,
    employeeCode: admin.employeeCode,
    departmentId: admin.departmentId,
    managerId: admin.managerId,
    mustChangePassword: false,
  });

  redirect("/system");
}
