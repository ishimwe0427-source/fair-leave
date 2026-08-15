import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarCheck2,
  Globe2,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { Logo } from "@/components/branding/logo";
import { needsSetup } from "@/lib/setup";
import { brandingStyle, getSystemSettings } from "@/lib/system";

const features = [
  {
    icon: Workflow,
    title: "Approvals that match real teams",
    body: "Optional manager review, then HR, then MD/GM final sign-off — with notifications at every step.",
  },
  {
    icon: Globe2,
    title: "Built for multi-country operations",
    body: "Country policies, holiday calendars, and timezone-aware employee profiles out of the box.",
  },
  {
    icon: CalendarCheck2,
    title: "Workforce onboarding at scale",
    body: "Bulk Excel/CSV import, role management, and secure one-time credential delivery for HR.",
  },
  {
    icon: ShieldCheck,
    title: "Super Admin System Studio",
    body: "Configure logo, colors, content, tab names, and feature visibility for each deployment.",
  },
];

export default async function LandingPage() {
  if (await needsSetup()) redirect("/setup");
  const settings = await getSystemSettings();
  if (!settings.showMarketingPage) redirect("/login");

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#070b12] text-white"
      style={brandingStyle(settings) as React.CSSProperties}
    >
      <section className="relative min-h-[100svh] overflow-hidden">
        <div className="hero-atmosphere absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-soft-pulse absolute -left-20 top-10 h-[28rem] w-[28rem] rounded-full bg-primary/30 blur-[100px]" />
          <div className="absolute -right-24 bottom-0 h-[22rem] w-[22rem] rounded-full bg-sky-500/10 blur-[90px]" />
          <div className="absolute inset-y-0 right-0 w-[58%] bg-[linear-gradient(115deg,transparent_0%,rgba(211,47,47,0.12)_45%,rgba(211,47,47,0.28)_100%)]" />
          <div className="absolute bottom-[-8%] right-[-4%] h-[78%] w-[52%] opacity-[0.18]">
            <Image
              src={settings.logoUrl || "/branding/fair-construction-logo.png"}
              alt=""
              fill
              sizes="(max-width: 768px) 60vw, 45vw"
              className="object-contain object-right-bottom"
              unoptimized={settings.logoUrl?.startsWith("/branding/uploads/")}
              priority
            />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#070b12] to-transparent" />
        </div>

        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
          <Logo
            href="/"
            variant="dark"
            logoUrl={settings.logoUrl}
            productName={settings.productName}
            tagline={settings.tagline}
          />
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
            >
              Sign in
            </Link>
            <Link href="/login" className="btn-primary">
              Open product
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-88px)] w-full max-w-6xl flex-col justify-center px-6 pb-20 pt-6">
          <div className="animate-rise max-w-3xl">
            <p className="font-display text-sm font-semibold uppercase tracking-[0.32em] text-red-300 md:text-base">
              {settings.companyName}
            </p>
            <h1 className="mt-4 font-display text-[4.25rem] font-semibold leading-[0.92] tracking-tight text-white md:text-[7.5rem]">
              {settings.productName}
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-white/72 md:text-xl">
              {settings.landingHeadline}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/login" className="btn-primary !px-6 !py-3.5 text-base">
                Launch product
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#features" className="btn-ghost !px-6 !py-3.5 text-base">
                See capabilities
              </a>
            </div>
          </div>

          {settings.showLandingStats ? (
            <div className="animate-fade-in mt-16 grid max-w-4xl grid-cols-2 gap-5 border-t border-white/12 pt-8 md:grid-cols-4">
              {[
                ["Workforce", "Large-team ready"],
                ["Onboarding", "Excel / CSV"],
                ["Control", "System Studio"],
                ["Approvals", "Manager → HR → MD"],
              ].map(([label, value], i) => (
                <div
                  key={label}
                  className="animate-rise rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-sm"
                  style={{ animationDelay: `${140 + i * 80}ms` }}
                >
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                    {label}
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section id="features" className="relative bg-[#f2f5f9] py-24 text-foreground">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#070b12]/10 to-transparent" />
        <div className="relative mx-auto w-full max-w-6xl px-6">
          <div className="mb-14 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Capabilities
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
              Built for real operations.
            </h2>
            <p className="mt-4 text-base text-muted-foreground">{settings.tagline}</p>
          </div>
          <div className="grid gap-x-12 gap-y-14 md:grid-cols-2">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="animate-rise group border-t border-[#cfd8e3] pt-7"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-2xl font-semibold tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                    {feature.body}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#070b12]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-10 text-sm text-white/50 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {settings.companyName}. {settings.footerText}
          </p>
          <Link href="/login" className="font-semibold text-white/85 hover:text-white">
            Sign in to {settings.productName}
          </Link>
        </div>
      </footer>
    </div>
  );
}
