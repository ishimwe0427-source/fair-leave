import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE = "fairleave_session";
/** Companion httpOnly secret — kept separate so the JWT cookie stays under browser size limits. */
export const SESSION_KEY_COOKIE = "fairleave_sk";
export const CSRF_COOKIE = "fairleave_csrf";

const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const BCRYPT_ROUNDS = 12;

/** Dummy hash so missing users still take bcrypt time (anti user-enumeration timing). */
const DUMMY_HASH =
  "$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW";

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  employeeCode: string;
  departmentId: string | null;
  managerId: string | null;
  mustChangePassword: boolean;
  sessionId: string;
  sessionVersion: number;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set and at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

/** Resolve JWT + raw secret from dual cookies or legacy packed `jwt.secret` cookie. */
function readSessionParts(sessionValue?: string, keyValue?: string) {
  if (sessionValue && keyValue) {
    // Dual-cookie format (preferred)
    if (sessionValue.split(".").length === 3) {
      return { jwtPart: sessionValue, rawSecret: keyValue };
    }
  }

  if (sessionValue) {
    const parts = sessionValue.split(".");
    // Legacy packed: header.payload.sig.rawSecret
    if (parts.length >= 4) {
      return {
        jwtPart: parts.slice(0, 3).join("."),
        rawSecret: parts.slice(3).join("."),
      };
    }
  }

  return { jwtPart: "", rawSecret: "" };
}

export function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateRawToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 10) return "Password must be at least 10 characters.";
  if (!/[A-Z]/.test(password)) return "Include at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Include at least one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Include at least one number.";
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Include at least one special character.";
  }
  return null;
}

export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function getRequestMeta() {
  const h = await headers();
  return {
    userAgent: h.get("user-agent")?.slice(0, 300) || null,
    ipAddress:
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      null,
  };
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

/**
 * Signed CSRF token for Server Components (cannot call cookies().set in RSC).
 * Format: `raw.hmac`
 */
export function mintCsrfToken() {
  const raw = generateRawToken(24);
  const secret = process.env.AUTH_SECRET || "";
  const sig = createHmac("sha256", secret).update(raw).digest("base64url");
  return `${raw}.${sig}`;
}

export function verifyMintedCsrf(formToken: string | null) {
  if (!formToken) return false;
  const idx = formToken.lastIndexOf(".");
  if (idx <= 0) return false;
  const raw = formToken.slice(0, idx);
  const sig = formToken.slice(idx + 1);
  if (!raw || !sig) return false;
  const secret = process.env.AUTH_SECRET || "";
  const expected = createHmac("sha256", secret).update(raw).digest("base64url");
  return safeEqual(sig, expected);
}

/** Sets CSRF cookie — call only from Server Actions / Route Handlers. */
export async function issueCsrfToken() {
  const token = mintCsrfToken();
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE, token, {
    ...cookieOptions(SESSION_TTL_SECONDS),
    httpOnly: false,
  });
  return token;
}

export async function assertCsrf(formToken: string | null) {
  // Prefer signed token (works without a cookie — required for /login RSC)
  if (verifyMintedCsrf(formToken)) return true;

  // Fallback: classic double-submit cookie (if previously issued in an action)
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value;
  if (!formToken || !cookieToken || !safeEqual(formToken, cookieToken)) {
    return false;
  }
  return true;
}

