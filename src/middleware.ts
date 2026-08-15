import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/", "/login", "/setup"];
const SESSION_COOKIE = "fairleave_session";
const SESSION_KEY_COOKIE = "fairleave_sk";

/**
 * Dual cookies (JWT + secret) or legacy packed `jwt.secret`.
 * JWT-only must NOT count as authenticated — that caused blank-page redirect loops.
 */
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

function clearSessionCookies(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(SESSION_KEY_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

function redirectToLogin(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  if (pathname !== "/login") url.searchParams.set("next", pathname);
  return clearSessionCookies(NextResponse.redirect(url));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/branding") ||
    pathname === "/favicon.ico";

  const sessionValue = request.cookies.get(SESSION_COOKIE)?.value;
  const keyValue = request.cookies.get(SESSION_KEY_COOKIE)?.value;
  const secret = process.env.AUTH_SECRET;

  let authenticated = false;
  let mustChangePassword = false;
  const hasAnySessionCookie = Boolean(sessionValue || keyValue);

  if (sessionValue && secret && secret.length >= 32) {
    try {
      const { jwtPart, rawSecret } = readSessionParts(sessionValue, keyValue);
      if (jwtPart && rawSecret) {
        const { payload } = await jwtVerify(
          jwtPart,
          new TextEncoder().encode(secret),
        );
        authenticated = true;
        mustChangePassword = Boolean(payload.mustChangePassword);
      }
    } catch {
      authenticated = false;
    }
  }

  // Incomplete / invalid cookies — clear so /login is always reachable
  if (hasAnySessionCookie && !authenticated) {
    if (isPublic) {
      return clearSessionCookies(NextResponse.next());
    }
    return redirectToLogin(request, pathname);
  }

  if (!isPublic && !authenticated) {
    return redirectToLogin(request, pathname);
  }

  // Never bounce /login → /dashboard on a soft JWT check. Full DB session
  // validation lives in getSession; bouncing here caused redirect loops.
  if (
    authenticated &&
    mustChangePassword &&
    !pathname.startsWith("/settings") &&
    !pathname.startsWith("/login")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/settings";
    url.searchParams.set("forcePassword", "1");
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
