import { readFile, unlink } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { canAdminister, getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ jobId: string }> },
) {
  const session = await getSession();
  if (!session || !canAdminister(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await context.params;
  const job = await prisma.importJob.findUnique({ where: { id: jobId } });
  if (!job?.credentialsPath) {
    return NextResponse.json(
      { error: "Credentials already downloaded or not found" },
      { status: 404 },
    );
  }

  const filePath = path.join(
    process.cwd(),
    "private",
    "imports",
    job.credentialsPath,
  );

  try {
    const content = await readFile(filePath, "utf8");

    // One-time download: clear path then delete file
    await prisma.importJob.update({
      where: { id: jobId },
      data: { credentialsPath: null },
    });
    await unlink(filePath).catch(() => undefined);

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: "DOWNLOAD_CREDENTIALS",
        entity: "ImportJob",
        entityId: jobId,
      },
    });

    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="credentials-${jobId}.csv"`,
      },
    });
  } catch {
    await prisma.importJob.update({
      where: { id: jobId },
      data: { credentialsPath: null },
    });
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }
}