export async function createSession(user: Omit<SessionUser, "sessionId" | "sessionVersion"> & {
  sessionVersion?: number;
}) {
  const meta = await getRequestMeta();
  const rawSessionSecret = generateRawToken(32);
  const tokenHash = hashToken(rawSessionSecret);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { sessionVersion: true, mustChangePassword: true },
  });
  if (!dbUser) throw new Error("User missing for session");

  const session = await prisma.authSession.create({
    data: {
      userId: user.id,
      tokenHash,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt,
    },
  });

  const token = await new SignJWT({
    sid: session.id,
    sv: dbUser.sessionVersion,
    id: user.id,
    mustChangePassword: dbUser.mustChangePassword,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .setJti(session.id)
    .sign(getSecret());

  const cookieStore = await cookies();
  // Two cookies: keeps each under browser size limits and avoids packed-JWT parsing bugs
  cookieStore.set(SESSION_COOKIE, token, cookieOptions(SESSION_TTL_SECONDS));
  cookieStore.set(SESSION_KEY_COOKIE, rawSessionSecret, cookieOptions(SESSION_TTL_SECONDS));

  // Rotate CSRF on login
  await issueCsrfToken();

  return session.id;
}

export async function clearSessionCookies() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
  cookieStore.set(SESSION_KEY_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
  cookieStore.set(CSRF_COOKIE, "", {
    ...cookieOptions(0),
    maxAge: 0,
    httpOnly: false,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE)?.value;
  const keyValue = cookieStore.get(SESSION_KEY_COOKIE)?.value;

  if (sessionValue) {
    try {
      const { jwtPart, rawSecret } = readSessionParts(sessionValue, keyValue);
      if (jwtPart) {
        const { payload } = await jwtVerify(jwtPart, getSecret());
        const sid = String(payload.sid || payload.jti || "");
        if (sid) {
          await prisma.authSession.updateMany({
            where: { id: sid, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        } else if (rawSecret) {
          await prisma.authSession.updateMany({
            where: { tokenHash: hashToken(rawSecret), revokedAt: null },
            data: { revokedAt: new Date() },
          });
        }
      }
    } catch {
      // ignore invalid token on logout
    }
  }

  await clearSessionCookies();
}

/** Prefer /login from Server Actions (cookies already clearable there). */
export async function redirectToLogin(_nextPath = "/login"): Promise<never> {
  redirect("/login");
}

export async function revokeAllSessions(userId: string, exceptSessionId?: string) {
  await prisma.authSession.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionValue) return null;
  const keyValue = cookieStore.get(SESSION_KEY_COOKIE)?.value;

  try {
    const { jwtPart, rawSecret } = readSessionParts(sessionValue, keyValue);
    if (!jwtPart || !rawSecret) return null;

    const { payload } = await jwtVerify(jwtPart, getSecret());
    const sessionId = String(payload.sid || payload.jti || "");
    if (!sessionId) return null;

    const tokenHash = hashToken(rawSecret);
    const session = await prisma.authSession.findFirst({
      where: {
        id: sessionId,
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!session) return null;

    const user = await prisma.user.findUnique({
      where: { id: String(payload.id) },
      select: {
        id: true,
        status: true,
        sessionVersion: true,
        mustChangePassword: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        employeeCode: true,
        departmentId: true,
        managerId: true,
      },
    });

    if (!user || user.status !== "ACTIVE") return null;
    if (user.sessionVersion !== Number(payload.sv ?? -1)) return null;

    // Touch lastSeen occasionally (best-effort)
    if (Date.now() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
      prisma.authSession
        .update({
          where: { id: session.id },
          data: { lastSeenAt: new Date() },
        })
        .catch(() => undefined);
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      employeeCode: user.employeeCode,
      departmentId: user.departmentId,
      managerId: user.managerId,
      mustChangePassword: user.mustChangePassword,
      sessionId: session.id,
      sessionVersion: user.sessionVersion,
    };
  } catch {
    return null;
  }
}

/** Lightweight JWT-only check for middleware (no DB). Full validation happens in getSession. */
export async function peekSessionToken(
  sessionValue: string | undefined,
  keyValue?: string,
) {
  if (!sessionValue) return null;
  try {
    const { jwtPart, rawSecret } = readSessionParts(sessionValue, keyValue);
    // Require both halves so middleware can't "authenticate" a half-session
    if (!jwtPart || !rawSecret) return null;
    const { payload } = await jwtVerify(jwtPart, getSecret());
    return {
      mustChangePassword: Boolean(payload.mustChangePassword),
      authenticated: true,
    };
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  return prisma.user.findUnique({
    where: { id: session.id },
    include: {
      department: true,
      orgRole: true,
      manager: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });
}

export async function registerFailedLogin(userId: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: { increment: 1 } },
  });

  if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60 * 1000),
        failedLoginAttempts: 0,
      },
    });
    return { locked: true as const, lockMinutes: LOCK_MINUTES };
  }

  return {
    locked: false as const,
    remaining: Math.max(0, MAX_FAILED_ATTEMPTS - user.failedLoginAttempts),
  };
}

export async function clearLoginFailures(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
}

export async function verifyLoginPassword(password: string, hash: string | null) {
  // Always compare against something to reduce timing leaks
  return verifyPassword(password, hash || DUMMY_HASH);
}

export {
  canManageTeam,
  canAdminister,
  canAssignRole as canManageRole,
  canAssignRole,
  canManageUsers,
  canDeleteUsers,
  canResetUserPassword,
  canViewAudit,
  canManageTargetUser,
  assignableRoles,
  isExecutiveRole,
  isHrRole,
  canExportWorkforce,
  canManageOrg,
  canViewLeaveDocuments,
} from "@/lib/roles";

export function canSuperAdmin(role: Role) {
  return role === "SUPER_ADMIN";
}

export function isSuperAdmin(role: Role) {
  return role === "SUPER_ADMIN";
}

export { SESSION_TTL_SECONDS, MAX_FAILED_ATTEMPTS, LOCK_MINUTES };
