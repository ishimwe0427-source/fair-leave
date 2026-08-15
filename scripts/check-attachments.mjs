import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const p = new PrismaClient();
const r = await p.leaveRequest.findMany({
  select: {
    id: true,
    reason: true,
    attachment: true,
    status: true,
    user: { select: { email: true, firstName: true, lastName: true } },
    leaveType: { select: { name: true } },
  },
  orderBy: { createdAt: "desc" },
  take: 10,
});
console.log(JSON.stringify(r, null, 2));

for (const row of r) {
  if (!row.attachment) continue;
  const rel = row.attachment.replace(/^\//, "");
  const full = path.join(process.cwd(), "public", rel);
  console.log(row.id, "exists?", fs.existsSync(full), full);
}

await p.$disconnect();
