// نسخة احتياطية كاملة لكل مجموعات قاعدة البيانات — تشغيل: node backup-db.mjs
// يقرأ DATABASE_URL من .env تلقائيًا عبر Prisma
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

// كل نماذج المخطط (أسماء Prisma client بحرف صغير أول)
const models = [
  "university",
  "specialty",
  "topic",
  "user",
  "favorite",
  "contribution",
  "account",
  "session",
  "verificationToken",
  "report",
  "draft",
  "serviceStatus",
  "incident",
  "statusSubscription",
  "changelogEntry",
  "errorLog",
  "aiKey",
  "topicProgress",
  "counter",
];

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const dir = path.join(process.cwd(), "backups", stamp);
fs.mkdirSync(dir, { recursive: true });

let total = 0;
for (const m of models) {
  try {
    if (!prisma[m]) {
      console.log(`⚠️  ${m}: غير موجود في المخطط الحالي — تخطّيته`);
      continue;
    }
    const rows = await prisma[m].findMany();
    fs.writeFileSync(
      path.join(dir, `${m}.json`),
      JSON.stringify(rows, null, 2),
      "utf8"
    );
    total += rows.length;
    console.log(`✅ ${m}: ${rows.length} سجل`);
  } catch (e) {
    console.log(`⚠️  ${m}: ${e.message}`);
  }
}

await prisma.$disconnect();
console.log(`\n📦 اكتملت النسخة: ${total} سجل في ${dir}`);
console.log("⚠️  لا ترفع مجلد backups إلى git — يحتوي بيانات المستخدمين!");
