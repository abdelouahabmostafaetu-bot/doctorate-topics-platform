import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { MathContent } from "@/components/math-content";
import { FavoriteButton } from "@/components/favorite-button";
import { ReportButton } from "@/components/report-button";
import { TopicAiNotice } from "@/components/topics/topic-ai-notice";

export const dynamic = "force-dynamic";

const examTypeLabel: Record<string, string> = {
  general: "مسابقة عامة",
  specialty: "مسابقة تخصص",
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

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const favorite = userId
    ? await prisma.favorite.findUnique({
        where: { userId_topicId: { userId, topicId: topic.id } },
      })
    : null;

  const duration = topic.durationMinutes
    ? `${Math.floor(topic.durationMinutes / 60)}سا${topic.durationMinutes % 60 ? ` ${topic.durationMinutes % 60}د` : ""}`
    : null;

  // معلومات الموضوع في سطر صغير واحد بدل الشارات
  const infoLine = [
    examTypeLabel[topic.examType] ?? topic.examType,
    topic.specialty.nameAr,
    topic.coefficient != null ? `المعامل: ${topic.coefficient}` : null,
    duration ? `المدة: ${duration}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const downloadHref = `/download?slug=${topic.slug}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <nav className="text-xs text-muted-foreground">
        <Link href="/search" className="hover:text-primary">
          المواضيع
        </Link>
        {" / "}
        <span>{topic.university.nameAr}</span>
        {" / "}
        {topic.year}
      </nav>

      {/* العنوان — سطر واحد صغير واضح */}
      <header className="mt-3">
        <h1 className="truncate text-sm font-bold sm:text-base">
          مسابقة دكتوراه {topic.year} — {topic.university.nameAr}
          {topic.examNumber != null &&
            ` — الموضوع ${String(topic.examNumber).padStart(2, "0")}`}
        </h1>
        <p className="mt-1 truncate text-[11px] text-muted-foreground">
          {infoLine}
        </p>

        {/* أزرار صغيرة: تحميل — حفظ — إبلاغ */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link
            href={downloadHref}
            title="تحميل الموضوع PDF (بدون حلول)"
            className="inline-flex items-center gap-1 rounded-full border border-primary/40 px-3 py-1 text-xs font-medium text-primary transition hover:bg-primary hover:text-primary-foreground"
          >
            ⬇️ تحميل
          </Link>
          <FavoriteButton
            topicId={topic.id}
            slug={topic.slug}
            initialFavorited={Boolean(favorite)}
            isLoggedIn={Boolean(userId)}
          />
          <ReportButton topicId={topic.id} />
        </div>

        {topic.source && (
          <p
            dir="ltr"
            className="mt-2 truncate text-left text-[10px] text-muted-foreground"
          >
            {topic.source}
          </p>
        )}
      </header>

      {/* تنبيه قابل للإغلاق — لا يعود إلا بعد يوم */}
      <TopicAiNotice />

      {/* التمارين — بدون صناديق، بفواصل أنيقة */}
      <div className="mt-4 divide-y">
        {topic.problems.map((p) => (
          <article key={p.problemNumber} className="py-5">
            <div className="flex items-center gap-3">
              <h2 className="shrink-0 text-sm font-bold">
                التمرين {p.problemNumber}
              </h2>
              <span className="h-px flex-1 bg-gradient-to-l from-border to-transparent" />
              <ReportButton
                topicId={topic.id}
                problemNumber={p.problemNumber}
                compact
              />
            </div>

            {p.title && (
              <p
                dir="ltr"
                className="mt-1 text-left text-xs font-medium text-muted-foreground"
              >
                {p.title}
              </p>
            )}

            {p.tags.length > 0 && (
              <div dir="ltr" className="mt-1.5 flex flex-wrap justify-start gap-x-2 gap-y-0.5">
                {p.tags.map((tag) => (
                  <span key={tag} className="text-[10px] text-muted-foreground">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-3">
              <MathContent content={p.statement} />
            </div>

            {p.remark && (
              <div className="mt-3 border-s-2 border-amber-400 ps-3">
                <MathContent content={p.remark} className="text-sm" />
              </div>
            )}

            {p.hasSolution && p.solution && (
              <details className="group mt-3">
                <summary className="inline-flex cursor-pointer select-none items-center gap-1 text-sm font-semibold text-primary [&::-webkit-details-marker]:hidden">
                  <span className="text-[10px] transition-transform group-open:rotate-90">
                    ◀
                  </span>
                  الحل
                </summary>
                <div className="mt-2 border-s-2 border-primary/30 ps-3">
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
