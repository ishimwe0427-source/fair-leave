import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/db";

const SESSION_COOKIE = "fairleave_session";
const SESSION_KEY_COOKIE = "fairleave_sk";
const CSRF_COOKIE = "fairleave_csrf";

function readSessionParts(sessionValue?: string, keyValue?: string) {
  if (sessionValue && keyValue && sessionValue.split(".").length === 3) {
    return { jwtPart: sessionValue, rawSecret: keyValue };
  }
  if (sessionValue) {
    const parts = sessionValue.split(".");
    if (parts.length >= 4) {
      return {
        jwtPart: parts.slice(0, 3).join("."),
        rawSecret: parts.slice(3).join("."),
      };
    }
  }
  return { jwtPart: "", rawSecret: "" };
}

/**
 * Revokes the current DB session (if any), clears auth cookies, redirects.
 * Used for dead sessions and for "Sign in" which must always require a password.
 */
export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next") || "/login";
  const dest = next.startsWith("/") && !next.startsWith("//") ? next : "/login";
  const loginUrl = new URL(
    dest.startsWith("/login") ? dest : `/login?next=${encodeURIComponent(dest)}`,
    request.url,
  );

  const sessionValue = request.cookies.get(SESSION_COOKIE)?.value;
  const keyValue = request.cookies.get(SESSION_KEY_COOKIE)?.value;
  const secret = process.env.AUTH_SECRET;

  if (sessionValue && secret && secret.length >= 32) {
    try {
      const { jwtPart, rawSecret } = readSessionParts(sessionValue, keyValue);
      if (jwtPart) {
        const { payload } = await jwtVerify(
          jwtPart,
          new TextEncoder().encode(secret),
        );
        const sid = String(payload.sid || payload.jti || "");
        if (sid) {
          await prisma.authSession.updateMany({
            where: { id: sid, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        } else if (rawSecret) {
          const tokenHash = createHash("sha256").update(rawSecret).digest("hex");
          await prisma.authSession.updateMany({
            where: { tokenHash, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        }
      }
    } catch {
      // stale/invalid cookie — still clear below
    }
  }

  const res = NextResponse.redirect(loginUrl, 303);
  const clear = {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
  res.cookies.set(SESSION_COOKIE, "", clear);
  res.cookies.set(SESSION_KEY_COOKIE, "", clear);
  res.cookies.set(CSRF_COOKIE, "", { ...clear, httpOnly: false });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res;
}
