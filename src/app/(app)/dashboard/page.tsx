import Link from "next/link";
import {
  CalendarClock,
  CircleCheckBig,
  Clock3,
  WalletCards,
} from "lucide-react";
import { format } from "date-fns";
import { LeaveTrendChart } from "@/components/dashboard/leave-trend-chart";
import { NotificationsPanel } from "@/components/dashboard/notifications-panel";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentUser, canManageTeam } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { runLeaveReminders } from "@/lib/leave-reminders";
import { getSystemSettings } from "@/lib/system";
import { formatDays, fullName } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const settings = await getSystemSettings();

  const year = new Date().getFullYear();
  const isManager = canManageTeam(user.role);
  if (isManager) await runLeaveReminders();

  const [balances, myRequests, pendingApprovals, notifications, trendRequests] =
    await Promise.all([
      prisma.leaveBalance.findMany({
        where: { userId: user.id, year },
        include: { leaveType: true },
        orderBy: { leaveType: { sortOrder: "asc" } },
      }),
      prisma.leaveRequest.findMany({
        where: { userId: user.id },
        include: { leaveType: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      isManager
        ? prisma.leaveRequest.count({
            where: {
              status: {
                in: [
                  "PENDING",
                  "PENDING_MANAGER",
                  "PENDING_HR",
                  "PENDING_EXECUTIVE",
                ],
              },
            },
          })
        : Promise.resolve(0),
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      isManager
        ? prisma.leaveRequest.findMany({
            where: {
              createdAt: {
                gte: new Date(`${year}-01-01`),
                lt: new Date(`${year + 1}-01-01`),
              },
            },
            select: { createdAt: true, status: true },
          })
        : Promise.resolve([]),
    ]);

  const annual = balances.find((b) => b.leaveType.code === "ANNUAL");
  const visibleBalances = balances.filter((b) => {
    const g = b.leaveType.eligibleGender;
    if (g === "ALL") return true;
    if (!user.gender || user.gender === "UNSPECIFIED") return false;
    return g === user.gender;
  });
  const available = annual
    ? annual.entitled + annual.carried - annual.used - annual.pending
    : 0;
  const pendingMine = myRequests.filter((r) =>
    [
      "PENDING",
      "PENDING_MANAGER",
      "PENDING_HR",
      "PENDING_EXECUTIVE",
    ].includes(r.status),
  ).length;
  const approvedMine = myRequests.filter((r) => r.status === "APPROVED").length;

  const monthMap = new Map<
    string,
    { month: string; approved: number; denied: number; pending: number }
  >();
  for (let m = 0; m < 12; m++) {
    const key = format(new Date(year, m, 1), "MMM");
    monthMap.set(key, { month: key, approved: 0, denied: 0, pending: 0 });
  }
  for (const req of trendRequests) {
    const key = format(req.createdAt, "MMM");
    const row = monthMap.get(key);
    if (!row) continue;
    if (req.status === "APPROVED") row.approved += 1;
    else if (req.status === "REJECTED" || req.status === "CANCELLED") row.denied += 1;
    else if (
      req.status === "PENDING" ||
      req.status === "PENDING_MANAGER" ||
      req.status === "PENDING_HR" ||
      req.status === "PENDING_EXECUTIVE"
    ) {
      row.pending += 1;
    }
  }
  const trendData = [...monthMap.values()];

  return (
    <div className="space-y-6">
      <div className="animate-fade-in flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="page-eyebrow">Dashboard</p>
          <h1 className="page-title">Welcome back, {user.firstName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {user.jobTitle || "Team member"} ·{" "}
            {user.department?.name || settings.companyName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isManager ? (
            <Link
              href="/approvals"
              className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-secondary"
            >
              Review approvals
            </Link>
          ) : null}
          <Link href="/requests/new" className="btn-primary !py-2.5">
            Request leave
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Annual available"
          value={formatDays(available)}
          hint={`${year} balance including carry-over`}
          icon={WalletCards}
          tone="primary"
        />
        <StatCard
          label="My pending"
          value={pendingMine}
          hint="Awaiting HR and/or MD/GM"
          icon={Clock3}
          tone="warn"
        />
        <StatCard
          label="Recently approved"
          value={approvedMine}
          hint="From your latest requests"
          icon={CircleCheckBig}
          tone="success"
        />
        {isManager ? (
          <StatCard
            label="Approvals waiting"
            value={pendingApprovals}
            hint="Action needed from you"
            icon={CalendarClock}
            tone="warn"
          />
        ) : (
          <StatCard
            label="Company"
            value={settings.productName}
            hint={settings.companyName}
            icon={CalendarClock}
          />
        )}
      </div>

      {isManager ? <LeaveTrendChart data={trendData} /> : null}

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="animate-rise app-panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Leave balances</h2>
            <span className="text-xs text-muted-foreground">{year}</span>
          </div>
          <div className="space-y-3">
            {visibleBalances.map((balance) => {
              const remaining =
                balance.entitled + balance.carried - balance.used - balance.pending;
              return (
                <div
                  key={balance.id}
                  className="rounded-xl border border-border bg-canvas px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: balance.leaveType.color }}
                      />
                      <div>
                        <p className="text-sm font-semibold">{balance.leaveType.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Used {balance.used} · Pending {balance.pending} · Carried{" "}
                          {balance.carried}
                        </p>
                      </div>
                    </div>
                    <p className="font-display text-lg font-semibold">{remaining}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <NotificationsPanel items={notifications} />
      </div>

      <section className="animate-rise app-panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Recent requests</h2>
          <Link href="/requests" className="text-sm font-semibold text-primary">
            View all
          </Link>
        </div>
        {myRequests.length === 0 ? (
          <div className="rounded-xl bg-canvas px-4 py-8 text-center text-sm text-muted-foreground">
            No leave requests yet.{" "}
            <Link href="/requests/new" className="font-semibold text-primary">
              Submit your first request
            </Link>
            .
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Dates</th>
                <th className="px-2 py-2">Days</th>
                <th className="px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {myRequests.map((request) => (
                <tr key={request.id} className="border-t border-border">
                  <td className="px-2 py-3 font-medium">{request.leaveType.name}</td>
                  <td className="px-2 py-3 text-muted-foreground">
                    {format(request.startDate, "dd MMM")} –{" "}
                    {format(request.endDate, "dd MMM yyyy")}
                  </td>
                  <td className="px-2 py-3">{request.days}</td>
                  <td className="px-2 py-3">
                    <StatusBadge status={request.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          Signed in as {fullName(user)} ({user.email})
        </p>
      </section>
    </div>
  );
}
