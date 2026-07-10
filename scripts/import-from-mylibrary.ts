/**
 * سكريبت الاستيراد v2 — يطابق البنية الحقيقية لـ mylibrary:
 * كل مستند في doctorateproblems = تمرين واحد،
 * والامتحان الكامل يُجمّع من التمارين التي تشترك في نفس examId.
 *
 * - يقرأ فقط من mylibrary ولا يعدّل فيها شيئًا أبدًا
 * - آمن لإعادة التشغيل: يتخطى أي امتحان استُورد سابقًا (حسب legacyId = examId)
 * - في النهاية: تحقق من الأعداد + إنشاء الفهرس النصي وفهارس TTL
 *
 * التشغيل:  npm run import
 */
import { config } from "dotenv";
config({ path: ".env" });

import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import { MongoClient } from "mongodb";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ===== أدوات مساعدة =====

/** يحول أي اسم إلى slug لاتيني: أحرف صغيرة وشرطات فقط (é ← e) */
function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// أسماء مختصرة معروفة — أضف هنا ما تريد تخصيصه
const universityOverrides: Record<string, { slug: string; nameAr: string }> = {
  "Université Saâd Dahlab - Blida 1": {
    slug: "blida-1",
    nameAr: "جامعة سعد دحلب البليدة 1",
  },
};

const specialtyOverrides: Record<string, { slug: string; nameAr: string }> = {
  Mathematics: { slug: "mathematics", nameAr: "الرياضيات" },
};

