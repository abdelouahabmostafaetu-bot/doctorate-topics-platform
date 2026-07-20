/**
 * استيراد امتحانات إلى الجامعة والتخصص الموجودين مسبقًا فقط.
 * لا ينشئ جامعة أو تخصصًا جديدًا نهائيًا.
 *
 * التشغيل:
 * node scripts/import-existing-list-topic-json.mjs data/exams/usthb-2026-common.json
 * node scripts/import-existing-list-topic-json.mjs data/exams/usthb-2026-algebra-tn.json
 */
import { config } from "dotenv";
config({ path: ".env" });

import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    throw new Error("الاستعمال: node scripts/import-existing-list-topic-json.mjs <ملف-json>");
  }

  const data = JSON.parse(readFileSync(jsonPath, "utf8"));

  // مهم: بحث فقط. لا يوجد upsert ولا create للجامعة/التخصص.
  const university = await prisma.university.findUnique({
    where: { slug: String(data.universitySlug) },
  });
  if (!university) {
    throw new Error(
      `الجامعة الموجودة في قائمتك غير موجودة بهذا المعرّف: ${data.universitySlug}. لم يُنشأ أي سجل جديد.`,
    );
  }

  const specialty = await prisma.specialty.findUnique({
    where: { slug: String(data.specialtySlug) },
  });
  if (!specialty) {
    throw new Error(
      `التخصص الموجود في قائمتك غير موجود بهذا المعرّف: ${data.specialtySlug}. لم يُنشأ أي سجل جديد.`,
    );
  }

  const existing = await prisma.topic.findUnique({
    where: { slug: String(data.slug) },
  });
  if (existing) {
    console.log(`⏭️ موجود مسبقًا: ${data.slug} — لم يُنشأ تكرار.`);
    return;
  }

  const problems = (data.problems ?? []).map((problem, index) => ({
    problemNumber: Number(problem.problemNumber) || index + 1,
    title: String(problem.title),
    difficulty: ["easy", "medium", "hard"].includes(problem.difficulty)
      ? problem.difficulty
      : "medium",
    tags: Array.isArray(problem.tags) ? problem.tags.map(String) : [],
    statement: String(problem.statement),
    solution: null,
    remark: problem.remark ? String(problem.remark) : null,
    hasSolution: false,
  }));

  if (problems.length === 0) throw new Error("لا توجد تمارين للاستيراد.");

  const topic = await prisma.topic.create({
    data: {
      slug: String(data.slug),
      title: String(data.title),
      examType: data.examType === "specialty" ? "specialty" : "general",
      year: Number(data.year),
      universityId: university.id,
      specialtyId: specialty.id,
      source: String(data.source),
      examNumber: Number(data.examNumber),
      coefficient: data.coefficient ?? null,
      durationMinutes: data.durationMinutes ?? null,
      problems,
      files: Array.isArray(data.files) ? data.files : [],
      status: "published",
    },
  });

  console.log(`✅ أُضيف إلى القائمة الموجودة: ${topic.slug}`);
  console.log(`🏛️ الجامعة: ${university.nameAr}`);
  console.log(`📚 التخصص: ${specialty.nameAr}`);
  console.log(`🔗 https://www.docmathdz.dev/topics/${topic.slug}`);
}

main()
  .catch((error) => {
    console.error("❌", error.message ?? error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
