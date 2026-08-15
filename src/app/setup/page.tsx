import { redirect } from "next/navigation";
import { Logo } from "@/components/branding/logo";
import { SetupForm } from "@/components/setup/setup-form";
import { mintCsrfToken } from "@/lib/auth";
import { needsSetup } from "@/lib/setup";
import { brandingStyle, getSystemSettings } from "@/lib/system";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (!(await needsSetup())) {
    redirect("/login");
  }

  const [settings, csrfToken] = await Promise.all([
    getSystemSettings(),
    Promise.resolve(mintCsrfToken()),
  ]);

  return (
    <div
      className="surface-grid flex min-h-screen flex-col"
      style={brandingStyle(settings) as React.CSSProperties}
    >
      <div className="px-6 py-6">
        <Logo
          href={null}
          logoUrl={settings.logoUrl}
          productName={settings.productName}
          tagline={settings.tagline}
        />
      </div>
      <div className="flex flex-1 items-center justify-center px-6 pb-16">
        <SetupForm csrfToken={csrfToken} />
      </div>
    </div>
  );
}
