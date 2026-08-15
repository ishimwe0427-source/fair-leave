import { NextResponse } from "next/server";
import { canAdminister, getSession } from "@/lib/auth";
import { IMPORT_TEMPLATE_HEADERS } from "@/lib/import-workers";

export async function GET() {
  const session = await getSession();
  if (!session || !canAdminister(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sample = [
    IMPORT_TEMPLATE_HEADERS.join(","),
    "jane.doe@company.com,Jane,Doe,EMP-1001,EMPLOYEE,Site Engineer,+250700000000,ENG,manager@company.com,RW,2024-01-15,ACTIVE",
    "john.boss@company.com,John,Boss,EMP-1002,MANAGER,Operations Manager,+250700000001,OPS,,RW,2020-06-01,ACTIVE",
  ].join("\n");

  return new NextResponse(sample, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="fairleave-workers-template.csv"',
    },
  });
}
