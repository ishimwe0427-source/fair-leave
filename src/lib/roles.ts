import { Role } from "@prisma/client";

export const ROLE_LABELS: Record<Role, string> = {
  EMPLOYEE: "Employee",
  MANAGER: "Manager",
  HR: "HR",
  HR_ADMIN: "HR Admin",
  ADMIN: "Admin",
  MD: "Managing Director",
  GM: "General Manager",
  SUPER_ADMIN: "Super Admin",
};

export function isHrRole(role: Role) {
  return (
    role === "HR_ADMIN" ||
    role === "ADMIN" ||
    role === "SUPER_ADMIN"
  );
}

/** MD / GM / Super Admin / Admin — can give final executive approval */
export function isExecutiveRole(role: Role) {
  return (
    role === "MD" ||
    role === "GM" ||
    role === "ADMIN" ||
    role === "SUPER_ADMIN"
  );
}

export function canManageTeam(role: Role) {
  return (
    role === "MANAGER" ||
    role === "HR_ADMIN" ||
    role === "ADMIN" ||
    role === "MD" ||
    role === "GM" ||
    role === "SUPER_ADMIN"
  );
}

/** Policies / leave types / holidays */
export function canAdminister(role: Role) {
  return role === "HR_ADMIN" || role === "ADMIN" || role === "SUPER_ADMIN";
}

export function canManageOrg(role: Role) {
  return canAdminister(role);
}

/** Create / edit users (not necessarily delete) */
export function canManageUsers(role: Role) {
  return (
    role === "HR" ||
    role === "HR_ADMIN" ||
    role === "ADMIN" ||
    role === "MD" ||
    role === "GM" ||
    role === "SUPER_ADMIN"
  );
}

export function canDeleteUsers(role: Role) {
  return (
    role === "HR_ADMIN" ||
    role === "ADMIN" ||
    role === "MD" ||
    role === "GM" ||
    role === "SUPER_ADMIN"
  );
}

export function canResetUserPassword(role: Role) {
  return canManageUsers(role);
}

export function canExportWorkforce(role: Role) {
  return (
    role === "HR_ADMIN" ||
    role === "ADMIN" ||
    role === "MD" ||
    role === "GM" ||
    role === "SUPER_ADMIN"
  );
}

export function canViewAudit(role: Role) {
  return (
    role === "HR_ADMIN" ||
    role === "ADMIN" ||
    role === "MD" ||
    role === "GM" ||
    role === "SUPER_ADMIN"
  );
}

export function canViewLeaveDocuments(role: Role) {
  return (
    role === "HR" ||
    role === "HR_ADMIN" ||
    role === "ADMIN" ||
    role === "MD" ||
    role === "GM" ||
    role === "SUPER_ADMIN"
  );
}

/** Nobody except Super Admin may assign or edit Super Admin accounts. */
export function canAssignRole(actor: Role, target: Role) {
  if (target === "SUPER_ADMIN") {
    return actor === "SUPER_ADMIN";
  }
  if (actor === "SUPER_ADMIN" || actor === "ADMIN") {
    return true;
  }
  if (actor === "HR_ADMIN") {
    return (
      target === "EMPLOYEE" ||
      target === "MANAGER" ||
      target === "HR" ||
      target === "HR_ADMIN"
    );
  }
  if (actor === "MD" || actor === "GM") {
    return (
      target === "EMPLOYEE" ||
      target === "MANAGER" ||
      target === "HR" ||
      target === "HR_ADMIN"
    );
  }
  if (actor === "HR") {
    return target === "EMPLOYEE" || target === "MANAGER";
  }
  return false;
}

export function assignableRoles(actor: Role): Role[] {
  const all: Role[] = [
    "EMPLOYEE",
    "MANAGER",
    "HR",
    "HR_ADMIN",
    "ADMIN",
    "MD",
    "GM",
    "SUPER_ADMIN",
  ];
  return all.filter((r) => canAssignRole(actor, r));
}

/** Can this actor manage (edit/delete/reset) this target user role? */
export function canManageTargetUser(actor: Role, targetRole: Role) {
  if (targetRole === "SUPER_ADMIN" && actor !== "SUPER_ADMIN") return false;
  if (!canManageUsers(actor)) return false;
  return canAssignRole(actor, targetRole) || actor === "SUPER_ADMIN";
}
