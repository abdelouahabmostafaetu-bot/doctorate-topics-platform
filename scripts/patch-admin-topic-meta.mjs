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

// Add helper once to resolve university/specialty (existing id or create from name)
if (!s.includes("async function resolveUniversityId")) {
  const helper = `
async function resolveUniversityId(universityId: string, universityOther: string) {
  if (universityId) {
    const existing = await prisma.university.findUnique({ where: { id: universityId } });
    if (existing) return existing.id;
  }
  const nameAr = universityOther.trim();
  if (!nameAr) throw new Error("يرجى اختيار جامعة أو كتابة اسم جامعة جديدة");
  const slugBase = slugify(nameAr) || "university";
  let slug = slugBase;
  let n = 1;
  while (await prisma.university.findUnique({ where: { slug } })) {
    n += 1;
    slug = slugBase + "-" + n;
  }
  // name (latin unique key) — reuse Arabic if no latin form available
  let name = nameAr;
  let nameSuffix = 1;
  while (await prisma.university.findUnique({ where: { name } })) {
    nameSuffix += 1;
    name = nameAr + " " + nameSuffix;
  }
  const created = await prisma.university.create({
    data: { name, nameAr, slug },
  });
  return created.id;
}

async function resolveSpecialtyId(specialtyId: string, specialtyOther: string) {
  if (specialtyId) {
    const existing = await prisma.specialty.findUnique({ where: { id: specialtyId } });
    if (existing) return existing.id;
  }
  const nameAr = specialtyOther.trim();
  if (!nameAr) throw new Error("يرجى اختيار تخصص أو كتابة اسم تخصص جديد");
  const slugBase = slugify(nameAr) || "specialty";
  let slug = slugBase;
  let n = 1;
  while (await prisma.specialty.findUnique({ where: { slug } })) {
    n += 1;
    slug = slugBase + "-" + n;
  }
  let name = nameAr;
  let nameSuffix = 1;
  while (await prisma.specialty.findUnique({ where: { name } })) {
    nameSuffix += 1;
    name = nameAr + " " + nameSuffix;
  }
  const created = await prisma.specialty.create({
    data: { name, nameAr, slug },
  });
  return created.id;
}
`;
  s = s.replace(
    /export async function deleteTopicAction/,
    helper + "\nexport async function deleteTopicAction",
  );
}

// Patch createTopicAction body start to resolve ids and auto duration
if (!s.includes("// auto-meta-resolve")) {
  s = s.replace(
    /export async function createTopicAction\(formData: FormData\) \{\s*await requireAdmin\(\);\s*const universityId = formData\.get\("universityId"\) as string;\s*const specialtyId = formData\.get\("specialtyId"\) as string;/
,
    `export async function createTopicAction(formData: FormData) {
  await requireAdmin();
  // auto-meta-resolve
  const universityId = await resolveUniversityId(
    String(formData.get("universityId") ?? ""),
    String(formData.get("universityOther") ?? ""),
  );
  const specialtyId = await resolveSpecialtyId(
    String(formData.get("specialtyId") ?? ""),
    String(formData.get("specialtyOther") ?? ""),
  );`,
  );
}

if (!s.includes("// auto-meta-resolve-update")) {
  s = s.replace(
    /export async function updateTopicFullAction\(formData: FormData\) \{\s*await requireAdmin\(\);\s*const id = formData\.get\("id"\) as string;\s*const title = \(formData\.get\("title"\) as string\) \|\| undefined;\s*const universityId = formData\.get\("universityId"\) as string;\s*const specialtyId = formData\.get\("specialtyId"\) as string;/
,
    `export async function updateTopicFullAction(formData: FormData) {
  await requireAdmin();
  // auto-meta-resolve-update
  const id = formData.get("id") as string;
  const title = (formData.get("title") as string) || undefined;
  const universityId = await resolveUniversityId(
    String(formData.get("universityId") ?? ""),
    String(formData.get("universityOther") ?? ""),
  );
  const specialtyId = await resolveSpecialtyId(
    String(formData.get("specialtyId") ?? ""),
    String(formData.get("specialtyOther") ?? ""),
  );`,
  );
}

// Remove old university existence check that only used raw id (create)
s = s.replace(
  /const university = await prisma\.university\.findUnique\(\{\s*where: \{ id: universityId \},\s*\}\);\s*if \(!university\) throw new Error\("[^"]*"\);\s*/,
  `const university = await prisma.university.findUnique({ where: { id: universityId } });
  if (!university) throw new Error("جامعة غير موجودة");
  `,
);

// duration auto
s = s.replace(
  /const durationMinutes = formData\.get\("durationMinutes"\) as string;/g,
  'const _durationIgnored = formData.get("durationMinutes") as string;',
);
s = s.replace(
  /durationMinutes:\s*durationMinutes\s*\?\s*parseInt\(durationMinutes,\s*10\)\s*:\s*null,/g,
  "durationMinutes: durationMinutesForExamType(examType),",
);

if (!s.includes("durationMinutesForExamType(examType)")) {
  console.error("Failed to patch durationMinutes");
  process.exit(1);
}
if (!s.includes("resolveUniversityId")) {
  console.error("Failed to add resolveUniversityId");
  process.exit(1);
}

fs.writeFileSync(file, s);
console.log("Patched", file);
