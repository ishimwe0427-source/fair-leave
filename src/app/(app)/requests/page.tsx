import { format } from "date-fns";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AttachmentActions } from "@/components/leave/attachment-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { CancelButton } from "@/components/leave/cancel-button";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function RequestsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const requests = await prisma.leaveRequest.findMany({
    where: { userId: session.id },
    include: { leaveType: true, approvals: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Requests
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold">My leave requests</h1>
        </div>
        <Link
          href="/requests/new"
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
        >
          New request
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        {requests.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            No requests yet.{" "}
            <Link href="/requests/new" className="font-semibold text-primary">
              Request leave
            </Link>
          </div>
        ) : (
        <table className="min-w-full text-left text-sm">
          <thead className="bg-canvas text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Days</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Document</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id} className="border-t border-border align-top">
                <td className="px-4 py-4 font-medium">{request.leaveType.name}</td>
                <td className="px-4 py-4 text-muted-foreground">
                  {format(request.startDate, "dd MMM yyyy")} –{" "}
                  {format(request.endDate, "dd MMM yyyy")}
                </td>
                <td className="px-4 py-4">{request.days}</td>
                <td className="px-4 py-4">
                  <StatusBadge status={request.status} />
                </td>
                <td className="max-w-xs px-4 py-4 text-muted-foreground">
                  {request.reason}
                </td>
                <td className="px-4 py-4">
                  {request.attachment ? (
                    <AttachmentActions
                      requestId={request.id}
                      fileLabel={request.attachment}
                      compact
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  {[
                    "PENDING",
                    "PENDING_MANAGER",
                    "PENDING_HR",
                    "PENDING_EXECUTIVE",
                    "APPROVED",
                  ].includes(request.status) ? (
                    <CancelButton requestId={request.id} />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
}
