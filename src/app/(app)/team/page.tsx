import { redirect } from "next/navigation";
import { canManageTeam, getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertFeature } from "@/lib/features";
import { coverageScore } from "@/lib/leave-engine";
import { formatDays, fullName, initials } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants";

export default async function TeamPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageTeam(session.role)) redirect("/dashboard");
  const feature = await assertFeature("showTeamCoverage");
  if (!feature.ok) redirect("/dashboard");

  const year = new Date().getFullYear();
  const users = await prisma.user.findMany({
    where:
      session.role === "MANAGER"
        ? { OR: [{ managerId: session.id }, { id: session.id }] }
        : { status: "ACTIVE" },
    include: {
      department: true,
      leaveBalances: {
        where: { year, leaveType: { code: "ANNUAL" } },
        include: { leaveType: true },
      },
      leaveRequests: {
        where: {
          status: { in: ["APPROVED", "PENDING"] },
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
      },
    },
    orderBy: [{ department: { name: "asc" } }, { firstName: "asc" }],
  });

  const onLeave = users.filter((u) => u.leaveRequests.length > 0).length;
  const coverage = coverageScore(onLeave, users.length);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Team
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold">Workforce leave view</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Coverage today: <strong>{coverage}%</strong> available · {onLeave} currently on leave
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {users.map((user) => {
          const annual = user.leaveBalances[0];
          const available = annual
            ? annual.entitled + annual.carried - annual.used - annual.pending
            : 0;
          const away = user.leaveRequests[0];

          return (
            <article
              key={user.id}
              className="animate-rise rounded-2xl border border-border bg-white p-5 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: user.avatarColor }}
                >
                  {initials(user)}
                </div>
                <div>
                  <h2 className="font-semibold">{fullName(user)}</h2>
                  <p className="text-xs text-muted-foreground">
                    {user.jobTitle} · {ROLE_LABELS[user.role]}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {user.department?.name} · {user.country}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-canvas px-3 py-2">
                  <p className="text-xs text-muted-foreground">Annual left</p>
                  <p className="font-display text-lg font-semibold">
                    {formatDays(available)}
                  </p>
                </div>
                <div className="rounded-xl bg-canvas px-3 py-2">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-display text-lg font-semibold">
                    {away ? "On leave" : "Available"}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
