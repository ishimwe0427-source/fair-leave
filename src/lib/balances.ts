import { prisma } from "@/lib/db";

/** Create yearly leave balances for a user from country policies. */
export async function ensureUserBalances(
  userId: string,
  country: string,
  year = new Date().getFullYear(),
) {
  const leaveTypes = await prisma.leaveType.findMany({ where: { active: true } });

  for (const leaveType of leaveTypes) {
    const policy = await prisma.leavePolicy.findUnique({
      where: {
        leaveTypeId_country: { leaveTypeId: leaveType.id, country },
      },
    });

    await prisma.leaveBalance.upsert({
      where: {
        userId_leaveTypeId_year: { userId, leaveTypeId: leaveType.id, year },
      },
      create: {
        userId,
        leaveTypeId: leaveType.id,
        year,
        entitled: policy?.entitlementDays ?? 0,
        carried: 0,
        used: 0,
        pending: 0,
      },
      update: {},
    });
  }
}
