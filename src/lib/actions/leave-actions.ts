"use server";

import { revalidatePath } from "next/cache";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { format, parseISO, startOfDay } from "date-fns";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  canAdminister,
  getSession,
  isExecutiveRole,
  isHrRole,
} from "@/lib/auth";
import { sendLeaveDecisionEmail } from "@/lib/email";
import { getFeatureFlags } from "@/lib/features";
import {
  assertNoOverlap,
  assertNotInBlackout,
  calculateLeaveDays,
  getAvailableBalance,
} from "@/lib/leave-engine";

export type ActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
};

const requestSchema = z.object({
  leaveTypeId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().min(5).max(1000),
  halfDay: z.boolean().optional(),
  lateComment: z.string().max(1000).optional(),
});

async function usersWithRoles(roles: Role[]) {
  return prisma.user.findMany({
    where: { role: { in: roles }, status: "ACTIVE" },
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  });
}

async function notifyUsers(
  userIds: string[],
  data: {
    type:
      | "REQUEST_SUBMITTED"
      | "REQUEST_APPROVED"
      | "REQUEST_REJECTED"
      | "APPROVAL_NEEDED"
      | "LEAVE_REMINDER"
      | "SYSTEM";
    title: string;
    body: string;
    href: string;
  },
) {
  const unique = [...new Set(userIds)];
  if (!unique.length) return;
  await prisma.notification.createMany({
    data: unique.map((userId) => ({ userId, ...data })),
  });
}

