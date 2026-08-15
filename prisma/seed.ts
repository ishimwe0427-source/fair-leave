/**
 * Production bootstrap — baseline catalog only.
 * Does NOT create demo users or sample leave requests.
 *
 * Clean install (wipes users/requests, keeps you ready for /setup):
 *   FAIRLEAVE_RESET=1 npm run db:seed
 *
 * Then open the app and complete /setup.
 */
import { PrismaClient } from "@prisma/client";
import { ensureBaselineCatalog } from "../src/lib/bootstrap";

const prisma = new PrismaClient();

async function resetTransactionalData() {
  console.log("FAIRLEAVE_RESET=1 — clearing users, sessions, and leave data...");
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.leaveApproval.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.importJob.deleteMany();
  await prisma.authSession.deleteMany();
  await prisma.user.deleteMany();
  await prisma.blackoutPeriod.deleteMany();
  // Leave types/policies/holidays/departments refreshed by ensureBaselineCatalog
  await prisma.leavePolicy.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.department.deleteMany();
  await prisma.systemSettings.deleteMany();
}

async function main() {
  console.log("Bootstrapping FairLeave production baseline...");
  if (process.env.FAIRLEAVE_RESET === "1") {
    await resetTransactionalData();
  }
  await ensureBaselineCatalog(prisma);
  console.log("Baseline ready: settings, departments, leave types, policies, holidays.");
  console.log("Next: open the app and complete /setup to create the Super Admin.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
