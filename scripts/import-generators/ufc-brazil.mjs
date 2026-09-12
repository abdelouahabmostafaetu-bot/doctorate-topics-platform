import { mkdir, writeFile } from "node:fs/promises";
const entries=[
[2014,"2014.2","https://pgmat.ufc.br/wp-content/uploads/2020/10/prova-exame-de-selecao-do-doutorado-10122014.pdf"],
[2015,"2015.2","https://pgmat.ufc.br/wp-content/uploads/2020/10/prova-selecao-doutorado-20152.pdf"],
[2016,"2016.1","https://pgmat.ufc.br/wp-content/uploads/2020/10/prova-selecao-doutorado-20161.pdf"],
[2016,"2016.2","https://pgmat.ufc.br/wp-content/uploads/2020/10/prova-selecao-doutorado-20162.pdf"],
[2017,"2017.1","https://pgmat.ufc.br/wp-content/uploads/2020/10/prova-selecao-doutorado-20171.pdf"],
[2018,"2018.2","https://pgmat.ufc.br/wp-content/uploads/2020/10/prova-processo-seletivo-doutorado-2018-2.pdf"],
[2022,"2022.1","https://pgmat.ufc.br/wp-content/uploads/2022/05/selecao-dout-1.pdf"],
[2022,"2022.2","https://pgmat.ufc.br/wp-content/uploads/2022/06/pv-sel-d-20222.pdf"],
[2023,"2023.1","https://pgmat.ufc.br/wp-content/uploads/2024/01/pv-seld20231.pdf"],
[2023,"2023.2","https://pgmat.ufc.br/wp-content/uploads/2024/01/pv-seld20232.pdf"],
[2024,"2024.1","https://pgmat.ufc.br/wp-content/uploads/2024/10/exame-selec%CC%A7a%CC%83o-ana%CC%81lise-doutrado-2024.1.pdf"],
[2024,"2024.2","https://pgmat.ufc.br/wp-content/uploads/2024/10/selecao-doutorado-jul-2024.pdf"],
[2025,"2025.1","https://pgmat.ufc.br/wp-content/uploads/2025/03/pv-seld20251.pdf"]
];
const exams=entries.map(([year,label,pdfUrl],i)=>({title:`اختبار القبول لدكتوراه الرياضيات — UFC — ${label}`,year,examNumber:i+1,specialty:"General Mathematics",specialtyAr:"الرياضيات العامة",pdfUrl}));
const archive={defaults:{university:"BR - Federal University of Ceará (UFC)",universityAr:"جامعة سيارا الاتحادية",examType:"specialty",status:"published",durationMinutes:240},exams};
await mkdir("import",{recursive:true});
await writeFile("import/generated-ufc-brazil.json",JSON.stringify(archive,null,2)+"\n");
console.log(`Generated ${exams.length} UFC doctoral selection exams.`);
