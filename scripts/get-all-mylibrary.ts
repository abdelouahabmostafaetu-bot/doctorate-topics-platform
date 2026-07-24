// سكربت استرجاع كل قاعدة mylibrary القديمة
// ------------------------------------------------------------
// الوضع 1 (افتراضي):  npm run db-backup
//   - يعرض كل المجموعات (collections) وعدد الوثائق والحقول وعينات من العناوين
//   - يحفظ نسخة كاملة من كل شيء في ملف mylibrary-backup.json
// الوضع 2:  npm run db-import-all
//   - نفس الشيء + يستورد كل المحتوى القديم إلى دفاتر:
//     كل مجموعة قديمة تصبح دفترًا «📥 اسمها» ووثائقها تصبح ملاحظات
//   - آمن للتكرار: يتخطى أي ملاحظة موجودة بنفس العنوان
// ------------------------------------------------------------
import { config } from "dotenv";
config({ path: ".env" });

import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import { writeFileSync } from "node:fs";
import { MongoClient, type Document } from "mongodb";

const url = process.env.DATABASE_URL_MYLIBRARY;
if (!url) {
  console.error("\u274c DATABASE_URL_MYLIBRARY غير موجود في ملف .env");
  process.exit(1);
}

const DO_IMPORT = process.argv.includes("--import");

// مجموعات الدفاتر/الملاحظات الحالية (لا نستورد منها — هي الوجهة)
const NB_COLS = ["notebooks", "notebook", "notefolders"];
const NOTE_COLS = ["notes", "note", "mynotes", "usernotes", "studynotes"];
// مجموعات حساسة/تقنية لا يجب استيرادها أبدًا
const NEVER_IMPORT = new Set([
  ...NB_COLS,
  ...NOTE_COLS,
  "users",
  "accounts",
  "sessions",
  "verificationtokens",
  "verification_tokens",
  "system.views",
]);

const TITLE_FIELDS = ["title", "name", "subject", "heading", "question", "topic"];
const CONTENT_FIELDS = [
  "content",
  "body",
  "text",
  "markdown",
  "latex",
  "note",
  "statement",
  "problem",
  "solution",
  "answer",
  "description",
  "details",
  "summary",
  "proof",
  "hint",
];

const FIELD_LABELS: Record<string, string> = {
  statement: "📌 نص المسألة",
  problem: "📌 المسألة",
  solution: "✅ الحل",
  answer: "✅ الإجابة",
  proof: "📐 البرهان",
  hint: "💡 تلميح",
  description: "📝 الوصف",
  details: "📄 تفاصيل",
  summary: "📋 ملخص",
};

function pickTitle(doc: Document): string | null {
  for (const f of TITLE_FIELDS) {
    const v = doc[f];
    if (typeof v === "string" && v.trim()) return v.trim().slice(0, 140);
  }
  return null;
}

function pickContent(doc: Document): string {
  const parts: Array<{ field: string; value: string }> = [];
  for (const f of CONTENT_FIELDS) {
    const v = doc[f];
    if (typeof v === "string" && v.trim()) parts.push({ field: f, value: v.trim() });
  }
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].value;
  return parts
    .map((p) => `### ${FIELD_LABELS[p.field] ?? p.field}\n\n${p.value}`)
    .join("\n\n");
}

