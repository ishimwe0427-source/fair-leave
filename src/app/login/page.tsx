import Image from "next/image";
import { redirect } from "next/navigation";
import { Logo } from "@/components/branding/logo";
import { LoginForm } from "@/components/auth/login-form";
import { SessionClearRedirect } from "@/components/auth/session-clear-redirect";
import { getSession, mintCsrfToken } from "@/lib/auth";
import { needsSetup } from "@/lib/setup";
import { brandingStyle, getSystemSettings } from "@/lib/system";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; switch?: string }>;
}) {
  if (await needsSetup()) {
    redirect("/setup");
  }

  const params = await searchParams;
  const session = await getSession();

  // Switching accounts / stale session: hard-navigate clear API (not RSC redirect).
  if (session) {
    return <SessionClearRedirect next="/login" />;
  }

  const settings = await getSystemSettings();
  const csrfToken = mintCsrfToken();
  const nextPath =
    params.next && params.next.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : "/dashboard";

  return (
    <div
      className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]"
      style={brandingStyle(settings) as React.CSSProperties}
    >
      <aside className="relative hidden min-h-screen overflow-hidden lg:block">
        <div className="hero-atmosphere absolute inset-0" />
        <div className="animate-soft-pulse absolute -left-16 top-24 h-72 w-72 rounded-full bg-primary/35 blur-[90px]" />
        <div className="absolute -right-10 bottom-10 h-64 w-64 rounded-full bg-sky-400/10 blur-[80px]" />
        <div className="absolute inset-0 opacity-[0.16]">
          <Image
            src={settings.logoUrl || "/branding/fair-construction-logo.png"}
            alt=""
            fill
            sizes="50vw"
            className="object-contain object-bottom p-16"
            unoptimized={settings.logoUrl?.startsWith("/branding/uploads/")}
            priority
          />
        </div>
        <div className="relative z-10 flex h-full flex-col justify-between p-10 text-white xl:p-14">
          <Logo
            href={settings.showMarketingPage ? "/" : "/login"}
            variant="dark"
            logoUrl={settings.logoUrl}
            productName={settings.productName}
            tagline={settings.tagline}
          />
          <div className="animate-rise max-w-lg pb-6">
            <p className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
              {settings.companyName}
            </p>
            <h1 className="mt-5 font-display text-6xl font-semibold leading-[0.95] tracking-tight xl:text-7xl">
              {settings.productName}
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/70">
              {settings.landingHeadline ||
                "Leave operations built for sites, offices, and leadership."}
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3 text-sm">
              {[
                ["Flow", "Manager → HR → MD/GM"],
                ["Scale", "Bulk onboarding ready"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3"
                >
                  <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                    {label}
                  </p>
                  <p className="mt-1 font-semibold text-white/90">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <main className="surface-grid flex min-h-screen flex-col">
        <div className="px-6 py-6 lg:hidden">
          <Logo
            href={settings.showMarketingPage ? "/" : "/login"}
            logoUrl={settings.logoUrl}
            productName={settings.productName}
            tagline={settings.tagline}
          />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <LoginForm
            title={settings.loginTitle}
            subtitle={settings.loginSubtitle}
            csrfToken={csrfToken}
            nextPath={nextPath}
          />
        </div>
      </main>
    </div>
  );
}
