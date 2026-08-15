import { prisma } from "@/lib/db";

/** True until the first Super Admin account exists. */
export async function needsSetup() {
  const count = await prisma.user.count({
    where: { role: "SUPER_ADMIN", status: "ACTIVE" },
  });
  return count === 0;
}
