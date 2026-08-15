import { format } from "date-fns";
import { redirect } from "next/navigation";
import { LeaveRequestStatus, Prisma } from "@prisma/client";
import { LeaveCharts } from "@/components/reports/leave-charts";
import { canManageTeam, getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertFeature } from "@/lib/features";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    status?: string;
    from?: string;
    to?: string;
    year?: string;
  }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageTeam(session.role)) redirect("/dashboard");
  const feature = await assertFeature("showReports");
  if (!feature.ok) redirect("/dashboard");

  const params = await searchParams;
  const year = Number(params.year) || new Date().getFullYear();
  const q = (params.q || "").trim();
  const typeId = (params.type || "").trim();
  const status = (params.status || "").trim() as LeaveRequestStatus | "";
  const from = (params.from || "").trim();
  const to = (params.to || "").trim();

  const where: Prisma.LeaveRequestWhereInput = {
    AND: [
      {
        startDate: {
          gte: from ? new Date(from) : new Date(`${year}-01-01`),
          lte: to ? new Date(to) : new Date(`${year}-12-31`),
        },
      },
      status ? { status } : { status: "APPROVED" },
      typeId ? { leaveTypeId: typeId } : {},
      q
        ? {
            OR: [
              { reason: { contains: q, mode: "insensitive" } },
              {
                user: {
                  OR: [
                    { firstName: { contains: q, mode: "insensitive" } },
                    { lastName: { contains: q, mode: "insensitive" } },
                    { email: { contains: q, mode: "insensitive" } },
                    { employeeCode: { contains: q, mode: "insensitive" } },
                  ],
                },
              },
              { leaveType: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {},
    ],
  };

  const [requests, leaveTypes, allYearApproved] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      include: { leaveType: true, user: { include: { department: true } } },
      orderBy: { startDate: "desc" },
      take: 500,
    }),
    prisma.leaveType.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.leaveRequest.findMany({
      where: {
        status: "APPROVED",
        startDate: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
      },
      include: { leaveType: true, user: { include: { department: true } } },
    }),
  ]);

  const chartSource = status || q || typeId || from || to ? requests : allYearApproved;

  const byTypeMap = new Map<string, number>();
  const byMonthMap = new Map<string, number>();
  const byDeptMap = new Map<string, number>();
  const growth: { name: string; days: number; cumulative: number }[] = [];

  for (let m = 0; m < 12; m++) {
    byMonthMap.set(format(new Date(year, m, 1), "MMM"), 0);
  }

  for (const request of chartSource) {
    byTypeMap.set(
      request.leaveType.name,
      (byTypeMap.get(request.leaveType.name) || 0) + request.days,
    );
    const month = format(request.startDate, "MMM");
    byMonthMap.set(month, (byMonthMap.get(month) || 0) + request.days);
    const dept = request.user.department?.name || "Unassigned";
    byDeptMap.set(dept, (byDeptMap.get(dept) || 0) + request.days);
  }

  let running = 0;
  for (const [name, days] of byMonthMap.entries()) {
    running += days;
    growth.push({ name, days, cumulative: running });
  }

  const byType = Array.from(byTypeMap.entries()).map(([name, value]) => ({
    name,
    value,
  }));
  const byMonth = Array.from(byMonthMap.entries()).map(([name, days]) => ({
    name,
    days,
  }));
  const byDept = Array.from(byDeptMap.entries())
    .map(([name, days]) => ({ name, days }))
    .sort((a, b) => b.days - a.days)
    .slice(0, 8);

  const totalDays = chartSource.reduce((sum, r) => sum + r.days, 0);
  const uniquePeople = new Set(chartSource.map((r) => r.userId)).size;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Reports
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold">
            Leave analytics {year}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalDays} days · {uniquePeople} people · search and export for leadership reviews
          </p>
        </div>
        <a
          href="/api/exports?kind=requests"
          className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold"
        >
          Download Excel
        </a>
      </div>

      <form className="grid gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm md:grid-cols-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search employee, code, type, reason..."
          className="rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm md:col-span-2"
        />
        <select
          name="type"
          defaultValue={typeId}
          className="rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm"
        >
          <option value="">All leave types</option>
          {leaveTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status}
          className="rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm"
        >
          <option value="">Approved (default)</option>
          <option value="APPROVED">Approved</option>
          <option value="PENDING_MANAGER">Pending manager</option>
          <option value="PENDING_HR">Pending HR</option>
          <option value="PENDING_EXECUTIVE">Pending executive</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <input
          name="from"
          type="date"
          defaultValue={from}
          className="rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm"
        />
        <input
          name="to"
          type="date"
          defaultValue={to}
          className="rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm"
        />
        <input type="hidden" name="year" value={String(year)} />
        <button
          type="submit"
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white md:col-span-6 md:w-fit"
        >
          Search reports
        </button>
      </form>

      <LeaveCharts byType={byType} byMonth={byMonth} byDept={byDept} growth={growth} />

      <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-canvas text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Days</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">
                  {request.user.firstName} {request.user.lastName}
                  <p className="text-xs font-normal text-muted-foreground">
                    {request.user.employeeCode}
                  </p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {request.user.department?.name || "—"}
                </td>
                <td className="px-4 py-3">{request.leaveType.name}</td>
                <td className="px-4 py-3 text-xs font-semibold">{request.status}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {format(request.startDate, "dd MMM")} –{" "}
                  {format(request.endDate, "dd MMM yyyy")}
                </td>
                <td className="px-4 py-3">{request.days}</td>
              </tr>
            ))}
            {!requests.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No leave rows match this search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
