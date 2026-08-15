import { LeaveRequestStatus } from "@prisma/client";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  overdue,
}: {
  status: LeaveRequestStatus;
  overdue?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide",
        overdue &&
          (status === "PENDING_HR" ||
            status === "PENDING_EXECUTIVE" ||
            status === "PENDING_MANAGER" ||
            status === "PENDING")
          ? "bg-red-200 text-red-900 ring-1 ring-red-400"
          : STATUS_STYLES[status],
      )}
    >
      {overdue &&
      (status === "PENDING_HR" ||
        status === "PENDING_EXECUTIVE" ||
        status === "PENDING_MANAGER" ||
        status === "PENDING")
        ? "Overdue · "
        : ""}
      {STATUS_LABELS[status] || status}
    </span>
  );
}
