import { addDays, format, startOfDay } from "date-fns";
import { prisma } from "@/lib/db";

/**
 * Idempotent day-before reminders for leadership when leave is about to start.
 * Safe to call from dashboard/approvals page loads.
 */
export async function runLeaveReminders() {
  const tomorrow = startOfDay(addDays(new Date(), 1));
  const dayAfter = addDays(tomorrow, 1);

  const startingSoon = await prisma.leaveRequest.findMany({
    where: {
      status: {
        in: [
          "PENDING_MANAGER",
          "PENDING_HR",
          "PENDING_EXECUTIVE",
          "PENDING",
          "APPROVED",
        ],
      },
      startDate: { gte: tomorrow, lt: dayAfter },
    },
    include: {
      user: { select: { firstName: true, lastName: true } },
      leaveType: { select: { name: true } },
    },
    take: 50,
  });

  if (!startingSoon.length) return;

  const leaders = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      role: { in: ["HR_ADMIN", "ADMIN", "MD", "GM", "SUPER_ADMIN"] },
    },
    select: { id: true },
  });

  for (const req of startingSoon) {
    const title = `Leave starts tomorrow · ${req.user.firstName} ${req.user.lastName}`;
    for (const leader of leaders) {
      const exists = await prisma.notification.findFirst({
        where: {
          userId: leader.id,
          type: "LEAVE_REMINDER",
          title,
          createdAt: { gte: startOfDay(new Date()) },
        },
      });
      if (exists) continue;
      await prisma.notification.create({
        data: {
          userId: leader.id,
          type: "LEAVE_REMINDER",
          title,
          body: `${req.leaveType.name} from ${format(req.startDate, "dd MMM")} (${req.status.replace(/_/g, " ")}).`,
          href: "/approvals",
        },
      });
    }
  }
}
