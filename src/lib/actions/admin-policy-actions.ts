"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canAdminister, getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type ActionResult = { ok: boolean; error?: string; message?: string };

async function requireAdmin() {
  const session = await getSession();
  if (!session || !canAdminister(session.role)) return null;
  return session;
}

export async function upsertLeaveTypeAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Not allowed." };

  const parsed = z
    .object({
      id: z.string().optional(),
      name: z.string().min(2),
      code: z.string().min(2).max(32),
      color: z.string().min(4),
      paid: z.boolean(),
      requiresDoc: z.boolean(),
      allowHalfDay: z.boolean(),
      active: z.boolean(),
      eligibleGender: z.enum(["ALL", "FEMALE", "MALE"]).default("ALL"),
      entitlementDays: z.coerce.number().min(0),
      carryOverMax: z.coerce.number().min(0),
      minNoticeDays: z.coerce.number().min(0),
      country: z.string().min(2).max(8),
    })
    .safeParse({
      id: formData.get("id") || undefined,
      name: formData.get("name"),
      code: String(formData.get("code") || "").toUpperCase(),
      color: formData.get("color") || "#d32f2f",
      paid: formData.get("paid") === "on",
      requiresDoc: formData.get("requiresDoc") === "on",
      allowHalfDay: formData.get("allowHalfDay") === "on",
      active: formData.get("active") !== "off",
      eligibleGender: formData.get("eligibleGender") || "ALL",
      entitlementDays: formData.get("entitlementDays") || 0,
      carryOverMax: formData.get("carryOverMax") || 0,
      minNoticeDays: formData.get("minNoticeDays") || 1,
      country: String(formData.get("country") || "RW").toUpperCase(),
    });

  if (!parsed.success) return { ok: false, error: "Check leave type fields." };

  const leaveType = parsed.data.id
    ? await prisma.leaveType.update({
        where: { id: parsed.data.id },
        data: {
          name: parsed.data.name,
          code: parsed.data.code,
          color: parsed.data.color,
          paid: parsed.data.paid,
          requiresDoc: parsed.data.requiresDoc,
          allowHalfDay: parsed.data.allowHalfDay,
          active: parsed.data.active,
          eligibleGender: parsed.data.eligibleGender,
        },
      })
    : await prisma.leaveType.create({
        data: {
          name: parsed.data.name,
          code: parsed.data.code,
          color: parsed.data.color,
          paid: parsed.data.paid,
          requiresDoc: parsed.data.requiresDoc,
          allowHalfDay: parsed.data.allowHalfDay,
          active: parsed.data.active,
          eligibleGender: parsed.data.eligibleGender,
          sortOrder: 99,
        },
      });

  await prisma.leavePolicy.upsert({
    where: {
      leaveTypeId_country: {
        leaveTypeId: leaveType.id,
        country: parsed.data.country,
      },
    },
    create: {
      leaveTypeId: leaveType.id,
      country: parsed.data.country,
      entitlementDays: parsed.data.entitlementDays,
      carryOverMax: parsed.data.carryOverMax,
      minNoticeDays: parsed.data.minNoticeDays,
    },
    update: {
      entitlementDays: parsed.data.entitlementDays,
      carryOverMax: parsed.data.carryOverMax,
      minNoticeDays: parsed.data.minNoticeDays,
    },
  });

  revalidatePath("/admin");
  return { ok: true, message: "Leave type saved." };
}

export async function createHolidayAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Not allowed." };

  const name = String(formData.get("name") || "").trim();
  const date = String(formData.get("date") || "");
  const country = String(formData.get("country") || "RW").toUpperCase();
  if (!name || !date) return { ok: false, error: "Name and date required." };

  await prisma.holiday.create({
    data: { name, date: new Date(date), country },
  });
  revalidatePath("/admin");
  revalidatePath("/calendar");
  return { ok: true, message: "Holiday added." };
}

export async function deleteHolidayAction(id: string): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Not allowed." };
  await prisma.holiday.delete({ where: { id } });
  revalidatePath("/admin");
  revalidatePath("/calendar");
  return { ok: true, message: "Holiday removed." };
}

export async function createBlackoutAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Not allowed." };

  const name = String(formData.get("name") || "").trim();
  const startDate = String(formData.get("startDate") || "");
  const endDate = String(formData.get("endDate") || "");
  const reason = String(formData.get("reason") || "").trim() || null;
  if (!name || !startDate || !endDate) {
    return { ok: false, error: "Name and dates required." };
  }

  await prisma.blackoutPeriod.create({
    data: {
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
    },
  });
  revalidatePath("/admin");
  return { ok: true, message: "Blackout period added." };
}

export async function deleteBlackoutAction(id: string): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Not allowed." };
  await prisma.blackoutPeriod.delete({ where: { id } });
  revalidatePath("/admin");
  return { ok: true, message: "Blackout removed." };
}

export async function toggleDepartmentAction(id: string): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Not allowed." };
  const dept = await prisma.department.findUnique({ where: { id } });
  if (!dept) return { ok: false, error: "Department not found." };
  await prisma.department.update({
    where: { id },
    data: { active: !dept.active },
  });
  revalidatePath("/admin");
  revalidatePath("/system");
  revalidatePath("/admin/users");
  return {
    ok: true,
    message: dept.active ? "Department deactivated." : "Department activated.",
  };
}
