import Link from "next/link";
import { format } from "date-fns";
import { redirect } from "next/navigation";
import { ImportForm } from "@/components/admin/import-form";
import { canAdminister, getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertFeature } from "@/lib/features";

export default async function ImportPage() {
  const session = await getSession();
  if (!session || !canAdminister(session.role)) redirect("/dashboard");
  const feature = await assertFeature("enableBulkImport");
  if (!feature.ok) redirect("/admin/users");

  const jobs = await prisma.importJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      createdBy: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Bulk import
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold">
            Upload workers at scale
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            CSV/Excel import with one-time credentials download. Built for large workforces.
          </p>
        </div>
        <a
          href="/api/imports/template"
          className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold"
        >
          Download template
        </a>
      </div>

      <ImportForm />

      <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold">Recent import jobs</h2>
        <div className="mt-4 space-y-4">
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No imports yet.</p>
          ) : (
            jobs.map((job) => {
              const errors = Array.isArray(job.errors)
                ? (job.errors as Array<{ row?: number; message?: string }>)
                : [];
              return (
                <article key={job.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{job.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {job.status} · success {job.successCount} · errors {job.errorCount} ·{" "}
                        {format(job.createdAt, "dd MMM yyyy HH:mm")}
                      </p>
                    </div>
                    {job.credentialsPath ? (
                      <Link
                        href={`/api/imports/${job.id}/credentials`}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Download credentials (once)
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">Credentials cleared</span>
                    )}
                  </div>
                  {errors.length > 0 ? (
                    <details className="mt-3 rounded-lg bg-canvas p-3">
                      <summary className="cursor-pointer text-sm font-semibold">
                        View {errors.length} error{errors.length === 1 ? "" : "s"}
                      </summary>
                      <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                        {errors.map((err, idx) => (
                          <li key={`${job.id}-${idx}`}>
                            Row {err.row ?? "?"}: {err.message || "Unknown error"}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
