import fs from "fs";
import path from "path";

const file = path.join(process.cwd(), "src/app/admin/topics/actions.ts");
if (!fs.existsSync(file)) {
  console.error("Missing", file);
  process.exit(1);
}

let s = fs.readFileSync(file, "utf8");
const backup = file + ".bak";
fs.writeFileSync(backup, s);
console.log("Backup:", backup);

// Remove broken helper blocks that patch scripts may have inserted incorrectly
s = s.replace(/\nasync function resolveUniversityId[\s\S]*?async function resolveSpecialtyId[\s\S]*?\nexport async function deleteTopicAction/, "\nexport async function deleteTopicAction");

// If resolve helpers left half-broken, strip them more aggressively
s = s.replace(/\nasync function resolveUniversityId\([\s\S]*?\n\}\n\nasync function resolveSpecialtyId\([\s\S]*?\n\}\n/g, "\n");

// Remove auto-meta-resolve rewrites that may have broken createTopicAction
// Restore classic universityId/specialtyId reads if missing
if (!s.includes('const universityId = formData.get("universityId")') && s.includes("createTopicAction")) {
  s = s.replace(
    /export async function createTopicAction\(formData: FormData\) \{\s*await requireAdmin\(\);[\s\S]*?const year =/,
    `export async function createTopicAction(formData: FormData) {
  await requireAdmin();
  const universityId = formData.get("universityId") as string;
  const specialtyId = formData.get("specialtyId") as string;
  const year =`,
  );
}

// Fix duration: use form value parse (form sends 90/180 automatically)
s = s.replace(
  /import \{ durationMinutesForExamType \} from "@\/lib\/exam-duration";\n?/g,
  "",
);
s = s.replace(
  /const _durationIgnored = formData\.get\("durationMinutes"\) as string;/g,
  'const durationMinutes = formData.get("durationMinutes") as string;',
);
s = s.replace(
  /durationMinutes:\s*durationMinutesForExamType\(examType\),/g,
  "durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : null,",
);

// Ensure durationMinutes variable exists in create if only examType line remains
if (s.includes("createTopicAction") && !s.includes('const durationMinutes = formData.get("durationMinutes")')) {
  s = s.replace(
    /const coefficient = formData\.get\("coefficient"\) as string;/,
    `const coefficient = formData.get("coefficient") as string;
  const durationMinutes = formData.get("durationMinutes") as string;`,
  );
}

// Basic syntax sanity: balanced braces
const open = (s.match(/\{/g) || []).length;
const close = (s.match(/\}/g) || []).length;
if (open !== close) {
  console.error("Brace mismatch after fix:", open, close);
  console.error("Restored from backup not automatic - check .bak");
  // restore backup
  fs.writeFileSync(file, fs.readFileSync(backup, "utf8"));
  process.exit(1);
}

fs.writeFileSync(file, s);
console.log("Fixed", file);
console.log("open/close braces", open, close);
