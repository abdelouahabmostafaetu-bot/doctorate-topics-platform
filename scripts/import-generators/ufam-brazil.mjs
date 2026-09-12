import { mkdir, writeFile } from "node:fs/promises";
const entries=[
[2025,"2025.1","1PgL4WVR_7yIDYew1n9javUDG8AR-xNpr"],
[2024,"2024.2","1nm7ATc77KXLOvNRfU6qk7udnH4aOYxk6"],
[2024,"2024.1","11LjsgaykblSFOHLOnwVh1rgvdAQBGdAe"],
[2023,"2023.2","1YgjvyUVqjqK3PN9_SvL87fxlW_lEoAYI"],
[2023,"2023.1","1CPWTMhhSsvisgbctamBNSszAvca_8X2Y"],
[2020,"2020","1zsF88n9ui9jHH0s-PBDyYWCEh0K_eNFR"],
[2018,"2018","1Xy8G0J8m8gGRwhNcTD7OjHhf-7SjlvO8"]
];
const exams=entries.map(([year,label,id],i)=>({title:`اختبار القبول لدكتوراه الرياضيات — UFAM — ${label}`,year,examNumber:i+1,specialty:"General Mathematics",specialtyAr:"الرياضيات العامة",pdfUrl:`https://drive.google.com/uc?export=download&id=${id}`}));
const archive={defaults:{university:"BR - Federal University of Amazonas (UFAM)",universityAr:"جامعة الأمازون الاتحادية",examType:"specialty",status:"published",durationMinutes:240},exams};
await mkdir("import",{recursive:true});
await writeFile("import/generated-ufam-brazil.json",JSON.stringify(archive,null,2)+"\n");
console.log(`Generated ${exams.length} UFAM doctoral selection exams.`);
