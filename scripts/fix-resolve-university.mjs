import fs from "fs";
import path from "path";

const file = path.join(process.cwd(), "src/app/admin/topics/actions.ts");
let s = fs.readFileSync(file, "utf8");
fs.writeFileSync(file + ".bak2", s);

// Replace resolveUniversityId / resolveSpecialtyId usages with plain FormData reads
s = s.replace(
  /const universityId = await resolveUniversityId\(\s*String\(formData\.get\("universityId"\) \?\? ""\),\s*String\(formData\.get\("universityOther"\) \?\? ""\),\s*\);/g,
  'const universityId = formData.get("universityId") as string;',
);

s = s.replace(
  /const specialtyId = await resolveSpecialtyId\(\s*String\(formData\.get\("specialtyId"\) \?\? ""\),\s*String\(formData\.get\("specialtyOther"\) \?\? ""\),\s*\);/g,
  'const specialtyId = formData.get("specialtyId") as string;',
);

// Fallback: any remaining calls
s = s.replace(/await resolveUniversityId\([^)]*\)/g, '(formData.get("universityId") as string)');
s = s.replace(/await resolveSpecialtyId\([^)]*\)/g, '(formData.get("specialtyId") as string)');

// Remove leftover helper function definitions if any remain
s = s.replace(/\nasync function resolveUniversityId\([\s\S]*?\n\}\n(?=\nasync function resolveSpecialtyId|\nexport )/g, "\n");
s = s.replace(/\nasync function resolveSpecialtyId\([\s\S]*?\n\}\n(?=\nexport )/g, "\n");

if (s.includes("resolveUniversityId") || s.includes("resolveSpecialtyId")) {
  console.error("Still contains resolveUniversityId/resolveSpecialtyId after patch:");
  const lines = s.split("\n");
  lines.forEach((line, i) => {
    if (line.includes("resolveUniversityId") || line.includes("resolveSpecialtyId")) {
      console.error(String(i + 1) + ": " + line.trim());
    }
  });
  process.exit(1);
}

const open = (s.match(/\{/g) || []).length;
const close = (s.match(/\}/g) || []).length;
if (open !== close) {
  console.error("Brace mismatch", open, close);
  process.exit(1);
}

fs.writeFileSync(file, s);
console.log("SUCCESS: removed resolveUniversityId/resolveSpecialtyId");
console.log("braces", open, close);
