import { redirect } from "next/navigation";
import { PasswordForm } from "@/components/settings/password-form";
import { getCurrentUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import { fullName } from "@/lib/utils";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ forcePassword?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const force = params.forcePassword === "1" || user.mustChangePassword;

  const rows = [
    ["Full name", fullName(user)],
    ["Email", user.email],
    ["Employee code", user.employeeCode],
    ["Role", user.orgRole?.name || ROLE_LABELS[user.role]],
    ["Job title", user.jobTitle || "—"],
    ["Department", user.department?.name || "—"],
    ["Manager", user.manager ? fullName(user.manager) : "—"],
    ["Country", user.country],
    ["Timezone", user.timezone],
    ["Locale", user.locale],
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Settings
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Profile & security</h1>
      </div>

      <PasswordForm force={force} />

      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold">Profile</h2>
        <div className="mt-4 space-y-4">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 last:border-0 last:pb-0"
            >
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="text-sm font-semibold">{value}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
