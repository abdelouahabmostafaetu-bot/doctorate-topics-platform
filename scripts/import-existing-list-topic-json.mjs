/**
 * استيراد امتحان باستعمال أسماء موجودة مسبقًا في قائمتي University وSpecialty.
 * لا ينشئ جامعة أو تخصصًا جديدًا، ويتوقف إذا لم يجد المطابقة الدقيقة.
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

async function findExistingUniversity(exactName) {
  const university = await prisma.university.findFirst({
    where: {
      OR: [{ name: exactName }, { nameAr: exactName }],
    },
  });

  if (!university) {
    throw new Error(
      `الجامعة غير موجودة بالاسم الدقيق: ${exactName}. لم يُنشأ أي سجل جديد.`,
    );
  }
  return university;
}

async function findExistingSpecialty(exactName) {
  const specialty = await prisma.specialty.findFirst({
    where: {
      OR: [{ name: exactName }, { nameAr: exactName }],
    },
  });

  if (!specialty) {
    throw new Error(
      `التخصص غير موجود بالاسم الدقيق: ${exactName}. لم يُنشأ أي سجل جديد.`,
    );
  }
  return specialty;
}

async function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    throw new Error(
      "الاستعمال: node scripts/import-existing-list-topic-json.mjs <ملف-json>",
    );
  }

  const data = JSON.parse(readFileSync(jsonPath, "utf8"));
  if (!data.existingUniversityName || !data.existingSpecialtyName) {
    throw new Error(
      "يجب تحديد existingUniversityName وexistingSpecialtyName في ملف JSON.",
    );
  }

  // بحث فقط في القوائم الحالية؛ لا يوجد create أو upsert هنا.
  const [university, specialty] = await Promise.all([
    findExistingUniversity(String(data.existingUniversityName)),
    findExistingSpecialty(String(data.existingSpecialtyName)),
  ]);

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

  console.log(`✅ أُضيف: ${topic.slug}`);
  console.log(`🏛️ الجامعة الموجودة: ${university.name}`);
  console.log(`🧭 التخصص الموجود: ${specialty.nameAr || specialty.name}`);
  console.log(`🔗 https://www.docmathdz.dev/topics/${topic.slug}`);
}

main()
  .catch((error) => {
    console.error("❌", error.message ?? error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
