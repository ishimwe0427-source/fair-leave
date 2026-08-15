import Link from "next/link";
import { Palette, PanelsTopLeft, Building2, Users, Upload, ExternalLink, Mail } from "lucide-react";
import { BrandingForm } from "@/components/system/branding-form";
import { DepartmentForm } from "@/components/system/department-form";
import { EmailTemplatesForm } from "@/components/system/email-templates-form";
import { NavForm } from "@/components/system/nav-form";
import { canSuperAdmin, getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSystemSettings } from "@/lib/system";
import { redirect } from "next/navigation";

export default async function SystemStudioPage() {
  const session = await getSession();
  if (!session || !canSuperAdmin(session.role)) redirect("/dashboard");

  const { ensureBaselineCatalog } = await import("@/lib/bootstrap");
  await ensureBaselineCatalog(prisma);

  const [settings, departments, adminCount, userCount, pendingApprovals] =
    await Promise.all([
      getSystemSettings(),
      prisma.department.findMany({ orderBy: { name: "asc" } }),
      prisma.user.count({
        where: { role: { in: ["HR", "HR_ADMIN", "ADMIN", "SUPER_ADMIN"] } },
      }),
      prisma.user.count(),
      prisma.leaveApproval.count({ where: { status: "PENDING" } }),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Super Admin
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold">System Studio</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Configure this deployment: logo, colors, landing/login copy, tab names, and feature
            visibility.{" "}
            <span className="font-medium text-foreground">
              {userCount.toLocaleString()} users · {adminCount} admins · {departments.length}{" "}
              departments
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold"
          >
            Open landing
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/login"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
          >
            Open login
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-white px-5 py-4 text-sm shadow-sm">
        <p className="font-semibold text-foreground">Go-live checklist</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Set company logo, brand colors, and public landing/login copy below.</li>
          <li>Rename or hide navigation tabs for this deployment.</li>
          <li>
            Create departments, then add staff in{" "}
            <Link href="/admin/users" className="font-semibold text-primary underline">
              Users
            </Link>{" "}
            or{" "}
            <Link href="/admin/import" className="font-semibold text-primary underline">
              Bulk Import
            </Link>
            .
          </li>
          <li>
            Configure leave types, holidays, and blackouts under Policies. Pending approvals:{" "}
            {pendingApprovals}.
          </li>
        </ol>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            icon: Palette,
            title: "Branding",
            body: "Logo, colors, landing & login copy",
            href: "#branding",
          },
          {
            icon: PanelsTopLeft,
            title: "Tabs & features",
            body: "Rename, hide, toggle modules",
            href: "#navigation",
          },
          {
            icon: Building2,
            title: "Departments",
            body: "Org structure for the buyer",
            href: "#departments",
          },
          {
            icon: Mail,
            title: "Email messages",
            body: "Approve / deny / cancel copy + logo",
            href: "#emails",
          },
          {
            icon: Users,
            title: "Workforce",
            body: "Users + Excel/CSV import",
            href: "/admin/users",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.title}
              href={item.href}
              className="rounded-2xl border border-border bg-white p-4 shadow-sm transition hover:border-primary/40"
            >
              <Icon className="h-5 w-5 text-primary" />
              <p className="mt-3 font-display text-base font-semibold">{item.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.body}</p>
            </a>
          );
        })}
      </div>

      <div id="branding">
        <BrandingForm settings={settings} />
      </div>

      <div id="emails">
        <EmailTemplatesForm
          settings={{
            emailIncludeLogo: settings.emailIncludeLogo,
            emailApprovedMessage: settings.emailApprovedMessage,
            emailDeniedMessage: settings.emailDeniedMessage,
            emailCancelledMessage: settings.emailCancelledMessage,
            logoUrl: settings.logoUrl,
            companyName: settings.companyName,
          }}
        />
      </div>

      <div id="navigation">
        <NavForm navConfig={settings.navConfig} featureFlags={settings.featureFlags} />
      </div>

      <section id="departments" className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <DepartmentForm />
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Departments</h2>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {departments.map((dept) => (
              <span
                key={dept.id}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  dept.active ? "bg-canvas text-foreground" : "bg-muted text-muted-foreground line-through"
                }`}
              >
                {dept.name} ({dept.code})
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Manage admins and the full workforce from{" "}
            <Link href="/admin/users" className="font-semibold text-primary">
              Users
            </Link>
            . Bulk onboard with{" "}
            <Link href="/admin/import" className="font-semibold text-primary">
              Bulk Import
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
