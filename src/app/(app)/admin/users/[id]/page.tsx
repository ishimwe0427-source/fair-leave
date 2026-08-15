import { notFound, redirect } from "next/navigation";
import { UserForm } from "@/components/admin/user-form";
import { canManageRole, canManageUsers, getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAssignRole } from "@/lib/roles";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || !canManageUsers(session.role)) redirect("/dashboard");

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) notFound();
  if (!canManageRole(session.role, user.role)) redirect("/admin/users");

  const [departments, managers, orgRoles] = await Promise.all([
    prisma.department.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: {
        status: "ACTIVE",
        role: {
          in: ["MANAGER", "HR", "HR_ADMIN", "ADMIN", "MD", "GM", "SUPER_ADMIN"],
        },
        id: { not: id },
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
        <h1 className="mt-2 font-display text-3xl font-semibold">
          Edit {user.firstName} {user.lastName}
        </h1>
      </div>
      <UserForm
        mode="edit"
        user={user}
        departments={departments}
        managers={managers}
        orgRoles={assignable}
      />
    </div>
  );
}