export async function createLeaveRequestAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Please sign in." };

  const { assertFeature } = await import("@/lib/features");
  const featureOk = await assertFeature("allowEmployeeSelfRequest", session.role);
  if (!featureOk.ok) return featureOk;

  const parsed = requestSchema.safeParse({
    leaveTypeId: formData.get("leaveTypeId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    reason: formData.get("reason"),
    halfDay: formData.get("halfDay") === "on",
    lateComment: String(formData.get("lateComment") || "").trim() || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: "Check the form fields and try again." };
  }

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return { ok: false, error: "User not found." };

  const leaveType = await prisma.leaveType.findUnique({
    where: { id: parsed.data.leaveTypeId },
  });
  if (!leaveType || !leaveType.active) {
    return { ok: false, error: "Leave type is unavailable." };
  }

  const { isLeaveTypeEligibleForGender } = await import("@/lib/leave-eligibility");
  if (!isLeaveTypeEligibleForGender(leaveType.eligibleGender, user.gender)) {
    return {
      ok: false,
      error:
        leaveType.code === "MATERNITY"
          ? "Maternity leave is only available for female employees. Update gender in the user profile."
          : leaveType.code === "PATERNITY"
            ? "Paternity leave is only available for male employees. Update gender in the user profile."
            : "You are not eligible for this leave type.",
    };
  }

  try {
    const start = parseISO(parsed.data.startDate);
    const end = parseISO(parsed.data.endDate);
    const today = startOfDay(new Date());
    const isLate = startOfDay(start) < today;

    if (isLate && !parsed.data.lateComment) {
      return {
        ok: false,
        error:
          "This leave start date is already in the past. Please explain why it was not requested earlier.",
      };
    }

    const days = await calculateLeaveDays({
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      country: user.country,
      halfDay: parsed.data.halfDay,
    });

    await assertNoOverlap(user.id, start, end);
    await assertNotInBlackout(start, end, user.departmentId);

    const year = start.getFullYear();
    const available = await getAvailableBalance(user.id, leaveType.id, year);
    if (days > available) {
      return {
        ok: false,
        error: `Insufficient balance. Available: ${available} day(s).`,
      };
    }

    const policy = await prisma.leavePolicy.findUnique({
      where: {
        leaveTypeId_country: {
          leaveTypeId: leaveType.id,
          country: user.country,
        },
      },
    });

    if (policy && !isLate) {
      const noticeDays = Math.ceil(
        (start.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      if (noticeDays < policy.minNoticeDays && leaveType.code === "ANNUAL") {
        return {
          ok: false,
          error: `Annual leave requires at least ${policy.minNoticeDays} days notice.`,
        };
      }
    }

    let attachmentUrl: string | undefined;
    const file = formData.get("attachment");
    if (leaveType.requiresDoc) {
      if (!(file instanceof File) || file.size <= 0) {
        return {
          ok: false,
          error: `${leaveType.name} requires a supporting document.`,
        };
      }
      if (file.size > 5_000_000) {
        return { ok: false, error: "Attachment must be under 5MB." };
      }
      const ext = path.extname(file.name || ".pdf").toLowerCase() || ".pdf";
      const allowed = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];
      if (!allowed.includes(ext)) {
        return { ok: false, error: "Attachment must be PDF or image." };
      }
      const dir = path.join(process.cwd(), "public", "uploads", "leave");
      await mkdir(dir, { recursive: true });
      const filename = `${user.id.slice(0, 8)}-${Date.now()}${ext}`;
      await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
      attachmentUrl = `/uploads/leave/${filename}`;
    }

    const flags = await getFeatureFlags();
    const hrs = await usersWithRoles(["HR_ADMIN", "ADMIN", "SUPER_ADMIN"]);
    const primaryHr = hrs[0];
    const managerFirst = Boolean(flags.requireManagerApproval && user.managerId);

    if (!managerFirst && !primaryHr) {
      return {
        ok: false,
        error: "No HR approver is configured. Contact your administrator.",
      };
    }
    if (managerFirst && !user.managerId && !primaryHr) {
      return {
        ok: false,
        error: "No manager or HR approver is configured. Contact your administrator.",
      };
    }

    const reason = isLate
      ? `${parsed.data.reason}\n\n[Late request note] ${parsed.data.lateComment}`
      : parsed.data.reason;

    const status = managerFirst ? "PENDING_MANAGER" : "PENDING_HR";
    const firstApproverId = managerFirst
      ? user.managerId!
      : primaryHr?.id || user.managerId!;

    const request = await prisma.leaveRequest.create({
      data: {
        userId: user.id,
        leaveTypeId: leaveType.id,
        startDate: start,
        endDate: end,
        days,
        halfDay: Boolean(parsed.data.halfDay),
        reason,
        attachment: attachmentUrl,
        status,
        approvals: {
          create: {
            approverId: firstApproverId,
            level: managerFirst ? 0 : 1,
            status: "PENDING",
          },
        },
      },
    });

    await prisma.leaveBalance.update({
      where: {
        userId_leaveTypeId_year: {
          userId: user.id,
          leaveTypeId: leaveType.id,
          year,
        },
      },
      data: { pending: { increment: days } },
    });

    const docNote = attachmentUrl ? " · supporting document attached" : "";
    if (managerFirst) {
      await notifyUsers([user.managerId!], {
        type: "APPROVAL_NEEDED",
        title: isLate
          ? "Late leave request needs your review"
          : "Leave approval needed (Manager)",
        body: `${user.firstName} ${user.lastName} requested ${days} day(s) of ${leaveType.name}${isLate ? " after the start date had passed" : ""}${docNote}.`,
        href: "/approvals",
      });
    } else {
      const notifyIds = hrs.map((h) => h.id);
      if (user.managerId) notifyIds.push(user.managerId);
      await notifyUsers(notifyIds, {
        type: "APPROVAL_NEEDED",
        title: isLate ? "Late leave request needs HR review" : "Leave approval needed (HR)",
        body: `${user.firstName} ${user.lastName} requested ${days} day(s) of ${leaveType.name}${isLate ? " after the start date had passed" : ""}${docNote}.`,
        href: "/approvals",
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE_REQUEST",
        entity: "LeaveRequest",
        entityId: request.id,
        meta: { days, leaveType: leaveType.code, late: isLate, managerFirst },
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/requests");
    revalidatePath("/approvals");
    revalidatePath("/calendar");

    return {
      ok: true,
      message: managerFirst
        ? "Leave request sent to your manager first. After that it goes to HR, then MD/GM for final approval."
        : "Leave request submitted to HR. It stays pending until MD/GM final approval.",
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not create request.",
    };
  }
}

export async function decideLeaveAction(
  requestId: string,
  decision: "APPROVED" | "REJECTED",
  comment?: string,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Please sign in." };

  const actor = await prisma.user.findUnique({ where: { id: session.id } });
  if (!actor) return { ok: false, error: "Not allowed." };

  const canHr = isHrRole(actor.role);
  const canExec = isExecutiveRole(actor.role);
  const isLineManagerRole = actor.role === "MANAGER";
  if (!canHr && !canExec && !isLineManagerRole) {
    return { ok: false, error: "Not allowed." };
  }

  const request = await prisma.leaveRequest.findUnique({
    where: { id: requestId },
    include: {
      user: true,
      leaveType: true,
      approvals: true,
    },
  });

  if (!request) return { ok: false, error: "Request not found." };

  const openStatuses = [
    "PENDING",
    "PENDING_MANAGER",
    "PENDING_HR",
    "PENDING_EXECUTIVE",
  ] as const;
  if (!openStatuses.includes(request.status as (typeof openStatuses)[number])) {
    return { ok: false, error: "Request is not pending." };
  }

  const atManager = request.status === "PENDING_MANAGER";
  const atHr =
    request.status === "PENDING_HR" || request.status === "PENDING";
  const atExec = request.status === "PENDING_EXECUTIVE";
  const isAssignedManager = request.user.managerId === session.id;

  if (atManager) {
    const canManagerAct = isAssignedManager || canHr || canExec;
    if (!canManagerAct) {
      return {
        ok: false,
        error: "Waiting for the employee’s line manager (or HR/MD/GM) to review.",
      };
    }
  } else if (isLineManagerRole && !canHr && !canExec) {
    return {
      ok: false,
      error: "After manager review, HR and MD/GM continue the approval chain.",
    };
  }

  if (atHr && !canHr && !canExec) {
    return { ok: false, error: "Waiting for HR (or MD/GM) to review." };
  }
  if (atExec && !canExec && !canHr) {
    return { ok: false, error: "Waiting for MD/GM final approval." };
  }

  const year = request.startDate.getFullYear();
  const pendingApproval =
    request.approvals.find((a) => a.status === "PENDING") || null;

  // Manager stage approve → escalate to HR (reject still finalizes below).
  // If HR acts at manager stage, treat it as HR clearance and send to MD/GM.
  if (atManager && decision === "APPROVED" && !canExec) {
    const hrs = await usersWithRoles(["HR_ADMIN", "ADMIN", "SUPER_ADMIN"]);
    const primaryHr = hrs[0];
    if (!primaryHr && !canHr) {
      return { ok: false, error: "No HR approver is configured." };
    }

    const hrCoveringManager = canHr;

    if (hrCoveringManager) {
      const executives = await usersWithRoles(["MD", "GM", "ADMIN", "SUPER_ADMIN"]);
      const execId = executives[0]?.id || session.id;

      await prisma.$transaction(async (tx) => {
        if (pendingApproval) {
          await tx.leaveApproval.update({
            where: { id: pendingApproval.id },
            data: {
              status: "APPROVED",
              comment: comment || "HR cleared manager stage",
              actedAt: new Date(),
              approverId: session.id,
            },
          });
        }
        await tx.leaveApproval.create({
          data: {
            requestId: request.id,
            approverId: session.id,
            level: 1,
            status: "APPROVED",
            comment: comment || "HR approved — awaiting MD/GM",
            actedAt: new Date(),
          },
        });
        await tx.leaveApproval.create({
          data: {
            requestId: request.id,
            approverId: execId,
            level: 2,
            status: "PENDING",
          },
        });
        await tx.leaveRequest.update({
          where: { id: request.id },
          data: { status: "PENDING_EXECUTIVE" },
        });
        await tx.notification.create({
          data: {
            userId: request.userId,
            type: "SYSTEM",
            title: "HR approved — awaiting leadership",
            body: `HR approved your ${request.leaveType.name} request. Final confirmation from MD/GM is still pending.`,
            href: "/requests",
          },
        });
      });

      await notifyUsers(
        executives.map((e) => e.id),
        {
          type: "APPROVAL_NEEDED",
          title: "Final leave approval needed (MD/GM)",
          body: `${request.user.firstName} ${request.user.lastName}'s ${request.leaveType.name} request needs final approval.`,
          href: "/approvals",
        },
      );

      revalidatePath("/dashboard");
      revalidatePath("/requests");
      revalidatePath("/approvals");
      return {
        ok: true,
        message: "HR approved. Request sent to MD/GM for final approval.",
      };
    }

    await prisma.$transaction(async (tx) => {
      if (pendingApproval) {
        await tx.leaveApproval.update({
          where: { id: pendingApproval.id },
          data: {
            status: "APPROVED",
            comment: comment || "Manager approved — awaiting HR",
            actedAt: new Date(),
            approverId: session.id,
          },
        });
      } else {
        await tx.leaveApproval.create({
          data: {
            requestId: request.id,
            approverId: session.id,
            level: 0,
            status: "APPROVED",
            comment: comment || "Manager approved — awaiting HR",
            actedAt: new Date(),
          },
        });
      }

      await tx.leaveApproval.create({
        data: {
          requestId: request.id,
          approverId: primaryHr!.id,
          level: 1,
          status: "PENDING",
        },
      });

      await tx.leaveRequest.update({
        where: { id: request.id },
        data: { status: "PENDING_HR" },
      });

      await tx.notification.create({
        data: {
          userId: request.userId,
          type: "SYSTEM",
          title: "Manager approved — awaiting HR",
          body: `Your manager approved your ${request.leaveType.name} request. HR review is next.`,
          href: "/requests",
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.id,
          action: "MANAGER_APPROVE_REQUEST",
          entity: "LeaveRequest",
          entityId: request.id,
          meta: { comment: comment || null },
        },
      });
    });

    await notifyUsers(
      hrs.map((h) => h.id),
      {
        type: "APPROVAL_NEEDED",
        title: "Leave approval needed (HR)",
        body: `${request.user.firstName} ${request.user.lastName}'s ${request.leaveType.name} request was cleared by their manager and needs HR review.`,
        href: "/approvals",
      },
    );

    revalidatePath("/dashboard");
    revalidatePath("/requests");
    revalidatePath("/approvals");

    return {
      ok: true,
      message: "Manager stage approved. Request sent to HR.",
    };
  }

  const finalizeNow =
    decision === "REJECTED" ||
    atExec ||
    (atHr && canExec) ||
    (atManager && canExec); // MD/GM can complete from earlier stages

  if (finalizeNow) {
    await prisma.$transaction(async (tx) => {
      if (pendingApproval) {
        await tx.leaveApproval.update({
          where: { id: pendingApproval.id },
          data: {
            status: decision,
            comment: comment || null,
            actedAt: new Date(),
            approverId: session.id,
          },
        });
      } else {
        await tx.leaveApproval.create({
          data: {
            requestId: request.id,
            approverId: session.id,
            level: atExec ? 2 : 1,
            status: decision,
            comment: comment || null,
            actedAt: new Date(),
          },
        });
      }

      // If MD/GM finalized from HR stage, record both stages
      if (atHr && canExec && decision === "APPROVED") {
        await tx.leaveApproval.create({
          data: {
            requestId: request.id,
            approverId: session.id,
            level: 2,
            status: "APPROVED",
            comment: comment || "Final executive approval",
            actedAt: new Date(),
          },
        });
      }

      await tx.leaveRequest.update({
        where: { id: request.id },
        data: {
          status: decision === "APPROVED" ? "APPROVED" : "REJECTED",
          decidedAt: new Date(),
        },
      });

      await tx.leaveBalance.update({
        where: {
          userId_leaveTypeId_year: {
            userId: request.userId,
            leaveTypeId: request.leaveTypeId,
            year,
          },
        },
        data:
          decision === "APPROVED"
            ? {
                pending: { decrement: request.days },
                used: { increment: request.days },
              }
            : { pending: { decrement: request.days } },
      });

      await tx.notification.create({
        data: {
          userId: request.userId,
          type: decision === "APPROVED" ? "REQUEST_APPROVED" : "REQUEST_REJECTED",
          title:
            decision === "APPROVED"
              ? "Your leave was approved"
              : "Your leave request was denied",
          body:
            decision === "APPROVED"
              ? `Great news — your ${request.leaveType.name} leave is fully approved.`
              : `Your ${request.leaveType.name} request was not approved.${comment ? ` Note: ${comment}` : ""}`,
          href: "/requests",
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.id,
          action: decision === "APPROVED" ? "APPROVE_REQUEST" : "REJECT_REQUEST",
          entity: "LeaveRequest",
          entityId: request.id,
          meta: { comment: comment || null, final: true },
        },
      });
    });

    await sendLeaveDecisionEmail({
      to: request.user.email,
      firstName: request.user.firstName,
      leaveType: request.leaveType.name,
      startLabel: format(request.startDate, "dd MMM yyyy"),
      endLabel: format(request.endDate, "dd MMM yyyy"),
      days: request.days,
      approved: decision === "APPROVED",
      comment,
    });

    revalidatePath("/dashboard");
    revalidatePath("/requests");
    revalidatePath("/approvals");
    revalidatePath("/calendar");
    revalidatePath("/team");
    revalidatePath("/reports");

    return {
      ok: true,
      message:
        decision === "APPROVED"
          ? "Final approval recorded. Employee notified by email."
          : "Request denied. Employee notified by email.",
    };
  }

  // HR first-stage approval → escalate to MD/GM
  await prisma.$transaction(async (tx) => {
    if (pendingApproval) {
      await tx.leaveApproval.update({
        where: { id: pendingApproval.id },
        data: {
          status: "APPROVED",
          comment: comment || "HR approved — awaiting MD/GM",
          actedAt: new Date(),
          approverId: session.id,
        },
      });
    } else {
      await tx.leaveApproval.create({
        data: {
          requestId: request.id,
          approverId: session.id,
          level: 1,
          status: "APPROVED",
          comment: comment || "HR approved — awaiting MD/GM",
          actedAt: new Date(),
        },
      });
    }

    const executives = await tx.user.findMany({
      where: { role: { in: ["MD", "GM", "SUPER_ADMIN"] }, status: "ACTIVE" },
      select: { id: true },
    });
    const execId = executives[0]?.id || session.id;

    await tx.leaveApproval.create({
      data: {
        requestId: request.id,
        approverId: execId,
        level: 2,
        status: "PENDING",
      },
    });

    await tx.leaveRequest.update({
      where: { id: request.id },
      data: { status: "PENDING_EXECUTIVE" },
    });

    await tx.notification.create({
      data: {
        userId: request.userId,
        type: "SYSTEM",
        title: "HR approved — awaiting leadership",
        body: `HR approved your ${request.leaveType.name} request. Final confirmation from MD/GM is still pending.`,
        href: "/requests",
      },
    });

    await tx.auditLog.create({
      data: {
        userId: session.id,
        action: "HR_APPROVE_REQUEST",
        entity: "LeaveRequest",
        entityId: request.id,
        meta: { comment: comment || null },
      },
    });
  });

  const execs = await usersWithRoles(["MD", "GM", "ADMIN", "SUPER_ADMIN"]);
  await notifyUsers(
    execs.map((e) => e.id),
    {
      type: "APPROVAL_NEEDED",
      title: "Final leave approval needed (MD/GM)",
      body: `${request.user.firstName} ${request.user.lastName}'s ${request.leaveType.name} request was cleared by HR and needs final approval.`,
      href: "/approvals",
    },
  );

  revalidatePath("/dashboard");
  revalidatePath("/requests");
  revalidatePath("/approvals");

  return {
    ok: true,
    message: "HR stage approved. Request sent to MD/GM for final approval.",
  };
}

export async function cancelLeaveAction(requestId: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Please sign in." };

  const request = await prisma.leaveRequest.findUnique({
    where: { id: requestId },
    include: {
      leaveType: true,
      user: true,
      approvals: { where: { status: "PENDING" } },
    },
  });

  if (!request) return { ok: false, error: "Request not found." };
  if (request.userId !== session.id && !canAdminister(session.role) && !isExecutiveRole(session.role)) {
    return { ok: false, error: "Not allowed." };
  }
  if (
    ![
      "PENDING",
      "PENDING_MANAGER",
      "PENDING_HR",
      "PENDING_EXECUTIVE",
      "APPROVED",
    ].includes(request.status)
  ) {
    return { ok: false, error: "This request cannot be cancelled." };
  }

  const year = request.startDate.getFullYear();

  await prisma.$transaction(async (tx) => {
    await tx.leaveRequest.update({
      where: { id: request.id },
      data: { status: "CANCELLED", decidedAt: new Date() },
    });

    if (
      [
        "PENDING",
        "PENDING_MANAGER",
        "PENDING_HR",
        "PENDING_EXECUTIVE",
      ].includes(request.status)
    ) {
      await tx.leaveBalance.update({
        where: {
          userId_leaveTypeId_year: {
            userId: request.userId,
            leaveTypeId: request.leaveTypeId,
            year,
          },
        },
        data: { pending: { decrement: request.days } },
      });
    }

    if (request.status === "APPROVED") {
      await tx.leaveBalance.update({
        where: {
          userId_leaveTypeId_year: {
            userId: request.userId,
            leaveTypeId: request.leaveTypeId,
            year,
          },
        },
        data: { used: { decrement: request.days } },
      });
    }

    await tx.leaveApproval.updateMany({
      where: { requestId: request.id, status: "PENDING" },
      data: { status: "SKIPPED", actedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        userId: session.id,
        action: "CANCEL_REQUEST",
        entity: "LeaveRequest",
        entityId: request.id,
      },
    });

    await tx.notification.create({
      data: {
        userId: request.userId,
        type: "REQUEST_REJECTED",
        title: "Leave request cancelled",
        body: `Your ${request.leaveType.name} leave (${format(request.startDate, "dd MMM")} – ${format(request.endDate, "dd MMM yyyy")}) was cancelled.`,
        href: "/requests",
      },
    });
  });

  const { sendLeaveCancelledEmail } = await import("@/lib/email");
  await sendLeaveCancelledEmail({
    to: request.user.email,
    firstName: request.user.firstName,
    leaveType: request.leaveType.name,
    startLabel: format(request.startDate, "dd MMM yyyy"),
    endLabel: format(request.endDate, "dd MMM yyyy"),
    days: request.days,
    bySelf: request.userId === session.id,
  });

  revalidatePath("/dashboard");
  revalidatePath("/requests");
  revalidatePath("/calendar");
  revalidatePath("/approvals");

  return {
    ok: true,
    message: "Request cancelled. Employee notified on dashboard and by email.",
  };
}
