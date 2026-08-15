import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canViewLeaveDocuments } from "@/lib/roles";

function contentTypeFor(ext: string) {
  switch (ext.toLowerCase()) {
    case ".pdf":
      return "application/pdf";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

function resolveAttachmentPath(attachment: string) {
  const cleaned = attachment.replace(/^\/+/, "").replace(/\.\./g, "");
  const candidates = [
    path.join(process.cwd(), "public", cleaned),
    path.join(process.cwd(), "storage", cleaned),
  ];
  return candidates.find((p) => existsSync(p)) || null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ requestId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId } = await context.params;
  const mode =
    request.nextUrl.searchParams.get("mode") === "download" ? "download" : "view";

  const leaveRequest = await prisma.leaveRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      userId: true,
      attachment: true,
      leaveType: { select: { name: true, code: true } },
      user: { select: { firstName: true, lastName: true, employeeCode: true } },
    },
  });

  if (!leaveRequest?.attachment) {
    return NextResponse.json({ error: "No document on this request." }, { status: 404 });
  }

  const isOwner = leaveRequest.userId === session.id;
  if (!isOwner && !canViewLeaveDocuments(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const filePath = resolveAttachmentPath(leaveRequest.attachment);
  if (!filePath) {
    return NextResponse.json({ error: "Document file missing on server." }, { status: 404 });
  }

  const ext = path.extname(filePath);
  const bytes = await readFile(filePath);
  const safeName = `${leaveRequest.user.employeeCode || "employee"}-${leaveRequest.leaveType.code || "leave"}${ext}`;

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": contentTypeFor(ext),
      "Content-Length": String(bytes.length),
      "Content-Disposition":
        mode === "download"
          ? `attachment; filename="${safeName}"`
          : `inline; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
