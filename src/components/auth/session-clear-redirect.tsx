"use client";

import { useEffect } from "react";

/**
 * Full browser navigation to the cookie-clear API.
 * Do NOT use next/navigation redirect() to this URL from RSC — Flight expects
 * an RSC payload and shows "An unexpected response was received from the server."
 */
export function SessionClearRedirect({
  next = "/login",
}: {
  next?: string;
}) {
  useEffect(() => {
    const dest =
      next.startsWith("/") && !next.startsWith("//") ? next : "/login";
    window.location.replace(
      `/api/auth/clear?next=${encodeURIComponent(dest)}`,
    );
  }, [next]);

  return (
    <div className="surface-grid flex min-h-screen items-center justify-center px-6">
      <div className="app-panel max-w-sm px-6 py-8 text-center">
        <p className="font-display text-lg font-semibold">Signing you out…</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Clearing the previous session so you can sign in with another account.
        </p>
      </div>
    </div>
  );
}
