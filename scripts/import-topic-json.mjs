/**
 * استيراد امتحان واحد من ملف JSON إلى قاعدة البيانات.
 *
 * التشغيل:
 *   node scripts/import-topic-json.mjs data/exams/blida-1-2021-general-02.json
 *
 * - آمن لإعادة التشغيل: يتخطى الامتحان إذا كان slug موجودًا مسبقًا
 * - ينشئ الجامعة/التخصص تلقائيًا إن لم يكونا موجودين (upsert)
 */
import { config } from "dotenv";
config({ path: ".env" });

import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(input) {
  return String(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    throw new Error(
      "الاستعمال: node scripts/import-topic-json.mjs <chemin/exam.json>",
    );
  }
  const data = JSON.parse(readFileSync(file, "utf8"));

  // 1) الجامعة
  const uniName = String(data.university?.name ?? "").trim();
  if (!uniName) throw new Error("حقل university.name مطلوب في ملف JSON");
  const university = await prisma.university.upsert({
    where: { name: uniName },
    update: {},
    create: {
      name: uniName,
      nameAr: data.university?.nameAr ?? uniName,
      slug: data.university?.slug ?? slugify(uniName),
    },
  });

  // 2) التخصص
  const specName = String(data.specialty?.name ?? "Mathematics").trim();
  const specialty = await prisma.specialty.upsert({
    where: { name: specName },
    update: {},
    create: {
      name: specName,
      nameAr: data.specialty?.nameAr ?? specName,
      slug: data.specialty?.slug ?? slugify(specName),
    },
  });

  // 3) بيانات الامتحان
  const examType = data.examType === "specialty" ? "specialty" : "general";
  const year = Number(data.year);
  if (!Number.isFinite(year)) throw new Error("حقل year مطلوب (رقم)");
  const examNumber = Number(data.examNumber) || 1;
  const paddedNumber = String(examNumber).padStart(2, "0");
  const slug =
    data.slug ?? `${university.slug}-${year}-${examType}-${paddedNumber}`;

  const existing = await prisma.topic.findUnique({ where: { slug } });
  if (existing) {
    console.log(`⏭️ موجود مسبقًا: ${slug} — لم يُستورد شيء`);
    return;
  }

  // 4) التمارين المضمّنة
  const problems = (data.problems ?? []).map((p, i) => ({
    problemNumber: Number(p.problemNumber) || i + 1,
    title: String(p.title ?? `تمرين ${i + 1}`),
    difficulty: ["easy", "medium", "hard"].includes(p.difficulty)
      ? p.difficulty
      : "medium",
    tags: Array.isArray(p.tags) ? p.tags.map(String) : [],
    statement: String(p.statement ?? ""),
    solution: p.solution ? String(p.solution) : null,
    remark: p.remark ? String(p.remark) : null,
    hasSolution: Boolean(p.solution && String(p.solution).trim()),
  }));
  if (problems.length === 0) throw new Error("لا توجد تمارين في ملف JSON");

  // 5) إنشاء الامتحان
  const topic = await prisma.topic.create({
    data: {
      slug,
      title:
        data.title ??
        `Concours Doctorat ${year} — ${uniName} — Épreuve N°${paddedNumber}`,
      examType,
      year,
      universityId: university.id,
      specialtyId: specialty.id,
      source: String(data.source ?? ""),
      examNumber,
      coefficient: data.coefficient ?? null,
      durationMinutes: data.durationMinutes ?? null,
      problems,
      files: [],
      status: "published",
    },
  });

  console.log(`✅ استُورد: ${topic.slug} (${problems.length} تمارين)`);
  console.log("🔗 https://www.docmathdz.dev/topics/" + topic.slug);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
