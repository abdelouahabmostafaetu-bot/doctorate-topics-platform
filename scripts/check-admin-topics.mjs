import fs from "fs";
const f = "src/app/admin/topics/actions.ts";
const s = fs.readFileSync(f, "utf8");
const bad = ["resolveUniversityId", "resolveSpecialtyId", "durationMinutesForExamType"];
for (const b of bad) {
  if (s.includes(b)) console.log("FOUND", b);
  else console.log("clean", b);
}
console.log("braces", (s.match(/\{/g)||[]).length, (s.match(/\}/g)||[]).length);
console.log("exports", [...s.matchAll(/export async function (\w+)/g)].map(m=>m[1]).join(", "));
