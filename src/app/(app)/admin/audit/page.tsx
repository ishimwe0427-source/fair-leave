import Link from "next/link";
import { format } from "date-fns";
import { redirect } from "next/navigation";
import { canViewAudit, getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fullName } from "@/lib/utils";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; action?: string; page?: string }>;
}) {
  const session = await getSession();
  if (!session || !canViewAudit(session.role)) redirect("/dashboard");

  const params = await searchParams;
  const q = (params.q || "").trim();
  const action = (params.action || "").trim();
  const page = Math.max(1, Number(params.page || "1") || 1);
  const pageSize = 40;

  const where = {
    AND: [
      action ? { action: { contains: action, mode: "insensitive" as const } } : {},
      q
        ? {
            OR: [
              { action: { contains: q, mode: "insensitive" as const } },
              { entity: { contains: q, mode: "insensitive" as const } },
              { entityId: { contains: q, mode: "insensitive" as const } },
              {
                user: {
                  OR: [
                    { email: { contains: q, mode: "insensitive" as const } },
                    { firstName: { contains: q, mode: "insensitive" as const } },
                    { lastName: { contains: q, mode: "insensitive" as const } },
                  ],
                },
              },
            ],
          }
        : {},
    ],
  };

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const exportQs = new URLSearchParams();
  if (q) exportQs.set("q", q);
  if (action) exportQs.set("action", action);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Security
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold">Audit log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Who did what, and when — for compliance and incident review ({total.toLocaleString()}{" "}
            events).
          </p>
        </div>
        <a
          href={`/api/exports?kind=audit&${exportQs.toString()}`}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
        >
          Download Excel report
        </a>
      </div>

      <form className="flex flex-wrap gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search actor, action, entity..."
          className="min-w-[240px] flex-1 rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm"
        />
        <input
          name="action"
          defaultValue={action}
          placeholder="Action filter e.g. CREATE_USER"
          className="min-w-[180px] rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm"
        />
        <button
          type="submit"
          className="rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold"
        >
          Search
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-canvas text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Who</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-border align-top">
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {format(log.createdAt, "dd MMM yyyy HH:mm")}
                </td>
                <td className="px-4 py-3">
                  {log.user ? (
                    <>
                      <p className="font-medium">{fullName(log.user)}</p>
                      <p className="text-xs text-muted-foreground">{log.user.email}</p>
                    </>
                  ) : (
                    <span className="text-muted-foreground">System</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs font-semibold">{log.action}</td>
                <td className="px-4 py-3">
                  <p>{log.entity}</p>
                  {log.entityId ? (
                    <p className="font-mono text-[11px] text-muted-foreground">{log.entityId}</p>
                  ) : null}
                </td>
                <td className="max-w-xs px-4 py-3 text-xs text-muted-foreground">
                  {log.meta ? JSON.stringify(log.meta) : "—"}
                </td>
              </tr>
            ))}
            {!logs.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  No audit events match this search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          Page {page} of {pages}
        </p>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link
              href={`/admin/audit?q=${encodeURIComponent(q)}&action=${encodeURIComponent(action)}&page=${page - 1}`}
              className="rounded-lg border border-border px-3 py-1.5"
            >
              Previous
            </Link>
          ) : null}
          {page < pages ? (
            <Link
              href={`/admin/audit?q=${encodeURIComponent(q)}&action=${encodeURIComponent(action)}&page=${page + 1}`}
              className="rounded-lg border border-border px-3 py-1.5"
            >
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
