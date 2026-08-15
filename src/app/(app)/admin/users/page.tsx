import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma, Role } from "@prisma/client";
import { UserRowActions } from "@/components/admin/user-actions";
import {
  canAdminister,
  canDeleteUsers,
  canManageUsers,
  getSession,
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/constants";
import { fullName } from "@/lib/utils";

export default async function UsersAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; page?: string }>;
}) {
  const session = await getSession();
  if (!session || !canManageUsers(session.role)) redirect("/dashboard");

  const params = await searchParams;
  const q = (params.q || "").trim();
  const role = params.role as Role | undefined;
  const page = Math.max(1, Number(params.page || "1") || 1);
  const pageSize = 25;
  const allowDelete = canDeleteUsers(session.role);
  const showImport = canAdminister(session.role);

  const where: Prisma.UserWhereInput = {
    AND: [
      q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { employeeCode: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
      role ? { role } : {},
      session.role === "SUPER_ADMIN"
        ? {}
        : { role: { not: "SUPER_ADMIN" } },
    ],
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: { department: true, manager: true, orgRole: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            User management
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold">Workforce directory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total.toLocaleString()} users · search &amp; filter for reports and onboarding
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {showImport ? (
            <Link
              href="/admin/import"
              className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold"
            >
              Bulk import
            </Link>
          ) : null}
          <Link
            href="/admin/users/new"
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
          >
            Add user
          </Link>
        </div>
      </div>

      <form className="flex flex-wrap gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, email, employee code..."
          className="min-w-[240px] flex-1 rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm"
        />
        <select
          name="role"
          defaultValue={role || ""}
          className="rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm"
        >
          <option value="">All roles</option>
          {Object.keys(ROLE_LABELS).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r as Role]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold"
        >
          Filter
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-canvas text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Gender</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-border align-top">
                <td className="px-4 py-4">
                  <p className="font-semibold">{fullName(user)}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground">{user.employeeCode}</p>
                </td>
                <td className="px-4 py-4 text-muted-foreground">
                  {user.gender === "FEMALE"
                    ? "Female"
                    : user.gender === "MALE"
                      ? "Male"
                      : "—"}
                </td>
                <td className="px-4 py-4">
                  {user.orgRole?.name || ROLE_LABELS[user.role]}
                </td>
                <td className="px-4 py-4 text-muted-foreground">
                  {user.department?.name || "—"}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={
                      user.status === "ACTIVE"
                        ? "rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800"
                        : "rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600"
                    }
                  >
                    {user.status}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <UserRowActions userId={user.id} allowDelete={allowDelete} />
                </td>
              </tr>
            ))}
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
              href={`/admin/users?q=${encodeURIComponent(q)}&role=${role || ""}&page=${page - 1}`}
              className="rounded-lg border border-border px-3 py-1.5"
            >
              Previous
            </Link>
          ) : null}
          {page < pages ? (
            <Link
              href={`/admin/users?q=${encodeURIComponent(q)}&role=${role || ""}&page=${page + 1}`}
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
