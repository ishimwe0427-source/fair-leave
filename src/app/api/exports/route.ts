import { NextRequest, NextResponse } from "next/server";
import { LeaveRequestStatus, Prisma } from "@prisma/client";
import * as XLSX from "xlsx";
import { getSession, canExportWorkforce, canViewAudit } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/roles";

type ExportKind = "users" | "requests" | "pending" | "denied" | "audit";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const kind = (request.nextUrl.searchParams.get("kind") || "users") as ExportKind;

  if (kind === "audit") {
    if (!canViewAudit(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (!canExportWorkforce(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const workbook = XLSX.utils.book_new();
  let filename = "fairleave-export.xlsx";

  if (kind === "audit") {
    const q = (request.nextUrl.searchParams.get("q") || "").trim();
    const action = (request.nextUrl.searchParams.get("action") || "").trim();
    const where = {
      AND: [
        action
          ? { action: { contains: action, mode: "insensitive" as const } }
          : {},
        q
          ? {
              OR: [
                { action: { contains: q, mode: "insensitive" as const } },
                { entity: { contains: q, mode: "insensitive" as const } },
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
    const logs = await prisma.auditLog.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 10_000,
    });
    const rows = logs.map((log) => ({
      when: log.createdAt.toISOString(),
      actor: log.user
        ? `${log.user.firstName} ${log.user.lastName}`
        : "System",
      email: log.user?.email || "",
      action: log.action,
      entity: log.entity,
      entityId: log.entityId || "",
      details: log.meta ? JSON.stringify(log.meta) : "",
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Audit");
    filename = "fairleave-audit.xlsx";
  } else if (kind === "users") {
    const users = await prisma.user.findMany({
      include: { department: true, manager: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    const rows = users.map((u) => ({
      employeeCode: u.employeeCode,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      gender: u.gender,
      role: ROLE_LABELS[u.role],
      status: u.status,
      jobTitle: u.jobTitle || "",
      phone: u.phone || "",
      country: u.country,
      department: u.department?.name || "",
      manager: u.manager
        ? `${u.manager.firstName} ${u.manager.lastName}`
        : "",
      hireDate: u.hireDate?.toISOString().slice(0, 10) || "",
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Users");
    filename = "fairleave-users.xlsx";
  } else {
    const pendingStatuses: LeaveRequestStatus[] = [
      "PENDING",
      "PENDING_MANAGER",
      "PENDING_HR",
      "PENDING_EXECUTIVE",
    ];
    const deniedStatuses: LeaveRequestStatus[] = ["REJECTED", "CANCELLED"];
    const where: Prisma.LeaveRequestWhereInput =
      kind === "pending"
        ? { status: { in: pendingStatuses } }
        : kind === "denied"
          ? { status: { in: deniedStatuses } }
          : {};

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        user: { include: { department: true } },
        leaveType: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const rows = requests.map((r) => ({
      employeeCode: r.user.employeeCode,
      employee: `${r.user.firstName} ${r.user.lastName}`,
      email: r.user.email,
      department: r.user.department?.name || "",
      leaveType: r.leaveType.name,
      startDate: r.startDate.toISOString().slice(0, 10),
      endDate: r.endDate.toISOString().slice(0, 10),
      days: r.days,
      status: r.status,
      reason: r.reason,
      createdAt: r.createdAt.toISOString(),
      decidedAt: r.decidedAt?.toISOString() || "",
    }));

    const sheet =
      kind === "pending"
        ? "Pending"
        : kind === "denied"
          ? "DeniedCancelled"
          : "AllRequests";
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), sheet);
    filename = `fairleave-${kind}.xlsx`;
  }

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
