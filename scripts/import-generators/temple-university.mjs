import { mkdir, writeFile } from "node:fs/promises";

const exams = [];
const subjects = {
  geo: ["Geometry and Topology", "الهندسة والطوبولوجيا", "DiffGeoTop", "Post2012DiffGeoTopGradExams"],
  alg: ["Algebra", "الجبر", "Algebra", "Post2012AlgebraGradExams"],
  num: ["Numerical Analysis", "التحليل العددي", "Numerical", "Post2012NumericalGradExams"],
  real: ["Real Analysis", "التحليل الحقيقي", "Real", "Post2012RealGradExams_0"],
};

function add(year, term, code, url) {
  const [specialty, specialtyAr] = subjects[code];
  exams.push({
    title: `اختبار الدكتوراه الشامل في ${specialtyAr} — تمبل ${term === "Spring" ? "ربيع" : "خريف"} ${year}`,
    year,
    examNumber: term === "Spring" ? 1 : 2,
    specialty,
    specialtyAr,
    pdfUrl: url,
  });
}

const direct = [
  [2026,"Spring","geo","https://cst.temple.edu/sites/cst/files/media/document/DiffGeoTopSpring2026.pdf"],
  [2026,"Spring","num","https://cst.temple.edu/sites/cst/files/media/document/NumericalSpring2026.pdf"],
  [2026,"Spring","real","https://cst.temple.edu/sites/cst/files/media/document/RealSpring2026.pdf"],
  [2025,"Fall","geo","https://cst.temple.edu/sites/cst/files/media/document/DiffGeoTopFall2025.pdf"],
  [2025,"Fall","alg","https://cst.temple.edu/sites/cst/files/media/document/AlgebraFall2025_0.pdf"],
  [2025,"Fall","num","https://cst.temple.edu/sites/cst/files/media/document/NumericalFall2025.pdf"],
  [2025,"Fall","real","https://cst.temple.edu/sites/cst/files/media/document/RealFall2025.pdf"],
  [2025,"Spring","geo","https://cst.temple.edu/sites/cst/files/media/document/DiffGeoTopSpring2025.pdf"],
  [2024,"Fall","geo","https://cst.temple.edu/sites/cst/files/DiffGeoTopFall2024.pdf"],
  [2024,"Fall","alg","https://cst.temple.edu/sites/cst/files/AlgebraFall2024.pdf"],
  [2024,"Fall","num","https://cst.temple.edu/sites/cst/files/NumericalFall2024.pdf"],
  [2024,"Fall","real","https://cst.temple.edu/sites/cst/files/RealFall2024.pdf"],
  [2024,"Spring","geo","https://cst.temple.edu/sites/cst/files/GTqualJan2024.pdf"],
  [2024,"Spring","num","https://cst.temple.edu/sites/cst/files/Prelim_NA_2024_01.pdf"],
];
for (const row of direct) add(...row);

const all = ["geo","alg","num","real"];
const groups = [
  [2023,"Fall",all],[2023,"Spring",["geo","num","real"]],
  [2022,"Fall",all],
  [2021,"Fall",all],[2021,"Spring",["geo","alg","real"]],
  [2020,"Fall",["geo","real"]],[2020,"Spring",["geo","alg","real"]],
  [2019,"Fall",all],[2019,"Spring",["geo","alg","real"]],
  [2018,"Fall",["geo","alg","real"]],[2018,"Spring",["geo","alg","real"]],
  [2017,"Fall",["geo","alg","real"]],[2017,"Spring",["geo","alg","real"]],
  [2016,"Fall",["geo","alg","real"]],[2016,"Spring",["geo","alg","real"]],
  [2015,"Fall",["geo","alg","real"]],[2015,"Spring",["alg","real"]],
  [2014,"Fall",["geo","alg","real"]],[2014,"Spring",["geo","alg","real"]],
  [2013,"Fall",["alg","real"]],[2013,"Spring",["alg","real"]],
  [2012,"Fall",["alg","real"]],[2012,"Spring",["alg","real"]],
];
for (const [year, term, codes] of groups) {
  for (const code of codes) {
    const [, , prefix, directory] = subjects[code];
    add(year, term, code, "https://cst.temple.edu/sites/cst/files/" + directory + "/" + prefix + term + year + ".pdf");
  }
}

const archive = {
  defaults: { university: "US - Temple University", universityAr: "جامعة تمبل", examType: "specialty", status: "published", durationMinutes: 180 },
  exams,
};
await mkdir("import", { recursive: true });
await writeFile("import/generated-temple-university.json", JSON.stringify(archive, null, 2) + "\n");
console.log(`Generated ${exams.length} Temple University exams.`);