/** يستخرج رقم الموضوع من نص source مثل: "Épreuve N°03" */
function extractExamNumber(source: string): number | null {
  const m = source.match(/preuve\s*N\s*[°ºo]?\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

/** يستخرج المعامل من "Coefficient 01" */
function extractCoefficient(source: string): number | null {
  const m = source.match(/Coefficient\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

/** يحول "Durée 01h30" إلى دقائق (90) */
function extractDurationMinutes(source: string): number | null {
  const m = source.match(/Dur[ée]e\s*(\d+)\s*h\s*(\d+)?/i);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + (m[2] ? parseInt(m[2], 10) : 0);
}

// ===== الاستيراد =====

async function main() {
  const mylibraryUrl = process.env.DATABASE_URL_MYLIBRARY;
  if (!mylibraryUrl) {
    throw new Error(
      "أضف DATABASE_URL_MYLIBRARY في .env (نفس رابط Cluster0 لكن باسم قاعدة mylibrary)",
    );
  }

  console.log("🔌 الاتصال بقاعدة mylibrary (قراءة فقط)...");
  const client = new MongoClient(mylibraryUrl);
  await client.connect();
  const oldDocs = await client
    .db()
    .collection("doctorateproblems")
    .find({})
    .toArray();
  console.log(
    `📥 عدد التمارين في mylibrary/doctorateproblems: ${oldDocs.length}`,
  );

  // تجميع التمارين حسب examId — كل مجموعة = امتحان واحد
  const groups = new Map<string, any[]>();
  let noExamId = 0;
  for (const doc of oldDocs) {
    const examId = Number(doc.examId);
    // ملاحظة: مصدر mylibrary يستعمل "specialist" (لا "specialty") للامتحانات التخصّصية
    const docExamType = doc.examType === "specialist" ? "specialty" : "general";
    if (!Number.isFinite(examId)) {
      noExamId++;
      console.warn(
        `⚠️ تمرين بدون examId — لن يُستورد: _id=${doc._id} | ${String(doc.title ?? "").slice(0, 50)}`,
      );
      continue;
    }
    const mapKey = `${examId}::${docExamType}`;
    if (!groups.has(mapKey)) groups.set(mapKey, []);
    groups.get(mapKey)!.push(doc);
  }
  console.log(`📚 عدد الامتحانات (قيم examId المميزة): ${groups.size}`);
  if (noExamId > 0)
    console.warn(
      `⚠️ ${noExamId} تمرينًا بدون examId — أضف لها examId في mylibrary ثم أعد التشغيل لاستيرادها`,
    );

  let imported = 0;
  let skipped = 0;
  const seqCounters = new Map<string, number>();
  const sortedGroupKeys = [...groups.keys()].sort((a, b) => {
    const [aId, aType] = a.split("::");
    const [bId, bType] = b.split("::");
    return Number(aId) - Number(bId) || aType.localeCompare(bType);
  });

  for (const mapKey of sortedGroupKeys) {
    const docs = groups.get(mapKey)!;
    const [examIdStr, groupExamType] = mapKey.split("::");
    const examId = Number(examIdStr);
    docs.sort(
      (a, b) => (Number(a.problemNumber) || 0) - (Number(b.problemNumber) || 0),
    );
    const first = docs[0];

    // آمن لإعادة التشغيل: تخطِّ المستورد سابقًا
    const legacyId =
      groupExamType === "specialty" ? examId + 1_000_000 : examId;

    const existing = await prisma.topic.findUnique({
      where: { legacyId },
    });
    if (existing) {
      skipped++;
      continue;
    }

    // تحقق من تجانس المجموعة
    const inconsistent = docs.some(
      (d) =>
        d.year !== first.year ||
        d.university !== first.university ||
        d.examType !== first.examType,
    );
    if (inconsistent) {
      console.warn(
        `⚠️ examId=${examId}: تمارينه غير متجانسة (سنة/جامعة/نوع مختلفة) — اعتمدنا بيانات أول تمرين`,
      );
    }

    // 1) الجامعة
    const uniName =
      String(first.university ?? "").trim() || "Unknown University";
    const uniOv = universityOverrides[uniName];
    const university = await prisma.university.upsert({
      where: { name: uniName },
      update: {},
      create: {
        name: uniName,
        nameAr: uniOv?.nameAr ?? uniName, // راجع الأسماء العربية لاحقًا من Prisma Studio
        slug: uniOv?.slug ?? slugify(uniName),
      },
    });

    // 2) التخصص (فارغ في بياناتك — الافتراضي: Mathematics)
    const specName = String(first.specialty ?? "").trim() || "Mathematics";
    const specOv = specialtyOverrides[specName];
    const specialty = await prisma.specialty.upsert({
      where: { name: specName },
      update: {},
      create: {
        name: specName,
        nameAr: specOv?.nameAr ?? specName,
        slug: specOv?.slug ?? slugify(specName),
      },
    });

    // 3) توليد slug الامتحان: <جامعة>-<سنة>-<نوع>-<رقم>
    const source = String(first.source ?? "");
    const year = Number(first.year) || 0;
    // ملاحظة: مصدر mylibrary يستعمل "specialist" (لا "specialty") للامتحانات التخصّصية
    const examType = first.examType === "specialist" ? "specialty" : "general";
    const groupKey = `${university.slug}-${year}-${examType}`;
    let examNumber = extractExamNumber(source);
    if (examNumber == null) {
      const next = (seqCounters.get(groupKey) ?? 0) + 1;
      seqCounters.set(groupKey, next);
      examNumber = next;
    }
    let slug = `${groupKey}-${String(examNumber).padStart(2, "0")}`;
    while (await prisma.topic.findUnique({ where: { slug } })) {
      slug = `${slug}-x`; // ضمان عدم التكرار
    }

    // 4) التمارين المضمّنة (مرتبة حسب problemNumber)
    const problems = docs.map((p: any, i: number) => ({
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

    // 5) إنشاء الامتحان (topic) بتمارينه
    await prisma.topic.create({
      data: {
        legacyId,
        slug,
        title: `Concours Doctorat ${year} — ${uniName} — Épreuve N°${String(examNumber).padStart(2, "0")}`,
        examType,
        year,
        universityId: university.id,
        specialtyId: specialty.id,
        source,
        examNumber,
        coefficient: extractCoefficient(source),
        durationMinutes: extractDurationMinutes(source),
        problems,
        files: [], // ملفات PDF تُرفع لاحقًا من لوحة الإدارة
        status: "published",
      },
    });
    imported++;
    console.log(`  ✅ ${slug} (examId=${examId}، تمارين: ${problems.length})`);
  }

  await client.close();

  // ===== التحقق =====
  const topicCount = await prisma.topic.count();
  const agg: any = await prisma.topic.aggregateRaw({
    pipeline: [
      { $project: { n: { $size: "$problems" } } },
      { $group: { _id: null, total: { $sum: "$n" } } },
    ],
  });
  const totalProblems = Array.isArray(agg) && agg[0] ? agg[0].total : 0;

  console.log("\n===== التحقق =====");
  console.log(
    `✅ امتحانات استُوردت الآن: ${imported} | ⏭️ متخطاة (مستوردة سابقًا): ${skipped}`,
  );
  console.log(
    `📊 الامتحانات في doctorate_platform/topics: ${topicCount} (المطلوب: ${groups.size})`,
  );
  console.log(
    `📊 مجموع التمارين المضمّنة: ${totalProblems} (المطلوب: ${oldDocs.length - noExamId})`,
  );
  if (
    topicCount !== groups.size ||
    totalProblems !== oldDocs.length - noExamId
  ) {
    console.warn("⚠️ الأعداد غير متطابقة — راجع الت��ذيرات أعلاه");
  } else {
    console.log("✅ الأعداد متطابقة تمامًا");
  }

  // ===== فهارس لا يدعمها Prisma: الفهرس النصي + TTL =====
  console.log("\n🔧 إنشاء الفهرس النصي وفهارس TTL...");
  await prisma.$runCommandRaw({
    createIndexes: "topics",
    indexes: [
      {
        key: {
          title: "text",
          source: "text",
          "problems.title": "text",
          "problems.tags": "text",
        },
        name: "topics_text_search",
      },
    ],
  });
  await prisma.$runCommandRaw({
    createIndexes: "drafts",
    indexes: [
      { key: { expiresAt: 1 }, name: "drafts_ttl", expireAfterSeconds: 0 },
    ],
  });
  await prisma.$runCommandRaw({
    createIndexes: "errorLogs",
    indexes: [
      {
        key: { createdAt: 1 },
        name: "error_logs_ttl",
        expireAfterSeconds: 7776000,
      },
    ],
  });
  console.log("🎉 انتهى! افتح npm run db:studio للمراجعة.");
}

main()
  .catch((e) => {
    console.error("❌ خطأ:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
