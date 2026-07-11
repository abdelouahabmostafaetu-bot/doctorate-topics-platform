import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";

export type RawProblem = {
  problemNumber?: number | string;
  title?: string;
  difficulty?: string;
  tags?: string | string[];
  statement?: string;
  solution?: string | null;
  remark?: string | null;
  hasSolution?: boolean;
};

export type ParsedProblem = {
  problemNumber: number;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  statement: string;
  solution: string | null;
  remark: string | null;
  hasSolution: boolean;
};

function normalizeDifficulty(raw: unknown): "easy" | "medium" | "hard" {
  const v = String(raw ?? "medium").toLowerCase();
  if (v === "easy" || v === "hard" || v === "medium") return v;
  return "medium";
}

export function parseProblems(problemsJson: string): ParsedProblem[] {
  let raw: unknown = [];
  try {
    raw = JSON.parse(problemsJson || "[]");
  } catch {
    raw = [];
  }
  if (!Array.isArray(raw)) return [];

  return (raw as RawProblem[])
    .map((p, index) => {
      const statement = String(p.statement ?? "").trim();
      const solutionRaw = p.solution == null ? "" : String(p.solution).trim();
      const tags = Array.isArray(p.tags)
        ? p.tags.map(String).map((t) => t.trim()).filter(Boolean)
        : String(p.tags ?? "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
      const problemNumber = Number(p.problemNumber);
      return {
        problemNumber: Number.isFinite(problemNumber) ? problemNumber : index + 1,
        title: String(p.title ?? `تمرين ${index + 1}`).trim() || `تمرين ${index + 1}`,
        difficulty: normalizeDifficulty(p.difficulty),
        tags,
        statement,
        solution: solutionRaw || null,
        remark: p.remark == null || String(p.remark).trim() === ""
          ? null
          : String(p.remark).trim(),
        hasSolution: Boolean(p.hasSolution) || Boolean(solutionRaw),
      } satisfies ParsedProblem;
    })
    .filter((p) => p.statement.length > 0);
}

/**
 * يخصص legacyId فريدًا للمواضيع المُنشأة يدويًا.
 *
 * السبب الجذري لخطأ topics_legacyId_key:
 * - الحقل Int? @unique على MongoDB لا يسمح بأكثر من null واحد
 * - الأرقام العشوائية الموجبة قد تتصادم مع examId المستورد من mylibrary
 *
 * الحل: أرقام سالبة تعتمد على الوقت — لا تتصادم مع examId الموجب أبدًا.
 */
export async function allocateManualLegacyId(): Promise<number> {
  for (let i = 0; i < 8; i++) {
    const candidate = -(Date.now() * 1000 + Math.floor(Math.random() * 1000) + i);
    const hit = await prisma.topic.findFirst({
      where: { legacyId: candidate },
      select: { id: true },
    });
    if (!hit) return candidate;
  }
  // احتياطي شبه مستحيل الفشل
  return -(Date.now() * 10000 + Math.floor(Math.random() * 10000));
}

export async function uniqueTopicSlug(baseInput: string): Promise<string> {
  const baseSlug = slugify(baseInput) || "topic";
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.topic.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }
  return slug;
}

export async function ensureUniversity(opts: {
  id?: string | null;
  name?: string | null;
  nameAr?: string | null;
}): Promise<{ id: string; name: string; nameAr: string; slug: string }> {
  if (opts.id && opts.id !== "__new__") {
    const existing = await prisma.university.findUnique({ where: { id: opts.id } });
    if (!existing) throw new Error("جامعة غير موجودة");
    return existing;
  }
  const name = (opts.name ?? "").trim();
  const nameAr = (opts.nameAr ?? name).trim();
  if (!name) throw new Error("يرجى اختيار الجامعة أو إدخال اسم جديد");
  const slugBase = slugify(name) || "university";
  let slug = slugBase;
  let n = 1;
  while (await prisma.university.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${slugBase}-${n}`;
  }
  // إن وُجدت بنفس الاسم اللاتيني نعيدها
  const byName = await prisma.university.findUnique({ where: { name } });
  if (byName) return byName;
  return prisma.university.create({
    data: { name, nameAr: nameAr || name, slug },
  });
}

export async function ensureSpecialty(opts: {
  id?: string | null;
  name?: string | null;
  nameAr?: string | null;
}): Promise<{ id: string; name: string; nameAr: string; slug: string }> {
  if (opts.id && opts.id !== "__new__") {
    const existing = await prisma.specialty.findUnique({ where: { id: opts.id } });
    if (!existing) throw new Error("تخصص غير موجود");
    return existing;
  }
  const name = (opts.name ?? "").trim();
  const nameAr = (opts.nameAr ?? name).trim();
  if (!name) throw new Error("يرجى اختيار التخصص أو إدخال اسم جديد");
  const slugBase = slugify(name) || "specialty";
  let slug = slugBase;
  let n = 1;
  while (await prisma.specialty.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${slugBase}-${n}`;
  }
  const byName = await prisma.specialty.findUnique({ where: { name } });
  if (byName) return byName;
  return prisma.specialty.create({
    data: { name, nameAr: nameAr || name, slug },
  });
}
