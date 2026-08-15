import { redirect } from "next/navigation";
import { UserForm } from "@/components/admin/user-form";
import { canManageUsers, getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAssignRole } from "@/lib/roles";

export default async function NewUserPage() {
  const session = await getSession();
  if (!session || !canManageUsers(session.role)) redirect("/dashboard");

  const [departments, managers, orgRoles] = await Promise.all([
    prisma.department.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: {
        status: "ACTIVE",
        role: {
          in: ["MANAGER", "HR", "HR_ADMIN", "ADMIN", "MD", "GM", "SUPER_ADMIN"],
        },
      },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: { firstName: "asc" },
      take: 500,
    }),
    prisma.orgRole.findMany({
      where: { active: true },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    }),
  ]);

  const assignable = orgRoles.filter((r) => canAssignRole(session.role, r.baseRole));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Users
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Add user</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set gender so maternity / paternity leave show correctly. A temporary password is emailed
          and shown once here.
        </p>
      </div>
      <UserForm
        mode="create"
        departments={departments}
        managers={managers}
        orgRoles={assignable}
      />
    </div>
  );
}
