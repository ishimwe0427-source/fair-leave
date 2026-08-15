import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "primary" | "success" | "warn";
}) {
  const tones = {
    default: "from-white to-[#f8fafc]",
    primary: "from-[#fff5f5] to-white",
    success: "from-emerald-50 to-white",
    warn: "from-amber-50 to-white",
  };

  const iconTone = {
    default: "bg-secondary text-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-100 text-emerald-700",
    warn: "bg-amber-100 text-amber-800",
  };

  return (
    <div
      className={cn(
        "animate-rise app-panel bg-gradient-to-br p-5",
        tones[tone],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-3xl font-semibold tracking-tight">{value}</p>
          {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <div className={cn("rounded-xl p-2.5", iconTone[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
