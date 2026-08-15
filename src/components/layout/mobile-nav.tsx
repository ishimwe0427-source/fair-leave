"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Role } from "@prisma/client";
import { Logo } from "@/components/branding/logo";
import { logoutAction } from "@/lib/actions/auth-actions";
import { cn } from "@/lib/utils";
import type { NavKey } from "@/lib/system";

export function MobileNav({
  nav,
  branding,
  role,
}: {
  nav: Array<{ key: NavKey; label: string; href: string; roles?: Role[] }>;
  branding: { logoUrl: string; productName: string; tagline?: string };
  role: Role;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = nav.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-border p-2 md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-label="Close menu overlay"
          />
          <aside className="absolute left-0 top-0 flex h-full w-[280px] flex-col bg-sidebar text-white shadow-2xl animate-slide-in">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <Logo
                href="/dashboard"
                variant="dark"
                logoUrl={branding.logoUrl}
                productName={branding.productName}
                tagline={branding.tagline}
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 hover:bg-white/10"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "block rounded-xl px-3 py-2.5 text-sm font-medium",
                      active ? "bg-primary text-white" : "text-white/80 hover:bg-white/10",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <form action={logoutAction} className="border-t border-white/10 p-4">
              <button
                type="submit"
                className="w-full rounded-xl border border-white/15 px-3 py-2 text-sm text-white/80"
              >
                Sign out
              </button>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}
