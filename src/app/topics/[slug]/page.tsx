import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MathContent } from "@/components/math-content";

export const revalidate = 3600;

const examTypeLabel: Record<string, string> = {
  general: "مسابقة عامة",
  specialty: "مسابقة تخصص",
};

const difficultyLabel: Record<string, string> = {
  easy: "سهل",
  medium: "متوسط",
  hard: "صعب",
};

const difficultyClass: Record<string, string> = {
  easy: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  hard: "bg-red-100 text-red-800",
};

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topic = await prisma.topic.findUnique({
    where: { slug },
    include: { university: true, specialty: true },
  });
  if (!topic || topic.status !== "published") notFound();

  const duration = topic.durationMinutes
    ? `${Math.floor(topic.durationMinutes / 60)}سا${topic.durationMinutes % 60 ? ` ${topic.durationMinutes % 60}د` : ""}`
    : null;

  const chips = [
    `${topic.year}`,
    examTypeLabel[topic.examType] ?? topic.examType,
    topic.specialty.nameAr,
    topic.coefficient != null ? `المعامل: ${topic.coefficient}` : null,
    duration ? `المدة: ${duration}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav className="text-sm text-muted-foreground">
        <Link href="/search" className="hover:text-primary">
          المواضيع
        </Link>
        {" / "}
        <span>{topic.university.nameAr}</span>
        {" / "}
        {topic.year}
      </nav>

      <header className="mt-4">
        <h1 className="text-2xl font-bold leading-relaxed">
          مسابقة دكتوراه {topic.year} — {topic.university.nameAr}
          {topic.examNumber != null &&
            ` — الموضوع ${String(topic.examNumber).padStart(2, "0")}`}
        </h1>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-secondary px-3 py-1 text-secondary-foreground"
            >
              {chip}
            </span>
          ))}
        </div>
        {topic.source && (
          <p
            dir="ltr"
            className="mt-3 rounded-md bg-muted px-3 py-2 text-left text-xs text-muted-foreground"
          >
            {topic.source}
          </p>
        )}
      </header>

      <div className="mt-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
        <strong>تنبيه:</strong> تمت إعادة كتابة هذا الموضوع باستخدام الذكاء
        الاصطناعي، وقد يكون الحل المرفق مولّدًا بالذكاء الاصطناعي. يُنصح
        بالتحقق من صحته قبل الاعتماد عليه، والإبلاغ عن أي خطأ يتم اكتشافه.{" "}
        <Link href="/about#ai-notice" className="font-medium underline">
          التفاصيل
        </Link>
      </div>

      <div className="mt-8 space-y-8">
        {topic.problems.map((p) => (
          <article
            key={p.problemNumber}
            className="rounded-lg border bg-card p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">
                التمرين {p.problemNumber}
              </h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${difficultyClass[p.difficulty] ?? "bg-muted"}`}
              >
                {difficultyLabel[p.difficulty] ?? p.difficulty}
              </span>
            </div>
            <p
              dir="ltr"
              className="mt-1 text-left text-sm font-medium text-muted-foreground"
            >
              {p.title}
            </p>
            {p.tags.length > 0 && (
              <div
                dir="ltr"
                className="mt-2 flex flex-wrap justify-start gap-1.5"
              >
                {p.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4">
              <MathContent content={p.statement} />
            </div>

            {p.remark && (
              <div className="mt-3 rounded-md border-s-4 border-warning bg-muted/60 p-3">
                <MathContent content={p.remark} className="text-sm" />
              </div>
            )}

            {p.hasSolution && p.solution && (
              <details className="mt-4 rounded-lg border bg-muted/40">
                <summary className="cursor-pointer select-none px-4 py-3 font-semibold text-primary">
                  عرض الحل ✅
                </summary>
                <div className="border-t px-4 py-3">
                  <MathContent content={p.solution} />
                </div>
              </details>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topic = await prisma.topic.findUnique({
    where: { slug },
    include: { university: true },
  });
  if (!topic) return { title: "موضوع غير موجود" };
  return {
    title: `مسابقة دكتوراه ${topic.year} — ${topic.university.nameAr}`,
  };
}
