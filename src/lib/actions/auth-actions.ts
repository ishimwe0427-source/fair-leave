"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  assertCsrf,
  clearLoginFailures,
  createSession,
  destroySession,
  getRequestMeta,
  getSession,
  issueCsrfToken,
  registerFailedLogin,
  revokeAllSessions,
  verifyLoginPassword,
} from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200),
  csrfToken: z.string().min(16),
});

export type ActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
};

export async function loginAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const parsed = loginSchema.safeParse({
      email: String(formData.get("email") || "").trim().toLowerCase(),
      password: formData.get("password"),
      csrfToken: formData.get("csrfToken"),
    });

    if (!parsed.success) {
      return { ok: false, error: "Enter a valid email and password." };
    }

    const nextRaw = String(formData.get("next") || "/dashboard");
    const nextPath =
      nextRaw.startsWith("/") &&
      !nextRaw.startsWith("//") &&
      !nextRaw.startsWith("/api/")
        ? nextRaw
        : "/dashboard";

    const csrfOk = await assertCsrf(parsed.data.csrfToken);
    if (!csrfOk) {
      await issueCsrfToken();
      return { ok: false, error: "Security check failed. Refresh and try again." };
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    // Always run a password check (timing-safe-ish)
    const passwordOk = await verifyLoginPassword(
      parsed.data.password,
      user?.passwordHash || null,
    );

    if (!user || user.status !== "ACTIVE") {
      await prisma.auditLog.create({
        data: {
          action: "LOGIN_FAILED",
          entity: "User",
          meta: { email: parsed.data.email, reason: "unknown_or_inactive" },
        },
      });
      return { ok: false, error: "Invalid email or password." };
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return {
        ok: false,
        error: `Account temporarily locked. Try again in ${mins} minute(s).`,
      };
    }

    if (!passwordOk) {
      const result = await registerFailedLogin(user.id);
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "LOGIN_FAILED",
          entity: "User",
          entityId: user.id,
          meta: { reason: "bad_password" },
        },
      });

      if (result.locked) {
        return {
          ok: false,
          error: `Too many failed attempts. Account locked for ${result.lockMinutes} minutes.`,
        };
      }

      return {
        ok: false,
        error: `Invalid email or password. ${result.remaining} attempt(s) left.`,
      };
    }

    await clearLoginFailures(user.id);

    // Drop any leftover browser session before issuing a new one
    await destroySession();

    await createSession({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      employeeCode: user.employeeCode,
      departmentId: user.departmentId,
      managerId: user.managerId,
      mustChangePassword: user.mustChangePassword,
    });

    const meta = await getRequestMeta();
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN",
        entity: "User",
        entityId: user.id,
        meta: {
          ip: meta.ipAddress,
          userAgent: meta.userAgent,
        },
      },
    });

    if (user.mustChangePassword) {
      redirect("/settings?forcePassword=1");
    }

    redirect(nextPath === "/login" ? "/dashboard" : nextPath);
  } catch (error) {
    // redirect() throws a special Next.js error — rethrow it
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    console.error("[FairLeave loginAction]", error);
    return {
      ok: false,
      error: "Sign-in failed unexpectedly. Refresh and try again.",
    };
  }
}

export async function logoutAction() {
  const session = await getSession();
  await destroySession();

  if (session) {
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: "LOGOUT",
        entity: "User",
        entityId: session.id,
        meta: { sessionId: session.sessionId },
      },
    });
  }

  // Cookies already cleared in destroySession — do not redirect to /api/* from a
  // Server Action (Flight cannot consume a plain HTTP redirect response).
  redirect("/login");
}

export async function logoutEverywhereAction() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  await revokeAllSessions(session.id);
  await destroySession();

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: "LOGOUT_EVERYWHERE",
      entity: "User",
      entityId: session.id,
    },
  });

  redirect("/login");
}
