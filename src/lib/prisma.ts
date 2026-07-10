// Prisma Client Singleton — حسب وثيقة المعمارية (lib/prisma.ts)
// يمنع إنشاء اتصالات متعددة أثناء التطوير (hot reload)
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
