// Export ALL existing exams from the live database into existing-exams.json
// Usage (from project root):  npx tsx scripts/exams-dedup/export-existing-exams.mjs
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";

const prisma = new PrismaClient();

const topics = await prisma.topic.findMany({
  select: {
    slug: true,
    title: true,
    year: true,
    examType: true,
    examNumber: true,
    source: true,
    university: { select: { name: true, slug: true } },
    specialty: { select: { name: true, slug: true } },
    problems: { select: { problemNumber: true, title: true, statement: true } },
  },
  orderBy: [{ year: "desc" }],
});

const out = topics.map((t) => ({
  slug: t.slug,
  title: t.title,
  year: t.year,
  examType: t.examType,
  examNumber: t.examNumber,
  university: t.university?.name ?? null,
  universitySlug: t.university?.slug ?? null,
  specialty: t.specialty?.name ?? null,
  source: t.source,
  problems: t.problems.map((p) => ({
    n: p.problemNumber,
    title: p.title,
    // first 300 chars of each statement -> enough to detect duplicates, keeps file small
    start: (p.statement || "").slice(0, 300),
  })),
}));

writeFileSync("existing-exams.json", JSON.stringify(out, null, 2), "utf8");
console.log(`Exported ${out.length} existing exams -> existing-exams.json`);
process.exit(0);
