import { mkdir, writeFile } from "node:fs/promises";

const exams = [];
const courses = [
  ["MATH8120", "Probability", "الاحتمالات"],
  ["MATH8143", "Real Analysis", "التحليل الحقيقي"],
  ["MATH8144", "Real Analysis", "التحليل الحقيقي"],
];

for (const [course, specialty, specialtyAr] of courses) {
  for (let number = 1; number <= 10; number++) {
    exams.push({
      title: `نموذج اختبار الدكتوراه التأهيلي ${course} رقم ${number} — جامعة نورث كارولاينا في شارلوت`,
      year: 2024,
      examNumber: number,
      specialty,
      specialtyAr,
      pdfUrl: "https://math.charlotte.edu/wp-content/uploads/sites/909/2024/04/" + course + "_" + number + ".pdf",
    });
  }
}

const archive = {
  defaults: {
    university: "US - University of North Carolina at Charlotte (UNC Charlotte)",
    universityAr: "جامعة نورث كارولاينا في شارلوت",
    examType: "specialty",
    status: "published",
    durationMinutes: 180,
  },
  exams,
};

await mkdir("import", { recursive: true });
await writeFile("import/generated-unc-charlotte.json", JSON.stringify(archive, null, 2) + "\n");
console.log(`Generated ${exams.length} UNC Charlotte qualifying exam samples.`);
