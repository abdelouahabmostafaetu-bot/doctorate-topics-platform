import { mkdir, writeFile } from "node:fs/promises";

const exams = [];
const subjects = [
  ["algebra", "Algebra", "الجبر"],
  ["analysis", "Analysis", "التحليل"],
  ["topology", "Topology", "الطوبولوجيا"],
];
const missing = new Set([
  "2005-08-analysis",
  "2009-08-topology",
  "2013-08-topology",
  "2014-08-topology",
]);

for (let year = 2026; year >= 2005; year--) {
  const sessions = year === 2012
    ? [["01", "يناير", 1]]
    : [["08", "أغسطس", 2], ["01", "يناير", 1]];

  for (const [month, monthAr, examNumber] of sessions) {
    for (const [slug, specialty, specialtyAr] of subjects) {
      const key = `${year}-${month}-${slug}`;
      if (missing.has(key)) continue;
      exams.push({
        title: `اختبار الدكتوراه التأهيلي في ${specialtyAr} — أوكلاهوما ${monthAr} ${year}`,
        year,
        examNumber,
        specialty,
        specialtyAr,
        pdfUrl: "https://math.ou.edu/graduate/exam/" + key + ".pdf",
      });
    }
  }
}

const archive = {
  defaults: {
    university: "US - University of Oklahoma",
    universityAr: "جامعة أوكلاهوما",
    examType: "specialty",
    status: "published",
    durationMinutes: 180,
  },
  exams,
};

await mkdir("import", { recursive: true });
await writeFile("import/generated-university-of-oklahoma.json", JSON.stringify(archive, null, 2) + "\n");
console.log(`Generated ${exams.length} University of Oklahoma exams.`);
