import type { PrismaClient } from "@prisma/client";

const LEAVE_TYPES = [
  {
    name: "Annual Leave",
    code: "ANNUAL",
    description: "Paid vacation leave",
    color: "#d32f2f",
    paid: true,
    requiresDoc: false,
    sortOrder: 1,
    entitlement: 21,
    carryOverMax: 5,
    minNoticeDays: 7,
    maxConsecutive: 15,
  },
  {
    name: "Sick Leave",
    code: "SICK",
    description: "Medical leave (supporting document required)",
    color: "#0369a1",
    paid: true,
    requiresDoc: true,
    sortOrder: 2,
    entitlement: 14,
    carryOverMax: 0,
    minNoticeDays: 0,
    maxConsecutive: null as number | null,
  },
  {
    name: "Maternity Leave",
    code: "MATERNITY",
    description: "Maternity leave for female employees (local labor law)",
    color: "#7c3aed",
    paid: true,
    requiresDoc: true,
    eligibleGender: "FEMALE" as const,
    sortOrder: 3,
    entitlement: 84,
    carryOverMax: 0,
    minNoticeDays: 14,
    maxConsecutive: null,
  },
  {
    name: "Paternity Leave",
    code: "PATERNITY",
    description: "Paternity leave for male employees",
    color: "#0f766e",
    paid: true,
    requiresDoc: false,
    eligibleGender: "MALE" as const,
    sortOrder: 4,
    entitlement: 4,
    carryOverMax: 0,
    minNoticeDays: 3,
    maxConsecutive: null,
  },
  {
    name: "Compassionate Leave",
    code: "COMPASSIONATE",
    description: "Bereavement and family emergencies",
    color: "#b45309",
    paid: true,
    requiresDoc: false,
    sortOrder: 5,
    entitlement: 5,
    carryOverMax: 0,
    minNoticeDays: 0,
    maxConsecutive: null,
  },
  {
    name: "Unpaid Leave",
    code: "UNPAID",
    description: "Leave without pay",
    color: "#52525b",
    paid: false,
    requiresDoc: false,
    sortOrder: 6,
    entitlement: 30,
    carryOverMax: 0,
    minNoticeDays: 3,
    maxConsecutive: null,
  },
] as const;

const DEPARTMENTS = [
  { name: "Executive Office", code: "EXE" },
  { name: "Human Resources", code: "HR" },
  { name: "Operations", code: "OPS" },
  { name: "Engineering", code: "ENG" },
  { name: "Finance", code: "FIN" },
  { name: "Fleet & Logistics", code: "FLT" },
] as const;

const SYSTEM_ORG_ROLES = [
  {
    code: "EMPLOYEE",
    name: "Employee",
    description: "Standard workforce — request leave",
    baseRole: "EMPLOYEE" as const,
  },
  {
    code: "MANAGER",
    name: "Manager",
    description: "Line manager — optional first leave reviewer",
    baseRole: "MANAGER" as const,
  },
  {
    code: "HR",
    name: "HR",
    description: "Add users and reset passwords only",
    baseRole: "HR" as const,
  },
  {
    code: "HR_ADMIN",
    name: "HR Admin",
    description: "HR review, policies, and full user administration",
    baseRole: "HR_ADMIN" as const,
  },
  {
    code: "ADMIN",
    name: "Admin",
    description: "Company admin — users, policies, reports (not System Studio)",
    baseRole: "ADMIN" as const,
  },
  {
    code: "MD",
    name: "Managing Director",
    description: "Final executive leave approval + user management",
    baseRole: "MD" as const,
  },
  {
    code: "GM",
    name: "General Manager",
    description: "Final executive leave approval + user management",
    baseRole: "GM" as const,
  },
  {
    code: "SUPER_ADMIN",
    name: "Super Admin",
    description: "Full system control including white-label System Studio",
    baseRole: "SUPER_ADMIN" as const,
  },
] as const;

const COUNTRIES = ["RW", "UG", "KE"] as const;

