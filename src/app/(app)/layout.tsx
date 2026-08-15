import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SessionClearRedirect } from "@/components/auth/session-clear-redirect";
import { getCurrentUser } from "@/lib/auth";
import { needsSetup } from "@/lib/setup";
import { brandingStyle, getSystemSettings, resolveNav } from "@/lib/system";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (await needsSetup()) redirect("/setup");

  const user = await getCurrentUser();
  // Dead/half session → full browser navigation to clear API (not RSC redirect)
  if (!user) {
    return <SessionClearRedirect next="/login" />;
  }

  const settings = await getSystemSettings();
  const nav = resolveNav(settings, user.role);

  return (
    <div
      className="flex min-h-screen bg-canvas"
      style={brandingStyle(settings) as React.CSSProperties}
    >
      <div className="sticky top-0 hidden h-screen md:block">
        <Sidebar
          user={user}
          nav={nav}
          branding={{
            logoUrl: settings.logoUrl,
            productName: settings.productName,
            tagline: settings.tagline,
          }}
        />
      </div>
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border/80 bg-white/80 px-4 py-3 backdrop-blur-md md:px-6">
          <div className="flex items-center gap-3">
            <MobileNav
              nav={nav}
              role={user.role}
              branding={{
                logoUrl: settings.logoUrl,
                productName: settings.productName,
                tagline: settings.tagline,
              }}
            />
            <p className="font-display text-sm font-semibold md:hidden">
              {settings.productName}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {user.orgRole?.name || user.role.replace(/_/g, " ")}
            </p>
          </div>
        </header>
        {user.role === "SUPER_ADMIN" && !user.mustChangePassword ? (
          <div className="border-b border-primary/15 bg-gradient-to-r from-accent to-white px-4 py-2 text-sm text-accent-foreground md:px-8">
            Super Admin: customize logo, colors, design look, and tabs in{" "}
            <a href="/system" className="font-semibold underline">
              System Studio
            </a>
            .
          </div>
        ) : null}
        {user.mustChangePassword ? (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 md:px-8">
            Temporary password in use. Change it below to unlock the rest of the system.
          </div>
        ) : null}
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
