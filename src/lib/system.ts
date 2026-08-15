import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";

export type NavKey =
  | "dashboard"
  | "requests"
  | "request_new"
  | "approvals"
  | "calendar"
  | "team"
  | "reports"
  | "admin"
  | "users"
  | "import"
  | "audit"
  | "system"
  | "settings";

export type NavOverride = {
  key: NavKey;
  label?: string;
  hidden?: boolean;
};

export type FeatureFlags = {
  allowEmployeeSelfRequest?: boolean;
  showTeamCoverage?: boolean;
  showReports?: boolean;
  enableBulkImport?: boolean;
  /** When true and employee has a line manager, leave starts at PENDING_MANAGER */
  requireManagerApproval?: boolean;
};

export const DEFAULT_NAV: Array<{
  key: NavKey;
  label: string;
  href: string;
  roles?: Role[];
}> = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard" },
  { key: "requests", label: "My Requests", href: "/requests" },
  { key: "request_new", label: "Request Leave", href: "/requests/new" },
  {
    key: "approvals",
    label: "Approvals",
    href: "/approvals",
    roles: ["MANAGER", "HR_ADMIN", "ADMIN", "MD", "GM", "SUPER_ADMIN"],
  },
  { key: "calendar", label: "Calendar", href: "/calendar" },
  {
    key: "team",
    label: "Team",
    href: "/team",
    roles: ["MANAGER", "HR_ADMIN", "ADMIN", "MD", "GM", "SUPER_ADMIN"],
  },
  {
    key: "reports",
    label: "Reports",
    href: "/reports",
    roles: ["MANAGER", "HR_ADMIN", "ADMIN", "MD", "GM", "SUPER_ADMIN"],
  },
  {
    key: "users",
    label: "Users",
    href: "/admin/users",
    roles: ["HR", "HR_ADMIN", "ADMIN", "MD", "GM", "SUPER_ADMIN"],
  },
  {
    key: "import",
    label: "Bulk Import",
    href: "/admin/import",
    roles: ["HR_ADMIN", "ADMIN", "SUPER_ADMIN"],
  },
  {
    key: "admin",
    label: "Policies",
    href: "/admin",
    roles: ["HR_ADMIN", "ADMIN", "SUPER_ADMIN"],
  },
  {
    key: "audit",
    label: "Audit Log",
    href: "/admin/audit",
    roles: ["HR_ADMIN", "ADMIN", "MD", "GM", "SUPER_ADMIN"],
  },
  {
    key: "system",
    label: "System Studio",
    href: "/system",
    roles: ["SUPER_ADMIN"],
  },
  { key: "settings", label: "Settings", href: "/settings" },
];

export const DEFAULT_FEATURES: FeatureFlags = {
  allowEmployeeSelfRequest: true,
  showTeamCoverage: true,
  showReports: true,
  enableBulkImport: true,
  requireManagerApproval: false,
};

export async function getSystemSettings() {
  const existing = await prisma.systemSettings.findUnique({
    where: { id: "default" },
  });

  if (existing) return existing;

  return prisma.systemSettings.create({
    data: { id: "default" },
  });
}

export function resolveNav(
  settings: {
    navConfig: unknown;
    featureFlags: unknown;
  },
  role?: Role,
) {
  const overrides = Array.isArray(settings.navConfig)
    ? (settings.navConfig as NavOverride[])
    : [];
  const flags = {
    ...DEFAULT_FEATURES,
    ...((settings.featureFlags as FeatureFlags) || {}),
  };

  return DEFAULT_NAV.map((item) => {
    const override = overrides.find((o) => o.key === item.key);
    let hidden = Boolean(override?.hidden);

    if (item.key === "reports" && flags.showReports === false) hidden = true;
    if (item.key === "team" && flags.showTeamCoverage === false) hidden = true;
    if (item.key === "import" && flags.enableBulkImport === false) hidden = true;
    if (item.key === "request_new" && flags.allowEmployeeSelfRequest === false) {
      hidden = true;
    }

    if (role && item.roles && !item.roles.includes(role)) {
      hidden = true;
    }

    return {
      ...item,
      label: override?.label?.trim() || item.label,
      hidden,
    };
  }).filter((item) => !item.hidden);
}

export function brandingStyle(settings: {
  primaryColor: string;
  secondaryColor: string;
  canvasColor?: string | null;
  accentColor?: string | null;
  designPreset?: string | null;
}) {
  const canvas = settings.canvasColor || "#eef2f6";
  const accent = settings.accentColor || "#fdecec";
  const preset = settings.designPreset || "industrial";
  const radius =
    preset === "sharp" ? "0.35rem" : preset === "soft" ? "1.25rem" : "0.95rem";

  return {
    ["--primary" as string]: settings.primaryColor,
    ["--ring" as string]: settings.primaryColor,
    ["--sidebar" as string]: settings.secondaryColor,
    ["--canvas" as string]: canvas,
    ["--muted" as string]: canvas,
    ["--accent" as string]: accent,
    ["--radius" as string]: radius,
  };
}
