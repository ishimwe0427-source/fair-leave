import { PrismaClient } from "@prisma/client";
import { ensureBaselineCatalog } from "../src/lib/bootstrap.ts";

const prisma = new PrismaClient();
await ensureBaselineCatalog(prisma);
const count = await prisma.orgRole.count();
console.log("orgRoles seeded:", count);
await prisma.$disconnect();
