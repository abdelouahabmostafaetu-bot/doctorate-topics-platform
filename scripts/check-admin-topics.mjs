import fs from "fs";

const file = "src/app/admin/topics/actions.ts";
const content = fs.readFileSync(file, "utf8");

function check(label, ok) {
  console.log(ok ? `clean ${label}` : `BAD ${label}`);
}

check("resolveUniversityId", !content.includes("resolveUniversityId"));
check("resolveSpecialtyId", !content.includes("resolveSpecialtyId"));
check("allocateManualLegacyId", content.includes("allocateManualLegacyId"));
check("durationFromExamType", content.includes("durationFromExamType"));

const open = (content.match(/\{/g) || []).length;
const close = (content.match(/\}/g) || []).length;
console.log("braces", open, close);

const exports = [...content.matchAll(/export async function (\w+)/g)].map(
  (m) => m[1],
);
console.log("exports", exports.join(", "));
