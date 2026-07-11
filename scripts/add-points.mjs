// إضافة نقاط لمستخدم — الاستعمال:
//   node scripts/add-points.mjs <البريد-أو-الاسم> <عدد-النقاط>
// مثال:
//   node scripts/add-points.mjs ali_maths 300
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const identifier = process.argv[2];
const amount = Number(process.argv[3]);

if (!identifier || !Number.isFinite(amount) || amount === 0) {
  console.log("Usage:   node scripts/add-points.mjs <email-or-name> <points>");
  console.log("Example: node scripts/add-points.mjs ali_maths 300");
  process.exit(1);
}

let user = null;
try {
  user = await prisma.user.findUnique({ where: { email: identifier } });
} catch {
  user = null;
}
if (!user) {
  user = await prisma.user.findFirst({
    where: {
      OR: [
        { name: identifier },
        { email: { contains: identifier, mode: "insensitive" } },
        { name: { contains: identifier, mode: "insensitive" } },
      ],
    },
  });
}

if (!user) {
  console.log("NOT FOUND: " + identifier);
  console.log("");
  console.log("Available users:");
  const all = await prisma.user.findMany({
    select: { email: true, name: true, points: true, role: true },
  });
  for (const u of all) {
    console.log(
      " - " + u.name + " | " + u.email + " | " + u.role + " | points: " + u.points
    );
  }
  await prisma.$disconnect();
  process.exit(1);
}

const updated = await prisma.user.update({
  where: { id: user.id },
  data: { points: { increment: amount } },
});

console.log(
  "SUCCESS: " +
    updated.name +
    " (" +
    updated.email +
    ") — points: " +
    user.points +
    " -> " +
    updated.points
);
await prisma.$disconnect();
