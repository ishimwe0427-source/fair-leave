import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const users = await prisma.user.findMany({
  select: {
    email: true,
    firstName: true,
    lastName: true,
    role: true,
    status: true,
    mustChangePassword: true,
    lockedUntil: true,
    failedLoginAttempts: true,
  },
  orderBy: { email: "asc" },
});
console.log(JSON.stringify(users, null, 2));

// Unlock everyone so testing multi-user login is not blocked
const unlocked = await prisma.user.updateMany({
  data: { lockedUntil: null, failedLoginAttempts: 0 },
});
console.log("Unlocked accounts:", unlocked.count);
await prisma.$disconnect();
