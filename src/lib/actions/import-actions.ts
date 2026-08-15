"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { Role, UserStatus } from "@prisma/client";
import {
  canAdminister,
  canManageRole,
  getSession,
  hashPassword,
} from "@/lib/auth";
import { ensureUserBalances } from "@/lib/balances";
import { prisma } from "@/lib/db";
import {
  IMPORT_TEMPLATE_HEADERS,
  parseRole,
  parseWorkbook,
} from "@/lib/import-workers";
import { generateEmployeeCode, generateTempPassword } from "@/lib/passwords";

export type ImportActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
  jobId?: string;
};

const BATCH_SIZE = 100;

export async function importWorkersAction(
  _prev: ImportActionResult,
  formData: FormData,
): Promise<ImportActionResult> {
  const session = await getSession();
  if (!session || !canAdminister(session.role)) {
    return { ok: false, error: "Not allowed." };
  }

  const { assertFeature } = await import("@/lib/features");
  const featureOk = await assertFeature("enableBulkImport");
  if (!featureOk.ok) return featureOk;

  const { getSystemSettings } = await import("@/lib/system");
  const settings = await getSystemSettings();
  const codePrefix = settings.employeeCodePrefix || "FC";

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Upload a CSV or Excel file." };
  }

  const filename = file.name || "workers.xlsx";
  const lower = filename.toLowerCase();
  if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
    return { ok: false, error: "Only .csv, .xlsx, or .xls files are supported." };
  }

  if (file.size > 25 * 1024 * 1024) {
    return { ok: false, error: "File must be under 25MB." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const rows = parseWorkbook(buffer, filename);

  const job = await prisma.importJob.create({
    data: {
      filename,
      status: "PROCESSING",
      totalRows: rows.length,
      createdById: session.id,
    },
  });

  const departments = await prisma.department.findMany();
  const deptByCode = new Map(departments.map((d) => [d.code.toUpperCase(), d.id]));
  const existingUsers = await prisma.user.findMany({
    select: { email: true, employeeCode: true, id: true },
  });
  const emailSet = new Set(existingUsers.map((u) => u.email.toLowerCase()));
  const codeSet = new Set(existingUsers.map((u) => u.employeeCode.toUpperCase()));

  const errors: Array<{ row: number; message: string }> = [];
  const credentials: Array<{
    email: string;
    employeeCode: string;
    tempPassword: string;
    role: string;
  }> = [];

  let successCount = 0;
  let skippedCount = 0;

  const validRows = rows.filter((row) => {
    if (row.error) {
      errors.push({ row: row.rowNumber, message: row.error });
      return false;
    }
    return true;
  });

  // Resolve manager emails after create pass using a second map update
  type Pending = {
    rowNumber: number;
    email: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    role: Role;
    jobTitle?: string;
    phone?: string;
    country: string;
    departmentId: string | null;
    managerEmail?: string;
    hireDate: Date;
    status: UserStatus;
    tempPassword: string;
  };

  const pending: Pending[] = [];

  for (const row of validRows) {
    const data = row.data;
    const email = data.email.toLowerCase();
    if (emailSet.has(email)) {
      skippedCount += 1;
      errors.push({ row: row.rowNumber, message: `Email already exists: ${email}` });
      continue;
    }

    const role = parseRole(data.role);
    if (!canManageRole(session.role, role) || (role === "SUPER_ADMIN" && session.role !== "SUPER_ADMIN")) {
      errors.push({
        row: row.rowNumber,
        message: `You cannot import role ${role}`,
      });
      continue;
    }

    let employeeCode = (data.employeeCode || "").trim().toUpperCase();
    if (!employeeCode) employeeCode = generateEmployeeCode(codePrefix);
    if (codeSet.has(employeeCode)) {
      skippedCount += 1;
      errors.push({
        row: row.rowNumber,
        message: `Employee code exists: ${employeeCode}`,
      });
      continue;
    }

    let departmentId: string | null = null;
    if (data.departmentCode) {
      departmentId = deptByCode.get(data.departmentCode.toUpperCase()) || null;
      if (!departmentId) {
        const created = await prisma.department.create({
          data: {
            name: data.departmentCode,
            code: data.departmentCode.toUpperCase().slice(0, 12),
          },
        });
        departmentId = created.id;
        deptByCode.set(created.code, created.id);
      }
    }

    const tempPassword = generateTempPassword();
    pending.push({
      rowNumber: row.rowNumber,
      email,
      firstName: data.firstName,
      lastName: data.lastName,
      employeeCode,
      role,
      jobTitle: data.jobTitle,
      phone: data.phone,
      country: (data.country || "RW").toUpperCase().slice(0, 8),
      departmentId,
      managerEmail: data.managerEmail?.toLowerCase(),
      hireDate: data.hireDate ? new Date(data.hireDate) : new Date(),
      status:
        data.status?.toLowerCase() === "inactive" ? "INACTIVE" : "ACTIVE",
      tempPassword,
    });

    emailSet.add(email);
    codeSet.add(employeeCode);
  }

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const chunk = pending.slice(i, i + BATCH_SIZE);
    for (const item of chunk) {
      try {
        const manager = item.managerEmail
          ? await prisma.user.findUnique({ where: { email: item.managerEmail } })
          : null;

        const user = await prisma.user.create({
          data: {
            email: item.email,
            firstName: item.firstName,
            lastName: item.lastName,
            employeeCode: item.employeeCode,
            role: item.role,
            status: item.status,
            jobTitle: item.jobTitle,
            phone: item.phone,
            country: item.country,
            departmentId: item.departmentId,
            managerId: manager?.id || null,
            hireDate: Number.isNaN(item.hireDate.getTime())
              ? new Date()
              : item.hireDate,
            passwordHash: await hashPassword(item.tempPassword),
            mustChangePassword: true,
          },
        });

        await ensureUserBalances(user.id, user.country);
        credentials.push({
          email: user.email,
          employeeCode: user.employeeCode,
          tempPassword: item.tempPassword,
          role: user.role,
        });
        successCount += 1;
      } catch (error) {
        errors.push({
          row: item.rowNumber,
          message:
            error instanceof Error ? error.message : "Failed to create user",
        });
      }
    }
  }

  const dir = path.join(process.cwd(), "private", "imports");
  await mkdir(dir, { recursive: true });
  const credentialsPath = path.join(dir, `${job.id}-credentials.csv`);
  const csv = [
    "email,employeeCode,tempPassword,role",
    ...credentials.map(
      (c) =>
        `${c.email},${c.employeeCode},${JSON.stringify(c.tempPassword)},${c.role}`,
    ),
  ].join("\n");
  await writeFile(credentialsPath, csv, "utf8");

  await prisma.importJob.update({
    where: { id: job.id },
    data: {
      status: "COMPLETED",
      successCount,
      errorCount: errors.length,
      skippedCount,
      errors: errors.slice(0, 500),
      credentialsPath: `${job.id}-credentials.csv`,
      completedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: "BULK_IMPORT",
      entity: "ImportJob",
      entityId: job.id,
      meta: { successCount, errorCount: errors.length, filename },
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/import");
  revalidatePath("/team");

  return {
    ok: true,
    jobId: job.id,
    message: `Imported ${successCount} workers. Download credentials CSV now and share securely.`,
  };
}

export async function getImportTemplateCsv() {
  return IMPORT_TEMPLATE_HEADERS.join(",") + "\n";
}
