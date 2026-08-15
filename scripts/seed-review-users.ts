/**
 * Upsert one review account per role for QA / buyer walkthroughs.
 * Password for all: FairLeave!2026
 *
 *   npm run db:review-users
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ensureBaselineCatalog } from "../src/lib/bootstrap";
import { ensureUserBalances } from "../src/lib/balances";

const prisma = new PrismaClient();

const REVIEW_PASSWORD = "FairLeave!2026";

const USERS = [
  {
    email: "employee@fairleave.demo",
    firstName: "Aline",
    lastName: "Uwase",
    employeeCode: "FC-EMP-001",
    role: "EMPLOYEE" as const,
    gender: "FEMALE" as const,
    jobTitle: "Site Administrator",
  },
  {
    email: "manager@fairleave.demo",
    firstName: "Eric",
    lastName: "Niyonsenga",
    employeeCode: "FC-MGR-001",
    role: "MANAGER" as const,
    gender: "MALE" as const,
    jobTitle: "Operations Manager",
  },
  {
    email: "hr@fairleave.demo",
    firstName: "Grace",
    lastName: "Mukamana",
    employeeCode: "FC-HR-001",
    role: "HR" as const,
    gender: "FEMALE" as const,
    jobTitle: "HR Officer",
  },
  {
    email: "hradmin@fairleave.demo",
    firstName: "Diane",
    lastName: "Ingabire",
    employeeCode: "FC-HRA-001",
    role: "HR_ADMIN" as const,
    gender: "FEMALE" as const,
    jobTitle: "HR Admin",
  },
  {
    email: "admin@fairleave.demo",
    firstName: "Patrick",
    lastName: "Habimana",
    employeeCode: "FC-ADM-001",
    role: "ADMIN" as const,
    gender: "MALE" as const,
    jobTitle: "Company Admin",
  },
  {
    email: "md@fairleave.demo",
    firstName: "Jean",
    lastName: "Bizimana",
    employeeCode: "FC-MD-001",
    role: "MD" as const,
    gender: "MALE" as const,
    jobTitle: "Managing Director",
  },
  {
    email: "gm@fairleave.demo",
    firstName: "Claire",
    lastName: "Uwimana",
    employeeCode: "FC-GM-001",
    role: "GM" as const,
    gender: "FEMALE" as const,
    jobTitle: "General Manager",
  },
  {
    email: "superadmin@fairleave.demo",
    firstName: "Ishimwe",
    lastName: "Francois",
    employeeCode: "FC-SA-001",
    role: "SUPER_ADMIN" as const,
    gender: "MALE" as const,
    jobTitle: "Super Admin",
  },
] as const;

async function main() {
  await ensureBaselineCatalog(prisma);
  const passwordHash = await bcrypt.hash(REVIEW_PASSWORD, 12);
  const hrDept = await prisma.department.findFirst({ where: { code: "HR" } });
  const opsDept = await prisma.department.findFirst({ where: { code: "OPS" } });

  const created: Array<{ role: string; email: string }> = [];

  for (const u of USERS) {
    const orgRole = await prisma.orgRole.findFirst({
      where: { code: u.role, active: true },
    });
    if (!orgRole) {
      throw new Error(`Missing org role ${u.role}. Run npm run db:seed first.`);
    }

    const departmentId =
      u.role === "EMPLOYEE" || u.role === "MANAGER"
        ? opsDept?.id || null
        : hrDept?.id || null;

    const user = await prisma.user.upsert({
      where: { email: u.email },
      create: {
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        employeeCode: u.employeeCode,
        role: u.role,
        gender: u.gender,
        orgRoleId: orgRole.id,
        jobTitle: u.jobTitle,
        departmentId,
        country: "RW",
        status: "ACTIVE",
        passwordHash,
        mustChangePassword: false,
        hireDate: new Date("2024-01-15"),
      },
      update: {
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        gender: u.gender,
        orgRoleId: orgRole.id,
        jobTitle: u.jobTitle,
        departmentId,
        passwordHash,
        mustChangePassword: false,
        status: "ACTIVE",
      },
    });

    await ensureUserBalances(user.id, user.country);
    created.push({ role: u.role, email: u.email });
  }

  // Link employee → manager for coverage / optional manager approval path
  const employee = await prisma.user.findUnique({
    where: { email: "employee@fairleave.demo" },
  });
  const manager = await prisma.user.findUnique({
    where: { email: "manager@fairleave.demo" },
  });
  if (employee && manager) {
    await prisma.user.update({
      where: { id: employee.id },
      data: { managerId: manager.id },
    });
  }

  console.log("\nReview accounts ready (password for all): FairLeave!2026\n");
  for (const row of created) {
    console.log(`  ${row.role.padEnd(12)}  ${row.email}`);
  }
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
