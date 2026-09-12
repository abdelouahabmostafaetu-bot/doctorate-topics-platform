import { mkdir, writeFile } from "node:fs/promises";
const entries=[
[2025,"2025.1","https://posmat.ufabc.edu.br/exames/PPG_Mat_2025.1_Doutorado.pdf"],
[2024,"2024.1","https://posmat.ufabc.edu.br/exames/prova_ingresso_PosMat-doutorado-2024-1.pdf"],
[2023,"2023.3","https://posmat.ufabc.edu.br/exames/prova_ingresso_PosMat-doutorado-2023-3.pdf"],
[2023,"2023.1","https://posmat.ufabc.edu.br/exames/prova_ingresso_PosMat-2023-1-doutorado.pdf"],
[2022,"2022.1","https://posmat.ufabc.edu.br/exames/Prova_Doutorado.pdf"],
[2021,"2021.2","https://posmat.ufabc.edu.br/exames/Prova_de_sele__o_Doutorado_Edital_55_2_2021.pdf"],
[2021,"2021.1","https://posmat.ufabc.edu.br/exames/Prova_de_sele__o_Doutorado.pdf"]
];
const exams=entries.map(([year,label,pdfUrl],i)=>({title:`اختبار القبول لدكتوراه الرياضيات — UFABC — ${label}`,year,examNumber:i+1,specialty:"General Mathematics",specialtyAr:"الرياضيات العامة",pdfUrl}));
const archive={defaults:{university:"BR - Federal University of ABC (UFABC)",universityAr:"جامعة ABC الاتحادية",examType:"specialty",status:"published",durationMinutes:180},exams};
await mkdir("import",{recursive:true});
await writeFile("import/generated-ufabc-brazil.json",JSON.stringify(archive,null,2)+"\n");
console.log(`Generated ${exams.length} UFABC doctoral admission exams.`);
