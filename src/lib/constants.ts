export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "FairLeave";
export const COMPANY_NAME =
  process.env.NEXT_PUBLIC_COMPANY_NAME ?? "Fair Construction Ltd";

export { ROLE_LABELS } from "@/lib/roles";

export const STATUS_STYLES = {
  DRAFT: "bg-slate-100 text-slate-700",
  PENDING: "bg-amber-100 text-amber-800",
  PENDING_MANAGER: "bg-yellow-100 text-yellow-900",
  PENDING_HR: "bg-amber-100 text-amber-900",
  PENDING_EXECUTIVE: "bg-orange-100 text-orange-900",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-zinc-100 text-zinc-600",
} as const;

export const STATUS_LABELS = {
  DRAFT: "Draft",
  PENDING: "Pending",
  PENDING_MANAGER: "Awaiting Manager",
  PENDING_HR: "Awaiting HR",
  PENDING_EXECUTIVE: "Awaiting MD/GM",
  APPROVED: "Approved",
  REJECTED: "Denied",
  CANCELLED: "Cancelled",
} as const;
