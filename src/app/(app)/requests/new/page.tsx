import { redirect } from "next/navigation";
import { RequestForm } from "@/components/leave/request-form";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertFeature } from "@/lib/features";
import { genderEligibilityWhere } from "@/lib/leave-eligibility";

export default async function NewRequestPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const feature = await assertFeature("allowEmployeeSelfRequest", session.role);
  if (!feature.ok) redirect("/requests");

  const me = await prisma.user.findUnique({
    where: { id: session.id },
    select: { gender: true },
  });

  const leaveTypes = await prisma.leaveType.findMany({
    where: {
      active: true,
      ...genderEligibilityWhere(me?.gender),
    },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Request
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Apply for leave</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Leave types shown match your profile gender (e.g. maternity for women, paternity for men).
        </p>
      </div>
      <RequestForm leaveTypes={leaveTypes} />
    </div>
  );
}
