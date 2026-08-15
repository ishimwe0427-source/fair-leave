import Link from "next/link";
import { format, startOfDay } from "date-fns";
import { redirect } from "next/navigation";
import { ApprovalActions } from "@/components/leave/approval-actions";
import { AttachmentActions } from "@/components/leave/attachment-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  canExportWorkforce,
  canManageTeam,
  getSession,
  isExecutiveRole,
  isHrRole,
} from "@/lib/auth";
import { canViewLeaveDocuments } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { runLeaveReminders } from "@/lib/leave-reminders";
import { fullName } from "@/lib/utils";

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageTeam(session.role)) redirect("/dashboard");

  await runLeaveReminders();

  const params = await searchParams;
  const q = (params.q || "").trim();
  const status = params.status || "waiting";

  const statusWhere =
    status === "done"
      ? { status: "APPROVED" as const }
      : status === "denied"
        ? { status: { in: ["REJECTED" as const, "CANCELLED" as const] } }
        : {
            status: {
              in: [
                "PENDING" as const,
                "PENDING_MANAGER" as const,
                "PENDING_HR" as const,
                "PENDING_EXECUTIVE" as const,
              ],
            },
          };

  const requests = await prisma.leaveRequest.findMany({
    where: {
      ...statusWhere,
      ...(q
        ? {
            OR: [
              { user: { firstName: { contains: q, mode: "insensitive" } } },
              { user: { lastName: { contains: q, mode: "insensitive" } } },
              { user: { email: { contains: q, mode: "insensitive" } } },
              { user: { employeeCode: { contains: q, mode: "insensitive" } } },
              { leaveType: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      user: { include: { department: true } },
      leaveType: true,
      approvals: { orderBy: { level: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Role-focused waiting queue
  const visible =
    status !== "waiting"
      ? requests
      : requests.filter((r) => {
          if (
            r.status === "PENDING_MANAGER" &&
            (r.user.managerId === session.id ||
              isHrRole(session.role) ||
              isExecutiveRole(session.role))
          ) {
            return true;
          }
          if (isHrRole(session.role) && (r.status === "PENDING_HR" || r.status === "PENDING")) {
            return true;
          }
          if (
            isExecutiveRole(session.role) &&
            (r.status === "PENDING_EXECUTIVE" ||
              r.status === "PENDING_HR" ||
              r.status === "PENDING_MANAGER" ||
              r.status === "PENDING")
          ) {
            return true;
          }
          return false;
        });

  const today = startOfDay(new Date());
  const canExport = canExportWorkforce(session.role);
  const canSeeDocs = canViewLeaveDocuments(session.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="page-eyebrow">Approvals</p>
          <h1 className="page-title">Leave decisions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Flow: Employee → (optional Manager) → HR → MD/GM final. Until MD/GM finishes, the
            request stays pending.
          </p>
        </div>
        {canExport ? (
          <div className="flex flex-wrap gap-2 text-sm">
            <a
              href="/api/exports?kind=pending"
              className="rounded-xl border border-border bg-white px-3 py-2 font-semibold"
            >
              Excel · pending
            </a>
            <a
              href="/api/exports?kind=denied"
              className="rounded-xl border border-border bg-white px-3 py-2 font-semibold"
            >
              Excel · denied
            </a>
            <a
              href="/api/exports?kind=requests"
              className="rounded-xl border border-border bg-white px-3 py-2 font-semibold"
            >
              Excel · all requests
            </a>
            <a
              href="/api/exports?kind=users"
              className="rounded-xl bg-primary px-3 py-2 font-semibold text-white"
            >
              Excel · users
            </a>
          </div>
        ) : null}
      </div>

      <form className="flex flex-wrap gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, email, code, leave type..."
          className="min-w-[220px] flex-1 rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm"
        />
        <select
          name="status"
          defaultValue={status}
          className="rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm"
        >
          <option value="waiting">Waiting approval</option>
          <option value="done">Approved / done</option>
          <option value="denied">Denied / cancelled</option>
        </select>
        <button
          type="submit"
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
        >
          Search
        </button>
      </form>

      <div className="grid gap-4">
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-border bg-white p-8 text-sm text-muted-foreground">
            No requests in this view.
          </div>
        ) : (
          visible.map((request) => {
            const overdue =
              startOfDay(request.startDate) < today &&
              [
                "PENDING",
                "PENDING_MANAGER",
                "PENDING_HR",
                "PENDING_EXECUTIVE",
              ].includes(request.status);
            const waiting =
              status === "waiting" &&
              [
                "PENDING",
                "PENDING_MANAGER",
                "PENDING_HR",
                "PENDING_EXECUTIVE",
              ].includes(request.status);

            return (
              <article
                key={request.id}
                className={`animate-rise rounded-2xl border bg-white p-5 shadow-sm ${
                  overdue ? "border-red-400 ring-1 ring-red-200" : "border-border"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-xl font-semibold">
                      {fullName(request.user)}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {request.user.jobTitle} · {request.user.department?.name}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <StatusBadge status={request.status} overdue={overdue} />
                      <span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold">
                        {request.leaveType.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(request.startDate, "dd MMM")} –{" "}
                        {format(request.endDate, "dd MMM yyyy")} · {request.days} day(s)
                      </span>
                    </div>
                    {overdue ? (
                      <p className="mt-2 text-xs font-semibold text-red-700">
                        Start date already passed while still awaiting approval — review the late
                        request note below.
                      </p>
                    ) : null}
                    <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm text-muted-foreground">
                      {request.reason}
                    </p>
                    {canSeeDocs && request.attachment ? (
                      <AttachmentActions
                        requestId={request.id}
                        fileLabel={request.attachment}
                      />
                    ) : canSeeDocs && request.leaveType.requiresDoc ? (
                      <p className="mt-3 text-xs font-medium text-amber-800">
                        This leave type usually requires a document, but none is on file.
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      Stages:{" "}
                      {request.approvals
                        .map(
                          (a) =>
                            `L${a.level} ${a.status}${a.comment ? ` (${a.comment})` : ""}`,
                        )
                        .join(" · ") || "Awaiting first action"}
                    </p>
                  </div>
                  {waiting ? (
                    <div className="w-full max-w-sm">
                      <ApprovalActions requestId={request.id} />
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {request.status === "PENDING_EXECUTIVE"
                          ? "MD/GM: this is the final approval."
                          : request.status === "PENDING_MANAGER"
                            ? "Manager: approve to send to HR, or deny to close. HR/MD/GM may also act here."
                            : "HR: approve to send to MD/GM, or deny to close. MD/GM may also finalize here."}
                      </p>
                    </div>
                  ) : (
                    <Link
                      href="/requests"
                      className="text-sm font-semibold text-primary"
                    >
                      View history
                    </Link>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
