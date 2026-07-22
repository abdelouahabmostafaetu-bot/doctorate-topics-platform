/**
 * إصلاح شامل بأمر واحد:
 *   1) يحذف كل الامتحانات المعطوبة التي روابطها object-object-... من قاعدة البيانات
 *   2) يحذف الجامعة والتخصص المعطوبين المسمّيين "[object Object]"
 *   3) يعيد استيراد الامتحانات العشرة بشكل صحيح من data/exams/
 *      - التخصص يُؤخذ حصريًا من قائمتك الموجودة (الرياضيات) — لا يُنشأ أي تخصص جديد
 *      - الجامعة تُنشأ فقط إن لم تكن موجودة بنفس الاسم
 *      - الرابط يُؤخذ من حقل slug في الملف (مثل msila-2022-general-01)
 *
 * التشغيل:
 *   node scripts/fix-object-object-exams.mjs
 *
 * آمن لإعادة التشغيل: يتخطى أي امتحان موجود مسبقًا بنفس slug.
 */
import { config } from "dotenv";
config({ path: ".env" });

import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FILES = [
  "data/exams/msila-2022-general-01.json",
  "data/exams/biskra-2021-general-01.json",
  "data/exams/tebessa-2023-general-01.json",
  "data/exams/enset-skikda-2023-general-01.json",
  "data/exams/enset-skikda-2023-specialty-02.json",
  "data/exams/oum-el-bouaghi-2023-specialty-01.json",
  "data/exams/ouargla-2023-specialty-02.json",
  "data/exams/khemis-miliana-2023-specialty-02.json",
  "data/exams/tiaret-2020-master-edo3.json",
  "data/exams/concours-2022-variationnels-elliptiques-v02.json",
];

function slugify(input) {
  return String(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ————— 1) حذف الامتحانات المعطوبة —————
async function cleanup() {
  const deleted = await prisma.topic.deleteMany({
    where: { slug: { startsWith: "object-object-" } },
  });
  console.log(`🗑️ حُذف ${deleted.count} امتحانًا معطوبًا (object-object-...)`);

  const brokenUni = await prisma.university.findFirst({
    where: { name: "[object Object]" },
  });
  if (brokenUni) {
    const stillUsed = await prisma.topic.count({
      where: { universityId: brokenUni.id },
    });
    if (stillUsed === 0) {
      await prisma.university.delete({ where: { id: brokenUni.id } });
      console.log("🗑️ حُذفت الجامعة المعطوبة [object Object]");
    } else {
      console.log("⚠️ الجامعة المعطوبة ما زالت مستعملة — لم تُحذف");
    }
  }

  const brokenSpec = await prisma.specialty.findFirst({
    where: { name: "[object Object]" },
  });
  if (brokenSpec) {
    const stillUsed = await prisma.topic.count({
      where: { specialtyId: brokenSpec.id },
    });
    if (stillUsed === 0) {
      await prisma.specialty.delete({ where: { id: brokenSpec.id } });
      console.log("🗑️ حُذف التخصص المعطوب [object Object]");
    } else {
      console.log("⚠️ التخصص المعطوب ما زال مستعملًا — لم يُحذف");
    }
  }
}

// ————— التخصص: من قائمتك فقط، لا إنشاء أبدًا —————
async function findExistingSpecialty(exactName) {
  const specialty = await prisma.specialty.findFirst({
    where: { OR: [{ name: exactName }, { nameAr: exactName }] },
  });
  if (!specialty) {
    throw new Error(
      `التخصص غير موجود في قائمتك: ${exactName} — لن يُنشأ أي تخصص جديد. عدّل existingSpecialtyName في ملف JSON ليطابق اسمًا من قائمتك.`,
    );
  }
  return specialty;
}

// ————— 2) استيراد ملف واحد بشكل صحيح —————
async function importFile(file) {
  const data = JSON.parse(readFileSync(file, "utf8"));

  const slug = String(data.slug ?? "").trim();
  if (!slug) throw new Error(`حقل slug مطلوب في ${file}`);

  const existing = await prisma.topic.findUnique({ where: { slug } });
  if (existing) {
    console.log(`⏭️ موجود مسبقًا: ${slug} — تخطّي`);
    return;
  }

  const uniName = String(data.university?.name ?? "").trim();
  if (!uniName) throw new Error(`حقل university.name مطلوب في ${file}`);
  const university = await prisma.university.upsert({
    where: { name: uniName },
    update: {},
    create: {
      name: uniName,
      nameAr: data.university?.nameAr ?? uniName,
      slug: data.university?.slug ?? slugify(uniName),
    },
  });

  const specialty = await findExistingSpecialty(
    String(data.existingSpecialtyName ?? data.specialty?.nameAr ?? "الرياضيات"),
  );

  const examType = data.examType === "specialty" ? "specialty" : "general";
  const year = Number(data.year);
  if (!Number.isFinite(year)) throw new Error(`حقل year مطلوب (رقم) في ${file}`);

  const problems = (data.problems ?? []).map((p, i) => ({
    problemNumber: Number(p.problemNumber) || i + 1,
    title: String(p.title ?? `تمرين ${i + 1}`),
    difficulty: ["easy", "medium", "hard"].includes(p.difficulty)
      ? p.difficulty
      : "medium",
    tags: Array.isArray(p.tags) ? p.tags.map(String) : [],
    statement: String(p.statement ?? ""),
    solution: null,
    remark: p.remark ? String(p.remark) : null,
    hasSolution: false,
  }));
  if (problems.length === 0) throw new Error(`لا توجد تمارين في ${file}`);

  const topic = await prisma.topic.create({
    data: {
      slug,
      title: String(data.title),
      examType,
      year,
      universityId: university.id,
      specialtyId: specialty.id,
      source: String(data.source ?? ""),
      examNumber: Number(data.examNumber) || 1,
      coefficient: data.coefficient ?? null,
      durationMinutes: data.durationMinutes ?? null,
      problems,
      files: [],
      status: "published",
    },
  });

  console.log(`✅ استُورد: ${topic.slug} (${problems.length} تمارين) — ${university.nameAr || university.name}`);
  console.log(`🔗 https://www.docmathdz.dev/topics/${topic.slug}`);
}

async function main() {
  console.log("— المرحلة 1: تنظيف قاعدة البيانات —");
  await cleanup();
  console.log("\n— المرحلة 2: إعادة الاستيراد الصحيح —");
  for (const file of FILES) {
    await importFile(file);
  }
  console.log("\n🎉 انتهى الإصلاح بنجاح.");
}

main()
  .catch((e) => {
    console.error("❌", e.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
