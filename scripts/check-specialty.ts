/**
 * يتحقق فقط (لا يعدّل شيئًا) من وجود امتحانات من نوع "تخصّص" في mylibrary/doctorateproblems.
 *
 * التشفيل:  npm run check-specialty
 */
import { config } from "dotenv";
config({ path: ".env" });

import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import { MongoClient } from "mongodb";

async function main() {
  const url = process.env.DATABASE_URL_MYLIBRARY;
  if (!url) {
    throw new Error("أضف DATABASE_URL_MYLIBRARY في .env");
  }

  const client = new MongoClient(url);
  await client.connect();
  const col = client.db().collection("doctorateproblems");

  const total = await col.countDocuments({});
  const general = await col.countDocuments({
    examType: { $ne: "specialist" },
  });
  const specialty = await col.countDocuments({ examType: "specialist" });
  const specialtyFieldValues = await col.distinct("specialty");
  const examTypeValues = await col.distinct("examType");

  console.log("===== نتيجة الفحص =====");
  console.log(`إجمالي المستندات: ${total}`);
  console.log(`عام (أو فارِـ): ${general} | تخصّص: ${specialty}`);
  console.log(
    `قيم حقل examType الموجودة فعليًا: ${JSON.stringify(examTypeValues)}`,
  );
  console.log(
    `قيم حقل specialty الموجودة فعليًا: ${JSON.stringify(specialtyFieldValues)}`,
  );

  if (specialty === 0) {
    console.log(
      "\n⚠️ لا يوجد أي مستند بـ examType = 'specialist' تمامًا في mylibrary.",
    );
  } else {
    console.log(
      `\n✅ يوجد ${specialty} مستندًا تخصّصيًا (examType='specialist') جاهزة للاستيراد.`,
    );
  }

  await client.close();
}

main().catch((err) => {
  console.error("❌ خطأ:", err);
  process.exit(1);
});
