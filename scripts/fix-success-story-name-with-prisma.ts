/**
 * إصلاح اسم تجربة النجاح باستخدام Prisma فقط.
 * لا يستعمل اتصال MongoDB المباشر.
 * التشغيل: npx tsx scripts/fix-success-story-name-with-prisma.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.successStory.updateMany({
    where: {
      slug: "functional-analysis-edp-doctoral-preparation-experience",
    },
    data: {
      name: "باحث/ة ناجح/ة",
    },
  });

  console.log(`✅ تم إصلاح ${result.count} تجربة نجاح.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
