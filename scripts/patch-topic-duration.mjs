import fs from "fs";
import path from "path";

const file = path.join(process.cwd(), "src/app/admin/topics/actions.ts");
let s = fs.readFileSync(file, "utf8");

if (!s.includes("durationMinutesForExamType")) {
  if (s.includes('from "@/lib/storage"')) {
    s = s.replace(
      'from "@/lib/storage";',
      'from "@/lib/storage";\nimport { durationMinutesForExamType } from "@/lib/exam-duration";',
    );
  } else {
    s = s.replace(
      'import { auth } from "@/auth";',
      'import { auth } from "@/auth";\nimport { durationMinutesForExamType } from "@/lib/exam-duration";',
    );
  }
}

s = s.replace(
  /const durationMinutes = formData\.get\("durationMinutes"\) as string;/g,
  "const _durationIgnored = formData.get(\"durationMinutes\") as string;",
);

const before = s;
s = s.replace(
  /durationMinutes:\s*durationMinutes\s*\?\s*parseInt\(durationMinutes,\s*10\)\s*:\s*null,/g,
  "durationMinutes: durationMinutesForExamType(examType),",
);

if (s === before || !s.includes("durationMinutesForExamType(examType)")) {
  console.error("Could not patch durationMinutes assignment");
  process.exit(1);
}

fs.writeFileSync(file, s);
console.log("Patched", file);
