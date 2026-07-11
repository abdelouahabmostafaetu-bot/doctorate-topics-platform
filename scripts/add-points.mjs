import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const query = process.argv[2];
const amount = Number(process.argv[3]);

if (!query || !Number.isFinite(amount)) {
  console.log("Usage: node scripts/add-points.mjs <email-or-name> <points>");
  process.exit(1);
}

async function main() {
  let user = null;
  try {
    user = await prisma.user.findUnique({ where: { email: query } });
  } catch {
    // not an email, fall through
  }
  if (!user) {
    user = await prisma.user.findFirst({
      where: {
        OR: [
          { name: query },
          { email: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
        ],
      },
    });
  }
  if (!user) {
    console.log("User not found: " + query);
    console.log("All users:");
    const all = await prisma.user.findMany({
      select: { name: true, email: true, role: true, points: true },
    });
    for (const u of all) {
      console.log(
        "- " + u.name + " | " + u.email + " | " + u.role + " | points: " + (u.points ?? 0)
      );
    }
    return;
  }

  const before = user.points ?? 0;
  const target = before + amount;

  // Explicit set instead of increment: fixes accounts created before the
  // points field existed, where increment silently does nothing.
  await prisma.user.update({
    where: { id: user.id },
    data: { points: target },
  });

  const after = await prisma.user.findUnique({
    where: { id: user.id },
    select: { points: true },
  });

  console.log(
    "SUCCESS: " +
      user.name +
      " (" +
      user.email +
      ") — points: " +
      before +
      " -> " +
      (after?.points ?? target)
  );
  if ((after?.points ?? 0) !== target) {
    console.log("WARNING: expected " + target + " but database shows " + (after?.points ?? 0));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
