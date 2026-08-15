import Link from "next/link";
import { format } from "date-fns";
import { redirect } from "next/navigation";
import {
  BlackoutForm,
  DeleteBlackoutButton,
  DeleteHolidayButton,
  HolidayForm,
  LeaveTypeForm,
} from "@/components/admin/policy-forms";
import { DepartmentManager } from "@/components/admin/department-manager";
import { LeaveWorkflowForm } from "@/components/admin/leave-workflow-form";
import { OrgRoleManager } from "@/components/admin/org-role-manager";
import { EmailTemplatesForm } from "@/components/system/email-templates-form";
import { canAdminister, canSuperAdmin, getSession } from "@/lib/auth";
import { ensureBaselineCatalog } from "@/lib/bootstrap";
import { prisma } from "@/lib/db";
import { isEmailConfigured } from "@/lib/email";
import { assignableRoles } from "@/lib/roles";
import { DEFAULT_FEATURES, type FeatureFlags } from "@/lib/system";
import { getSystemSettings } from "@/lib/system";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAdminister(session.role)) redirect("/dashboard");

  await ensureBaselineCatalog(prisma);
  const emailReady = isEmailConfigured();
  const systemSettings = await getSystemSettings();

  const [leaveTypes, policies, holidays, blackouts, departments, orgRoles, users, settings] =
    await Promise.all([
      prisma.leaveType.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.leavePolicy.findMany({
        include: { leaveType: true },
        orderBy: [{ country: "asc" }, { leaveType: { sortOrder: "asc" } }],
      }),
      prisma.holiday.findMany({ orderBy: { date: "asc" } }),
      prisma.blackoutPeriod.findMany({ orderBy: { startDate: "asc" } }),
      prisma.department.findMany({ orderBy: { name: "asc" } }),
      prisma.orgRole.findMany({
        orderBy: [{ isSystem: "desc" }, { name: "asc" }],
        include: { _count: { select: { users: true } } },
      }),
      prisma.user.count(),
      prisma.systemSettings.findUnique({ where: { id: "default" } }),
    ]);

  const flags: FeatureFlags = {
    ...DEFAULT_FEATURES,
    ...((settings?.featureFlags as FeatureFlags) || {}),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Admin
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold">
            Policy & configuration
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {users.toLocaleString()} users · {departments.length} departments ·{" "}
            {orgRoles.length} roles · live policy control
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/users" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white">
            Manage users
          </Link>
          {canSuperAdmin(session.role) ? (
            <Link
              href="/system"
              className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold"
            >
              System Studio
            </Link>
          ) : null}
        </div>
      </div>

      <div
        className={`app-panel px-5 py-4 text-sm ${
          emailReady
            ? "border-emerald-200 bg-emerald-50/80 text-emerald-900"
            : "border-amber-200 bg-amber-50/80 text-amber-950"
        }`}
      >
        <p className="font-semibold">
          {emailReady ? "Official email is configured" : "Official email is not configured yet"}
        </p>
        <p className="mt-1 text-xs leading-relaxed opacity-90">
          {emailReady
            ? "Welcome emails, password resets, and leave approve/deny/cancel notices go to each user’s registered address (Gmail or company email). The same result also appears on their dashboard."
            : "Fill SMTP_USER + SMTP_PASS in .env (Gmail App Password — see docs/EMAIL.md), then restart. In development without SMTP, FairLeave uses Ethereal test mail and prints a preview URL in the terminal. Dashboard notifications still work either way."}
        </p>
      </div>

      <LeaveWorkflowForm requireManagerApproval={Boolean(flags.requireManagerApproval)} />

      <div id="emails">
        <EmailTemplatesForm
          settings={{
            emailIncludeLogo: systemSettings.emailIncludeLogo,
            emailApprovedMessage: systemSettings.emailApprovedMessage,
            emailDeniedMessage: systemSettings.emailDeniedMessage,
            emailCancelledMessage: systemSettings.emailCancelledMessage,
            logoUrl: systemSettings.logoUrl,
            companyName: systemSettings.companyName,
          }}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold">Leave types</h2>
          <div className="mt-4 space-y-2">
            {leaveTypes.map((type) => (
              <div key={type.id} className="rounded-xl border border-border px-3 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: type.color }}
                  />
                  <span className="font-semibold">{type.name}</span>
                  <span className="text-xs text-muted-foreground">{type.code}</span>
                </div>
              </div>
            ))}
          </div>
          <LeaveTypeForm />

          <h3 className="mt-6 font-display text-base font-semibold">Country policies</h3>
          <div className="mt-3 space-y-2">
            {policies.map((policy) => (
              <div key={policy.id} className="rounded-xl bg-canvas px-3 py-2 text-sm">
                <span className="font-medium">{policy.country}</span> · {policy.leaveType.name} ·{" "}
                {policy.entitlementDays} days
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold">Holidays</h2>
          <div className="mt-4 space-y-2">
            {holidays.length === 0 ? (
              <p className="text-sm text-muted-foreground">No holidays yet.</p>
            ) : (
              holidays.map((holiday) => (
                <div
                  key={holiday.id}
                  className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"
                >
                  <span>
                    {holiday.name} · {format(holiday.date, "dd MMM yyyy")} ({holiday.country})
                  </span>
                  <DeleteHolidayButton id={holiday.id} />
                </div>
              ))
            )}
          </div>
          <HolidayForm />

          <h3 className="mt-6 font-display text-base font-semibold">Blackout periods</h3>
          <div className="mt-3 space-y-2">
            {blackouts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No blackout periods.</p>
            ) : (
              blackouts.map((period) => (
                <div key={period.id} className="rounded-xl border border-border px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{period.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(period.startDate, "dd MMM")} – {format(period.endDate, "dd MMM yyyy")}
                      </p>
                      {period.reason ? (
                        <p className="mt-1 text-xs text-muted-foreground">{period.reason}</p>
                      ) : null}
                    </div>
                    <DeleteBlackoutButton id={period.id} />
                  </div>
                </div>
              ))
            )}
          </div>
          <BlackoutForm />
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <DepartmentManager departments={departments} />
        </section>
        <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <OrgRoleManager
            roles={orgRoles}
            assignableBaseRoles={assignableRoles(session.role)}
          />
        </section>
      </div>
    </div>
  );
}
