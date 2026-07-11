/**
 * إصلاح وثائق المساهمات القديمة في MongoDB لتطابق المخطط الجديد.
 *
 * المشكلة: الوثائق القديمة تحتوي على kind (latex/files) ولا تحتوي على
 * الحقول المطلوبة في المخطط الجديد (type, updatedAt)، مما يجعل أي قراءة
 * لجدول contributions تنهار (صفحات /contribute و /admin/contributions).
 *
 * الاستخدام: node scripts/fix-contributions.mjs
 */
import { config } from "dotenv";
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function modified(res) {
  return (res && (res.nModified ?? res.n ?? 0)) || 0;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** يعيد المحاولة حتى 5 مرات عند أخطاء الشبكة/المهلة */
async function withRetry(label, fn) {
  let lastErr;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fn();
      console.log(`\u2705 ${label}:`, modified(res));
      return res;
    } catch (e) {
      lastErr = e;
      const msg = String(e?.message ?? e);
      const retryable =
        msg.includes("timed out") ||
        msg.includes("Retryable") ||
        msg.includes("I/O error") ||
        msg.includes("connection") ||
        msg.includes("Server selection");
      if (!retryable) throw e;
      const wait = attempt * 3000;
      console.log(
        `\u26a0\ufe0f  ${label}: مهلة شبكة (محاولة ${attempt}/5)، إعادة المحاولة بعد ${wait / 1000} ثوانٍ...`
      );
      await sleep(wait);
    }
  }
  throw lastErr;
}

console.log("🔌 الاتصال بقاعدة البيانات...");
await withRetry("الاتصال", async () => {
  await prisma.$connect();
  return { n: 1 };
});

console.log("🔍 إصلاح وثائق المساهمات القديمة...");

await withRetry("kind=latex -> type=latex", () =>
  prisma.$runCommandRaw({
    update: "contributions",
    updates: [
      {
        q: { type: { $exists: false }, kind: "latex" },
        u: { $set: { type: "latex" } },
        multi: true,
      },
    ],
  })
);

await withRetry("kind=files -> type=file", () =>
  prisma.$runCommandRaw({
    update: "contributions",
    updates: [
      {
        q: { type: { $exists: false }, kind: "files" },
        u: { $set: { type: "file" } },
        multi: true,
      },
    ],
  })
);

await withRetry("type مفقود -> file", () =>
  prisma.$runCommandRaw({
    update: "contributions",
    updates: [
      {
        q: { type: { $exists: false } },
        u: { $set: { type: "file" } },
        multi: true,
      },
    ],
  })
);

await withRetry("type غير صالح -> file", () =>
  prisma.$runCommandRaw({
    update: "contributions",
    updates: [
      {
        q: { type: { $nin: ["latex", "file"] } },
        u: { $set: { type: "file" } },
        multi: true,
      },
    ],
  })
);

await withRetry("updatedAt مفقود -> createdAt", () =>
  prisma.$runCommandRaw({
    update: "contributions",
    updates: [
      {
        q: { updatedAt: { $exists: false } },
        u: [{ $set: { updatedAt: "$createdAt" } }],
        multi: true,
      },
    ],
  })
);

await withRetry("examType غير صالح -> حُذف", () =>
  prisma.$runCommandRaw({
    update: "contributions",
    updates: [
      {
        q: {
          examType: { $exists: true, $nin: ["general", "specialty", null] },
        },
        u: { $unset: { examType: "" } },
        multi: true,
      },
    ],
  })
);

await withRetry("status غير صالح -> pending", () =>
  prisma.$runCommandRaw({
    update: "contributions",
    updates: [
      {
        q: {
          status: { $nin: ["pending", "accepted", "rejected", "duplicate"] },
        },
        u: { $set: { status: "pending" } },
        multi: true,
      },
    ],
  })
);

// التحقق النهائي: محاولة قراءة كل المساهمات عبر Prisma
try {
  const all = await prisma.contribution.findMany({
    orderBy: { createdAt: "desc" },
  });
  console.log(`\n🎉 نجحت القراءة! عدد المساهمات: ${all.length}`);
  for (const c of all) {
    console.log(
      `  - ${c.title ?? "(بلا عنوان)"} | type=${c.type} | status=${c.status} | points=${c.pointsAwarded ?? 0}`
    );
  }
} catch (e) {
  console.error("\n❌ ما زالت هناك مشكلة في القراءة:", e.message);
  process.exit(1);
}

await prisma.$disconnect();
console.log("\n✅ تم الإصلاح. أعد تحميل صفحتي /contribute و /admin/contributions.");
