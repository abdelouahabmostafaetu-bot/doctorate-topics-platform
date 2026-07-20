/**
 * إصلاح سجلات تجارب النجاح التي حُفظت بلا اسم.
 * التشغيل: npx tsx scripts/fix-null-success-story-names.ts
 */
import { config } from "dotenv";
import { MongoClient } from "mongodb";

config({ path: ".env" });

async function main() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL غير موجود في ملف .env");

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const result = await client
      .db()
      .collection("success_stories")
      .updateMany(
        { $or: [{ name: null }, { name: { $exists: false } }] },
        { $set: { name: "باحث/ة ناجح/ة" } },
      );

    console.log(`✅ تم إصلاح ${result.modifiedCount} تجربة نجاح.`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
