"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  CheckSquare,
  Users,
  BarChart3,
  Settings,
  Building2,
  LogOut,
  Upload,
  Shield,
  UserCog,
  ScrollText,
} from "lucide-react";
import { Logo } from "@/components/branding/logo";
import { logoutAction } from "@/lib/actions/auth-actions";
import { cn, fullName, initials } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants";
import { Role } from "@prisma/client";
import type { NavKey } from "@/lib/system";

const ICONS: Record<NavKey, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  requests: ClipboardList,
  request_new: CalendarDays,
  approvals: CheckSquare,
  calendar: CalendarDays,
  team: Users,
  reports: BarChart3,
  admin: Building2,
  users: UserCog,
  import: Upload,
  audit: ScrollText,
  system: Shield,
  settings: Settings,
};

export function Sidebar({
  user,
  nav,
  branding,
}: {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
    avatarColor: string;
    orgRole?: { name: string } | null;
  };
  nav: Array<{
    key: NavKey;
    label: string;
    href: string;
    roles?: Role[];
  }>;
  branding: {
    logoUrl: string;
    productName: string;
    tagline?: string;
  };
}) {
  const pathname = usePathname();
  const items = nav.filter(
    (item) => !item.roles || item.roles.includes(user.role),
  );

  return (
    <aside className="relative flex h-full w-[280px] flex-col overflow-hidden bg-sidebar text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(211,47,47,0.28),transparent_42%)]" />
      <div className="relative z-10 border-b border-white/10 px-5 py-5">
        <Logo
          href="/dashboard"
          variant="dark"
          logoUrl={branding.logoUrl}
          productName={branding.productName}
          tagline={branding.tagline}
        />
      </div>

      <nav className="relative z-10 flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(`${item.href}/`)) ||
            (item.href === "/admin" && pathname === "/admin");
          const Icon = ICONS[item.key] || LayoutDashboard;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-primary text-white"
                  : "text-white/70 hover:bg-white/[0.07] hover:text-white",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 transition",
                  active ? "text-white" : "text-white/45 group-hover:text-white/80",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="relative z-10 border-t border-white/10 p-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white ring-2 ring-white/10"
            style={{ backgroundColor: user.avatarColor }}
          >
            {initials(user)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{fullName(user)}</p>
            <p className="truncate text-xs text-white/55">
              {user.orgRole?.name || ROLE_LABELS[user.role]}
            </p>
          </div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/12 px-3 py-2.5 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
