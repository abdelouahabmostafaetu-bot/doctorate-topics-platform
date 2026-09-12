import { mkdir, writeFile } from "node:fs/promises";

const exams = [];
const subjects = {
  Alg: ["Algebra", "الجبر"],
  Anal: ["Real Analysis", "التحليل الحقيقي"],
  GeomTop: ["Geometry and Topology", "الهندسة والطوبولوجيا"],
};

function add(year, session, code, url) {
  const [specialty, specialtyAr] = subjects[code];
  const isJanuary = session === "Jan";
  exams.push({
    title: `اختبار الدكتوراه التأهيلي في ${specialtyAr} — أريزونا ${isJanuary ? "يناير" : "أغسطس"} ${year}`,
    year,
    examNumber: isJanuary ? 1 : 2,
    specialty,
    specialtyAr,
    pdfUrl: url,
  });
}

for (const [code, suffix] of [["Alg", "Alg-Jan2026_0.pdf"], ["Anal", "Anal-Jan2026_0.pdf"], ["GeomTop", "GeomTop-Jan2026_2.pdf"]]) {
  add(2026, "Jan", code, "https://www.math.arizona.edu/sites/default/files/2026-01/" + suffix);
}

for (const session of ["Aug", "Jan"]) {
  const folder = session === "Aug" ? "08" : "01";
  for (const code of Object.keys(subjects)) {
    add(2025, session, code, "https://www.math.arizona.edu/sites/default/files/2025-" + folder + "/" + code + "-" + session + "2025.pdf");
  }
}

for (const code of Object.keys(subjects)) {
  add(2024, "Jan", code, "https://www.math.arizona.edu/sites/default/files/2024-04/" + code + "-Jan2024.pdf");
}

for (let year = 2023; year >= 2019; year--) {
  for (const session of ["Aug", "Jan"]) {
    for (const code of Object.keys(subjects)) {
      if (year === 2020 && session === "Aug" && code === "GeomTop") continue;
      if (year === 2019 && session === "Jan" && code === "Anal") continue;
      add(year, session, code, "https://www.math.arizona.edu/sites/default/files/2024-04/" + code + "-" + session + year + ".pdf");
    }
  }
}

for (const code of Object.keys(subjects)) {
  add(2018, "Aug", code, "https://www.math.arizona.edu/sites/default/files/2024-04/" + code + "-Aug2018.pdf");
}

const archive = {
  defaults: {
    university: "US - University of Arizona",
    universityAr: "جامعة أريزونا",
    examType: "specialty",
    status: "published",
    durationMinutes: 180,
  },
  exams,
};

await mkdir("import", { recursive: true });
await writeFile("import/generated-university-of-arizona.json", JSON.stringify(archive, null, 2) + "\n");
console.log(`Generated ${exams.length} University of Arizona exams.`);
