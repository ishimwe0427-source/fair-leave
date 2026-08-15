"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function markNotificationReadAction(id: string) {
  const session = await getSession();
  if (!session) return;
  await prisma.notification.updateMany({
    where: { id, userId: session.id },
    data: { read: true },
  });
  revalidatePath("/dashboard");
}

export async function markAllNotificationsReadAction() {
  const session = await getSession();
  if (!session) return;
  await prisma.notification.updateMany({
    where: { userId: session.id, read: false },
    data: { read: true },
  });
  revalidatePath("/dashboard");
}
