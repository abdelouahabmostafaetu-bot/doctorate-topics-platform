import { mkdir, writeFile } from "node:fs/promises";

const exams = [];
function add(year, number, specialty, specialtyAr, label, url) {
  exams.push({ title: `اختبار الدكتوراه التأهيلي في ${specialtyAr} — بوسطن كوليدج ${label}`, year, examNumber: number, specialty, specialtyAr, pdfUrl: url });
}
const rows = [
[2019,2,"Algebra","الجبر","خريف 2019","https://www.bc.edu/content/dam/bc1/schools/mcas/mathematics/pdf/quals/Algebra%20Qual%20Fall%202019%20v03.pdf"],
[2019,3,"Algebra","الجبر","صيف 2019","https://www.bc.edu/content/dam/bc1/schools/mcas/mathematics/pdf/quals/Algebra%20Quals%20Summer%202019%20v3.pdf"],
[2018,2,"Algebra","الجبر","خريف 2018","https://www.bc.edu/content/dam/bc1/schools/mcas/mathematics/pdf/quals/Algebra-2018F.pdf"],
[2018,1,"Algebra","الجبر","ربيع 2018 — النسخة الثانية","https://www.bc.edu/content/dam/bc1/schools/mcas/mathematics/pdf/quals/Algebra-2018S_v2.pdf"],
[2018,4,"Algebra","الجبر","ربيع 2018 — النسخة الأولى","https://www.bc.edu/content/dam/bc1/schools/mcas/mathematics/pdf/quals/Algebra-2018S.pdf"],
[2017,1,"Algebra","الجبر","ربيع 2017","https://www.bc.edu/content/dam/bc1/schools/mcas/mathematics/pdf/quals/Algebra-2017S.pdf"],
[2016,1,"Algebra","الجبر","ربيع 2016","https://www.bc.edu/content/dam/files/schools/cas_sites/math/pdf/grad-quals/algebra/Algebra-Spring%202016.pdf"],
[2015,2,"Algebra","الجبر","خريف 2015","https://www.bc.edu/content/dam/files/schools/cas_sites/math/pdf/grad-quals/algebra/Algebra-Fall%202015.pdf"],
[2015,1,"Algebra","الجبر","ربيع 2015","https://www.bc.edu/content/dam/files/schools/cas_sites/math/pdf/grad-quals/algebra/Algebra-Spring%202015.pdf"],
[2014,2,"Algebra","الجبر","خريف 2014","https://www.bc.edu/content/dam/files/schools/cas_sites/math/pdf/grad-quals/algebra/Algebra-Fall%202014.pdf"],
[2014,1,"Algebra","الجبر","ربيع 2014","https://www.bc.edu/content/dam/files/schools/cas_sites/math/pdf/grad-quals/algebra/Algebra-Spring%202014.pdf"],
[2013,2,"Algebra","الجبر","خريف 2013","https://www.bc.edu/content/dam/files/schools/cas_sites/math/pdf/grad-quals/algebra/Algebra-Fall%202013.pdf"],
[2012,2,"Algebra","الجبر","خريف 2012","https://www.bc.edu/content/dam/files/schools/cas_sites/math/pdf/grad-quals/algebra/Algebra-Fall%202012.pdf"],
[2012,1,"Algebra","الجبر","ربيع 2012","https://www.bc.edu/content/dam/files/schools/cas_sites/math/pdf/grad-quals/algebra/AlgebraS12.pdf"],
[2011,2,"Algebra","الجبر","خريف 2011","https://www.bc.edu/content/dam/files/schools/cas_sites/math/pdf/grad-quals/algebra/Algebra-F2011.pdf"],
[2011,1,"Algebra","الجبر","ربيع 2011","https://www.bc.edu/content/dam/files/schools/cas_sites/math/pdf/grad-quals/algebra/AlgQualS2011.pdf"],
[2021,2,"Real Analysis","التحليل الحقيقي","خريف 2021","https://www.bc.edu/content/dam/bc1/schools/mcas/mathematics/pdf/quals/Fall2021RealAnalysis.pdf"],
[2021,3,"Complex Analysis","التحليل العقدي","خريف 2021","https://www.bc.edu/content/dam/bc1/schools/mcas/mathematics/pdf/quals/ComplexQualFall21.pdf"],
[2021,4,"Real Analysis","التحليل الحقيقي","صيف 2021","https://www.bc.edu/content/dam/bc1/schools/mcas/mathematics/pdf/quals/summer2021RealAnalysis.pdf"],
[2021,1,"Complex Analysis","التحليل العقدي","ربيع 2021","https://www.bc.edu/content/dam/bc1/schools/mcas/mathematics/pdf/quals/ComplexQualSpring2021.pdf"],
[2020,3,"Complex Analysis","التحليل العقدي","صيف 2020","https://www.bc.edu/content/dam/bc1/schools/mcas/mathematics/pdf/quals/ComplexAnalysisSummer20.pdf"],
[2020,1,"Real Analysis","التحليل الحقيقي","ربيع 2020","https://www.bc.edu/content/dam/bc1/schools/mcas/mathematics/pdf/quals/Spring2020RealAnalysisQualFinal.pdf"],
[2018,1,"Real Analysis","التحليل الحقيقي","ربيع 2018","https://www.bc.edu/content/dam/bc1/schools/mcas/mathematics/pdf/quals/Analysis-2018S.pdf"],
[2017,2,"Real Analysis","التحليل الحقيقي","خريف 2017","https://www.bc.edu/content/dam/bc1/schools/mcas/mathematics/pdf/quals/Analysis-2017F.pdf"],
[2017,1,"Real Analysis","التحليل الحقيقي","ربيع 2017","https://www.bc.edu/content/dam/bc1/schools/mcas/mathematics/pdf/quals/Analysis-2017S.pdf"],
[2016,1,"Real Analysis","التحليل الحقيقي","ربيع 2016","https://www.bc.edu/content/dam/files/schools/cas_sites/math/pdf/grad-quals/analysis/Analysis-Spring%202016.pdf"],
[2015,1,"Real Analysis","التحليل الحقيقي","ربيع 2015","https://www.bc.edu/content/dam/files/schools/cas_sites/math/pdf/grad-quals/analysis/Analysis-Spring%202015.pdf"],
[2014,2,"Real Analysis","التحليل الحقيقي","ربيع 2014 — الجزء الثاني","https://www.bc.edu/content/dam/files/schools/cas_sites/math/pdf/grad-quals/analysis/Analysis-Spring%202014-II.pdf"],
[2014,1,"Real Analysis","التحليل الحقيقي","ربيع 2014 — الجزء الأول","https://www.bc.edu/content/dam/files/schools/cas_sites/math/pdf/grad-quals/analysis/Analysis-Spring%202014-I.pdf"],
[2013,1,"Real Analysis","التحليل الحقيقي","ربيع 2013","https://www.bc.edu/content/dam/files/schools/cas_sites/math/pdf/grad-quals/analysis/Analysis-Spring%202013.pdf"],
[2012,3,"Real Analysis","التحليل الحقيقي","شتاء 2012","https://www.bc.edu/content/dam/files/schools/cas_sites/math/pdf/grad-quals/analysis/Analysis-Winter%202012-I.pdf"],
[2012,2,"Real Analysis","التحليل الحقيقي","خريف 2012","https://www.bc.edu/content/dam/files/schools/cas_sites/math/pdf/grad-quals/analysis/Analysis-Fall%202012.pdf"],
[2012,1,"Real Analysis","التحليل الحقيقي","ربيع 2012","https://www.bc.edu/content/dam/files/schools/cas_sites/math/pdf/grad-quals/analysis/Analysis-S12.pdf"],
[2011,1,"Real Analysis","التحليل الحقيقي","ربيع 2011","https://www.bc.edu/content/dam/files/schools/cas_sites/math/pdf/grad-quals/analysis/AnalysisQualS2011.pdf"],
[2018,1,"Geometry and Topology","الهندسة والطوبولوجيا","ربيع 2018","https://www.bc.edu/content/dam/bc1/schools/mcas/mathematics/pdf/quals/Topology-2018S.pdf"],
[2017,2,"Geometry and Topology","الهندسة والطوبولوجيا","خريف 2017","https://www.bc.edu/content/dam/bc1/schools/mcas/mathematics/pdf/quals/Topology-2017F.pdf"],
[2017,1,"Geometry and Topology","الهندسة والطوبولوجيا","ربيع 2017","https://www.bc.edu/content/dam/bc1/schools/mcas/mathematics/pdf/quals/Topology-2017S.pdf"],
[2015,3,"Geometry and Topology","الهندسة والطوبولوجيا","شتاء 2015","https://www.bc.edu/content/dam/files/schools/cas_sites/math/pdf/grad-quals/topology/Topology-Winter%202015.pdf"],
[2015,1,"Geometry and Topology","الهندسة والطوبولوجيا","ربيع 2015","https://www.bc.edu/content/dam/files/schools/cas_sites/math/pdf/grad-quals/topology/Topology-Spring%202015-I.pdf"],
[2014,3,"Geometry and Topology","الهندسة والطوبولوجيا","شتاء 2014","https://www.bc.edu/content/dam/files/schools/cas_sites/math/pdf/grad-quals/topology/Topology-Winter%202014.pdf"],
[2014,1,"Geometry and Topology","الهندسة والطوبولوجيا","ربيع 2014","https://www.bc.edu/content/dam/files/schools/cas_sites/math/pdf/grad-quals/topology/Topology-Spring%202014.pdf"],
[2013,1,"Geometry and Topology","الهندسة والطوبولوجيا","ربيع 2013","https://www.bc.edu/content/dam/files/schools/cas_sites/math/pdf/grad-quals/topology/Topology-Spring%202013.pdf"],
[2012,1,"Geometry and Topology","الهندسة والطوبولوجيا","ربيع 2012","https://www.bc.edu/content/dam/files/schools/cas_sites/math/pdf/GT-S12.pdf"],
[2011,1,"Geometry and Topology","الهندسة والطوبولوجيا","ربيع 2011","https://www.bc.edu/content/dam/files/schools/cas_sites/math/pdf/grad-quals/topology/ToplQual-2011.pdf"]
];
for (const row of rows) add(...row);
const archive = { defaults: { university: "US - Boston College", universityAr: "بوسطن كوليدج", examType: "specialty", status: "published", durationMinutes: 180 }, exams };
await mkdir("import", { recursive: true });
await writeFile("import/generated-boston-college.json", JSON.stringify(archive, null, 2) + "\n");
console.log(`Generated ${exams.length} Boston College exams.`);
