import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  href?: string | null;
  className?: string;
  variant?: "light" | "dark";
  showProduct?: boolean;
  logoUrl?: string;
  productName?: string;
  tagline?: string;
};

export function Logo({
  href = "/",
  className,
  variant = "light",
  showProduct = true,
  logoUrl = "/branding/fair-construction-logo.png",
  productName = "FairLeave",
  tagline = "Leave OS",
}: LogoProps) {
  const subtitle =
    tagline.trim().length > 28 ? `${tagline.trim().slice(0, 28)}…` : tagline.trim();

  const content = (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <Image
        src={logoUrl}
        alt={productName}
        width={220}
        height={56}
        priority
        className="h-9 w-auto object-contain md:h-10"
        unoptimized={logoUrl.startsWith("/branding/uploads/")}
      />
      {showProduct ? (
        <span
          className={cn(
            "hidden border-l pl-3 leading-tight sm:block",
            variant === "dark" ? "border-white/20" : "border-border",
          )}
        >
          <span
            className={cn(
              "block font-display text-sm font-semibold tracking-tight",
              variant === "dark" ? "text-white" : "text-foreground",
            )}
          >
            {productName}
          </span>
          <span
            className={cn(
              "block text-[11px] uppercase tracking-[0.16em]",
              variant === "dark" ? "text-white/70" : "text-muted-foreground",
            )}
          >
            {subtitle || "Leave OS"}
          </span>
        </span>
      ) : null}
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} className="outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {content}
    </Link>
  );
}