/** Idempotent baseline: departments, leave types, policies, holidays, settings shell. */
export async function ensureBaselineCatalog(db: PrismaClient) {
  const year = new Date().getFullYear();

  await db.systemSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      companyName: "Fair Construction Ltd",
      productName: "FairLeave",
      tagline: "Enterprise leave operations for international teams",
      supportEmail: "support@fairconstruction.rw",
      logoUrl: "/branding/fair-construction-logo.png",
      primaryColor: "#d32f2f",
      secondaryColor: "#111827",
      loginTitle: "Sign in to FairLeave",
      loginSubtitle: "Enterprise leave operations for your workforce.",
      landingHeadline: "Leave that keeps sites moving",
      landingBody:
        "Request, approve, and track leave with country policies, balances, bulk onboarding, and Super Admin white-label controls.",
      footerText: "Enterprise leave management",
      showLandingStats: true,
      showMarketingPage: true,
      employeeCodePrefix: "FC",
    },
    update: {},
  });

  for (const dept of DEPARTMENTS) {
    await db.department.upsert({
      where: { code: dept.code },
      create: dept,
      update: { name: dept.name, active: true },
    });
  }

  for (const role of SYSTEM_ORG_ROLES) {
    await db.orgRole.upsert({
      where: { code: role.code },
      create: {
        name: role.name,
        code: role.code,
        description: role.description,
        baseRole: role.baseRole,
        isSystem: true,
        active: true,
      },
      update: {
        baseRole: role.baseRole,
        isSystem: true,
        active: true,
      },
    });
  }

  // Link users missing orgRole to the matching system role
  const orgRoles = await db.orgRole.findMany({ where: { isSystem: true } });
  for (const orgRole of orgRoles) {
    await db.user.updateMany({
      where: { role: orgRole.baseRole, orgRoleId: null },
      data: { orgRoleId: orgRole.id },
    });
  }

  for (const item of LEAVE_TYPES) {
    const {
      entitlement,
      carryOverMax,
      minNoticeDays,
      maxConsecutive,
      ...typeData
    } = item;

    const leaveType = await db.leaveType.upsert({
      where: { code: item.code },
      create: typeData,
      update: {
        name: item.name,
        description: item.description,
        color: item.color,
        paid: item.paid,
        requiresDoc: item.requiresDoc,
        sortOrder: item.sortOrder,
        active: true,
        ...("eligibleGender" in item
          ? { eligibleGender: item.eligibleGender }
          : {}),
      },
    });

    for (const country of COUNTRIES) {
      await db.leavePolicy.upsert({
        where: {
          leaveTypeId_country: {
            leaveTypeId: leaveType.id,
            country,
          },
        },
        create: {
          leaveTypeId: leaveType.id,
          country,
          entitlementDays: entitlement,
          carryOverMax,
          minNoticeDays,
          maxConsecutive,
        },
        update: {
          entitlementDays: entitlement,
          carryOverMax,
          minNoticeDays,
          maxConsecutive,
        },
      });
    }
  }

  const holidays = [
    { name: "New Year's Day", date: new Date(`${year}-01-01`), country: "RW" },
    { name: "National Heroes Day", date: new Date(`${year}-02-01`), country: "RW" },
    { name: "Genocide Memorial Day", date: new Date(`${year}-04-07`), country: "RW" },
    { name: "Labour Day", date: new Date(`${year}-05-01`), country: "RW" },
    { name: "Independence Day", date: new Date(`${year}-07-01`), country: "RW" },
    { name: "Liberation Day", date: new Date(`${year}-07-04`), country: "RW" },
    { name: "Umuganura", date: new Date(`${year}-08-01`), country: "RW" },
    { name: "Christmas Day", date: new Date(`${year}-12-25`), country: "RW" },
    { name: "Boxing Day", date: new Date(`${year}-12-26`), country: "RW" },
    { name: "Jamhuri Day", date: new Date(`${year}-12-12`), country: "KE" },
    { name: "Independence Day", date: new Date(`${year}-10-09`), country: "UG" },
  ];

  for (const holiday of holidays) {
    const existing = await db.holiday.findFirst({
      where: {
        name: holiday.name,
        country: holiday.country,
        date: holiday.date,
      },
    });
    if (!existing) {
      await db.holiday.create({ data: holiday });
    }
  }
}
