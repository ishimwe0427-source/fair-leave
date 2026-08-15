import {
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { canAdminister, canManageTeam, getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSystemSettings } from "@/lib/system";
import { cn, fullName } from "@/lib/utils";

export default async function CalendarPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const settings = await getSystemSettings();

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  let leaveWhere: Prisma.LeaveRequestWhereInput = {
    status: { in: ["APPROVED", "PENDING"] },
    startDate: { lte: monthEnd },
    endDate: { gte: monthStart },
  };

  if (canAdminister(session.role)) {
    // company-wide
  } else if (canManageTeam(session.role)) {
    leaveWhere = {
      ...leaveWhere,
      OR: [{ userId: session.id }, { user: { managerId: session.id } }],
    };
  } else {
    leaveWhere = {
      ...leaveWhere,
      OR: [
        { userId: session.id },
        ...(session.departmentId
          ? [{ user: { departmentId: session.departmentId }, status: "APPROVED" as const }]
          : []),
      ],
    };
  }

  const [leaves, holidays] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: leaveWhere,
      include: { user: true, leaveType: true },
    }),
    prisma.holiday.findMany({
      where: { date: { gte: monthStart, lte: monthEnd } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Calendar
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold">
          {format(now, "MMMM yyyy")} team leave
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Leave visibility for {settings.companyName} based on your role.
        </p>
      </div>

      <div className="grid gap-2 rounded-2xl border border-border bg-white p-4 shadow-sm md:grid-cols-7">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div
            key={d}
            className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {d}
          </div>
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayLeaves = leaves.filter(
            (leave) => leave.startDate <= day && leave.endDate >= day,
          );
          const holiday = holidays.find((h) => format(h.date, "yyyy-MM-dd") === key);

          return (
            <div
              key={key}
              className={cn(
                "min-h-28 rounded-xl border border-border p-2",
                !isSameMonth(day, now) && "bg-canvas/60 opacity-60",
                isToday(day) && "ring-2 ring-primary",
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">{format(day, "d")}</span>
                {holiday ? (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                    Holiday
                  </span>
                ) : null}
              </div>
              <div className="space-y-1">
                {dayLeaves.slice(0, 3).map((leave) => (
                  <div
                    key={`${leave.id}-${key}`}
                    className="truncate rounded-md px-1.5 py-1 text-[10px] font-medium text-white"
                    style={{ backgroundColor: leave.leaveType.color }}
                    title={`${fullName(leave.user)} · ${leave.leaveType.name}`}
                  >
                    {leave.user.firstName} · {leave.status === "PENDING" ? "P" : "A"}
                  </div>
                ))}
                {dayLeaves.length > 3 ? (
                  <p className="text-[10px] text-muted-foreground">
                    +{dayLeaves.length - 3} more
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
