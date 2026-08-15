"use server";

import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { z } from "zod";
import { canSuperAdmin, getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DEFAULT_NAV, type NavKey, type NavOverride } from "@/lib/system";

export type ActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
};

async function requireSuper() {
  const session = await getSession();
  if (!session || !canSuperAdmin(session.role)) return null;
  return session;
}

export async function updateBrandingAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireSuper();
  if (!session) return { ok: false, error: "Super Admin only." };

  const schema = z.object({
    companyName: z.string().min(2).max(120),
    productName: z.string().min(2).max(80),
    tagline: z.string().max(200),
    supportEmail: z.string().email(),
    primaryColor: z.string().min(4).max(20),
    secondaryColor: z.string().min(4).max(20),
    canvasColor: z.string().min(4).max(20),
    accentColor: z.string().min(4).max(20),
    designPreset: z.enum(["industrial", "soft", "sharp"]),
    loginTitle: z.string().max(120),
    loginSubtitle: z.string().max(240),
    landingHeadline: z.string().max(160),
    landingBody: z.string().max(600),
    footerText: z.string().max(200),
    showLandingStats: z.boolean(),
    showMarketingPage: z.boolean(),
    employeeCodePrefix: z.string().min(1).max(12),
  });

  const parsed = schema.safeParse({
    companyName: formData.get("companyName"),
    productName: formData.get("productName"),
    tagline: formData.get("tagline"),
    supportEmail: formData.get("supportEmail"),
    primaryColor: formData.get("primaryColor"),
    secondaryColor: formData.get("secondaryColor"),
    canvasColor: formData.get("canvasColor") || "#eef2f6",
    accentColor: formData.get("accentColor") || "#fdecec",
    designPreset: formData.get("designPreset") || "industrial",
    loginTitle: formData.get("loginTitle"),
    loginSubtitle: formData.get("loginSubtitle"),
    landingHeadline: formData.get("landingHeadline"),
    landingBody: formData.get("landingBody"),
    footerText: formData.get("footerText"),
    showLandingStats: formData.get("showLandingStats") === "on",
    showMarketingPage: formData.get("showMarketingPage") === "on",
    employeeCodePrefix: String(formData.get("employeeCodePrefix") || "FC")
      .toUpperCase()
      .slice(0, 12),
  });

  if (!parsed.success) return { ok: false, error: "Check branding fields." };

  let logoUrl: string | undefined;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (logo.size > 2_000_000) {
      return { ok: false, error: "Logo must be under 2MB." };
    }
    const bytes = Buffer.from(await logo.arrayBuffer());
    const ext = path.extname(logo.name || ".png") || ".png";
    const dir = path.join(process.cwd(), "public", "branding", "uploads");
    await mkdir(dir, { recursive: true });
    const filename = `logo-${Date.now()}${ext}`;
    await writeFile(path.join(dir, filename), bytes);
    logoUrl = `/branding/uploads/${filename}`;
  }

  await prisma.systemSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      ...parsed.data,
      ...(logoUrl ? { logoUrl } : {}),
    },
    update: {
      ...parsed.data,
      ...(logoUrl ? { logoUrl } : {}),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: "UPDATE_BRANDING",
      entity: "SystemSettings",
      entityId: "default",
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/system");
  revalidatePath("/login");

  return { ok: true, message: "Branding saved for this buyer company." };
}

export async function updateNavAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireSuper();
  if (!session) return { ok: false, error: "Super Admin only." };

  const navConfig: NavOverride[] = DEFAULT_NAV.map((item) => {
    const label = String(formData.get(`label_${item.key}`) || item.label);
    const hidden = formData.get(`hidden_${item.key}`) === "on";
    return { key: item.key as NavKey, label, hidden };
  });

  const featureFlags = {
    allowEmployeeSelfRequest: formData.get("allowEmployeeSelfRequest") === "on",
    showTeamCoverage: formData.get("showTeamCoverage") === "on",
    showReports: formData.get("showReports") === "on",
    enableBulkImport: formData.get("enableBulkImport") === "on",
    requireManagerApproval: formData.get("requireManagerApproval") === "on",
  };

  await prisma.systemSettings.upsert({
    where: { id: "default" },
    create: { id: "default", navConfig, featureFlags },
    update: { navConfig, featureFlags },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: "UPDATE_NAV",
      entity: "SystemSettings",
      entityId: "default",
      meta: { featureFlags },
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/system");

  return { ok: true, message: "Navigation and feature flags updated." };
}

export async function createDepartmentAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "HR_ADMIN")) {
    return { ok: false, error: "Not allowed." };
  }

  const name = String(formData.get("name") || "").trim();
  const code = String(formData.get("code") || "")
    .trim()
    .toUpperCase();
  if (!name || !code) return { ok: false, error: "Name and code required." };

  try {
    await prisma.department.create({ data: { name, code } });
  } catch {
    return { ok: false, error: "Department code already exists." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/system");
  return { ok: true, message: "Department created." };
}