async function main() {
  const client = new MongoClient(url as string);
  await client.connect();
  const db = client.db();
  console.log(`\n🔗 متصل بقاعدة: ${db.databaseName}\n`);

  const colInfos = await db.listCollections().toArray();
  const colNames = colInfos.map((c) => c.name).sort();

  // ===== 1) جرد كل المجموعات + نسخة احتياطية كاملة =====
  const dump: Record<string, Document[]> = {};
  console.log("📊 محتوى القاعدة:");
  console.log("─".repeat(60));
  for (const name of colNames) {
    const docs = await db.collection(name).find({}).toArray();
    dump[name] = docs as Document[];
    const fields = new Set<string>();
    for (const d of docs.slice(0, 10)) Object.keys(d).forEach((k) => fields.add(k));
    console.log(`\n📁 ${name} — ${docs.length} وثيقة`);
    console.log(`   الحقول: ${Array.from(fields).join(", ") || "(فارغة)"}`);
    const samples = docs
      .map((d) => pickTitle(d as Document))
      .filter((t): t is string => !!t)
      .slice(0, 5);
    for (const s of samples) console.log(`   • ${s}`);
  }
  console.log("\n" + "─".repeat(60));

  const backup = JSON.stringify(dump, null, 2);
  writeFileSync("mylibrary-backup.json", backup, "utf8");
  console.log(
    `\n💾 تم حفظ نسخة كاملة من كل شيء في: mylibrary-backup.json (${(backup.length / 1024).toFixed(0)} KB)`,
  );

  // ===== 2) الاستيراد (مع --import فقط) =====
  if (!DO_IMPORT) {
    console.log(
      "\nℹ️  لاستيراد كل المحتوى القديم إلى دفاتر وملاحظات، شغّل:\n   npm run db-import-all\n",
    );
    await client.close();
    return;
  }

  const nbColName =
    process.env.MYNOTES_NOTEBOOKS_COLLECTION ||
    NB_COLS.find((c) => colNames.includes(c)) ||
    "notebooks";
  const noteColName =
    process.env.MYNOTES_NOTES_COLLECTION ||
    NOTE_COLS.find((c) => colNames.includes(c)) ||
    "notes";
  const nbCol = db.collection(nbColName);
  const noteCol = db.collection(noteColName);

  console.log(`\n📥 الاستيراد إلى: دفاتر ← "${nbColName}" ، ملاحظات ← "${noteColName}"\n`);

  // عناوين الملاحظات الموجودة (لتجنب التكرار)
  const existingTitles = new Set<string>(
    (await noteCol.find({}, { projection: { title: 1 } }).toArray()).map((d) =>
      String((d as Document).title ?? "").trim(),
    ),
  );

  let totalAdded = 0;
  let totalSkipped = 0;

  for (const name of colNames) {
    if (NEVER_IMPORT.has(name.toLowerCase())) continue;
    const docs = dump[name] ?? [];
    const noteLike = docs.filter((d) => pickContent(d).length > 0);
    if (noteLike.length === 0) {
      console.log(`⏭️  ${name}: لا يوجد محتوى نصي قابل للاستيراد`);
      continue;
    }

    // دفتر لكل مجموعة قديمة
    const nbTitle = `📥 ${name}`;
    let nb = await nbCol.findOne({
      $or: [{ title: nbTitle }, { name: nbTitle }],
    });
    if (!nb) {
      const now = new Date();
      const res = await nbCol.insertOne({
        title: nbTitle,
        createdAt: now,
        updatedAt: now,
      });
      nb = { _id: res.insertedId, title: nbTitle } as Document;
      console.log(`📒 تم إنشاء دفتر جديد: ${nbTitle}`);
    }
    const notebookId = String(nb._id);

    let added = 0;
    let skipped = 0;
    for (const doc of noteLike) {
      const content = pickContent(doc);
      const title =
        pickTitle(doc) ?? content.replace(/\s+/g, " ").trim().slice(0, 60);
      if (existingTitles.has(title.trim())) {
        skipped++;
        continue;
      }
      const createdAt =
        doc.createdAt instanceof Date ? doc.createdAt : new Date();
      await noteCol.insertOne({
        title,
        content,
        notebookId,
        pinned: false,
        createdAt,
        updatedAt: new Date(),
      });
      existingTitles.add(title.trim());
      added++;
    }
    totalAdded += added;
    totalSkipped += skipped;
    console.log(`✅ ${name}: أُضيفت ${added} ملاحظة — تُخطيت ${skipped} (موجودة مسبقًا)`);
  }

  console.log("\n" + "─".repeat(60));
  console.log(
    `🎉 انتهى الاستيراد: ${totalAdded} ملاحظة جديدة ، ${totalSkipped} متخطاة — افتح صفحة «📝 ملاحظاتي» لرؤية الدفاتر الجديدة`,
  );
  await client.close();
}

main().catch((e) => {
  console.error("\u274c خطأ:", e instanceof Error ? e.message : e);
  process.exit(1);
});
