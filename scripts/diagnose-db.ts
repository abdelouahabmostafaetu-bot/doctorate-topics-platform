/**
 * فحص قاعدة البيانات الإنتاجية (نفس DATABASE_URL الذي يستخدمه Vercel).
 * لا يعدّل أي شيء — قراءة فقط.
 *
 * التشغيل:  npx tsx scripts/diagnose-db.ts
 * أو للتحقق من رابط معيّن:  npx tsx scripts/diagnose-db.ts <slug>
 */
import { config } from "dotenv";
config({ path: ".env" });

import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const slugArg = process.argv[2];

  const total = await prisma.topic.count();
  const published = await prisma.topic.count({ where: { status: "published" } });
  const general = await prisma.topic.count({ where: { examType: "general" } });
  const specialty = await prisma.topic.count({
    where: { examType: "specialty" },
  });
  const universities = await prisma.university.count();
  const specialties = await prisma.specialty.count();

  console.log("===== حالة قاعدة البيانات الإنتاجية =====");
  console.log(`إجمالي المواضيع (topics): ${total}`);
  console.log(`منها منشورة (published): ${published}`);
  console.log(`عامة: ${general} | تخصّص: ${specialty}`);
  console.log(`جامعات: ${universities} | تخصّصات: ${specialties}`);

  if (slugArg) {
    const t = await prisma.topic.findUnique({
      where: { slug: slugArg },
      include: { university: true, specialty: true },
    });
    console.log(`\n----- فحص الرابط: ${slugArg} -----`);
    if (!t) {
      console.log("❌ لا يوجد أي موضوع بهذا الـ slug في قاعدة البيانات.");
    } else {
      console.log(`✅ موجود. الحالة (status): ${t.status}`);
      console.log(`   النوع: ${t.examType} | السنة: ${t.year}`);
      console.log(`   الجامعة: ${t.university?.nameAr}`);
      console.log(`   عدد التمارين: ${t.problems.length}`);
    }
  } else {
    const sample = await prisma.topic.findMany({
      take: 5,
      select: { slug: true, status: true, examType: true },
    });
    console.log("\nعيّنة من الروابط الموجودة فعليًا:");
    for (const s of sample) {
      console.log(`  - ${s.slug}  [${s.status}, ${s.examType}]`);
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ خطأ:", err);
  process.exit(1);
});
