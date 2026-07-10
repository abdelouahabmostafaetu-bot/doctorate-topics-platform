/**
 * يحذف كل المواضيع (topics) من doctorate_platform فقط — لا يلمس mylibrary
 * ولا يلمس universities/specialties (ستُعاد استعمالها تلقائيًا عند الاستيراد).
 * استخدمه فقط قبل إعادة الاستيراد الكامل بعد إصلاح مشكلة التخصّص.
 *
 * التشفيل:  npm run reset-topics
 */
import { config } from "dotenv";
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.topic.count();
  console.log(`سيتم حذف ${count} موضوعًا من doctorate_platform/topics...`);
  const result = await prisma.topic.deleteMany({});
  console.log(
    `✅ تم حذف ${result.count} موضوعًا. الجامعات والتخصّصات لم تُلمس.`,
  );
  console.log(
    "\nالآن نفّذ: npm run import (لإعادة الاستيراد بالنسخة المصلّحة)",
  );
}

main()
  .catch((err) => {
    console.error("❌ خطأ:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
