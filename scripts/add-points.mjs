/**
 * Usage: node scripts/add-points.mjs user@email.com 2800
 * Sets absolute points (not increment) so it never silently fails.
 */
import { config } from "dotenv";
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";

const email = process.argv[2];
const points = parseInt(process.argv[3] || "", 10);

if (!email || !Number.isFinite(points)) {
  console.error("Usage: node scripts/add-points.mjs <email> <points>");
  process.exit(1);
}

const prisma = new PrismaClient();

const user = await prisma.user.findUnique({ where: { email } });
if (!user) {
  console.error("User not found:", email);
  process.exit(1);
}

const before = typeof user.points === "number" ? user.points : 0;
const updated = await prisma.user.update({
  where: { id: user.id },
  data: { points },
});
console.log(`${email}: points ${before} -> ${updated.points}`);
await prisma.$disconnect();
