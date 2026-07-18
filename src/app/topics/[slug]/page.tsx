import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { MathContent } from "@/components/math-content";
import { FavoriteButton } from "@/components/favorite-button";
import { ReportButton } from "@/components/report-button";
import { TopicAiNotice } from "@/components/topics/topic-ai-notice";
import { SolvedButton } from "@/components/topics/solved-button";
import { SolveTimer } from "@/components/topics/solve-timer";
import { TopicNav, type TopicNavLink } from "@/components/topics/topic-nav";
import { TopicAiPolish } from "@/components/topics/topic-ai-polish";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { deleteTopicAction } from "@/app/admin/topics/actions";
import SuggestSolution from "@/components/SuggestSolution";
import { ReadingMode } from "@/components/topics/reading-mode";

export const dynamic = "force-dynamic";

const examTypeLabel: Record<string, string> = {
  general: "مسابقة عامة",
  specialty: "مسابقة تخصص",
};

type TopicSearchParams = {
  university?: string;
  specialty?: string;
  year?: string;
  reading?: string;
};

export default async function TopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<TopicSearchParams>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const topic = await prisma.topic.findUnique({
    where: { slug },
    include: { university: true, specialty: true },
  });
  if (!topic || topic.status !== "published") notFound();

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const role = session?.user?.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  const [favorite, progress] = userId
    ? await Promise.all([
        prisma.favorite.findUnique({
          where: { userId_topicId: { userId, topicId: topic.id } },
        }),
        prisma.topicProgress.findUnique({
          where: { userId_topicId: { userId, topicId: topic.id } },
        }),
      ])
    : [null, null];

  // ==== أسهم التنقل: السابق/التالي ضمن نفس فلترة صفحة المواضيع ====
  const match: Record<string, Prisma.InputJsonValue> = { status: "published" };
  if (sp.year && /^\d{4}$/.test(sp.year)) match.year = parseInt(sp.year, 10);
  if (sp.university) {
    const uni = await prisma.university.findFirst({
      where: { slug: sp.university },
    });
    if (uni) match.universityId = { $oid: uni.id };
  }
  if (sp.specialty) {
    const spec = await prisma.specialty.findFirst({
      where: { slug: sp.specialty },
    });
    if (spec) match.specialtyId = { $oid: spec.id };
  }

  // نفس ترتيب صفحة المواضيع تمامًا حتى تطابق الأسهم تسلسل القائمة
  const ordered = (await prisma.topic.aggregateRaw({
    pipeline: [
      { $match: match },
      { $sort: { year: -1, examNumber: 1 } },
      { $project: { slug: 1, title: 1 } },
    ] as Prisma.InputJsonValue[],
  })) as unknown as Array<{ slug: string; title: string }>;

  const navParams = new URLSearchParams();
  if (sp.university) navParams.set("university", sp.university);
  if (sp.specialty) navParams.set("specialty", sp.specialty);
  if (sp.year) navParams.set("year", sp.year);
  const qs = navParams.toString() ? "?" + navParams.toString() : "";

  const idx = ordered.findIndex((t) => t.slug === topic.slug);
  const prevTopic = idx > 0 ? ordered[idx - 1] : null;
  const nextTopic =
    idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null;
  const prev: TopicNavLink = prevTopic
    ? { href: "/topics/" + prevTopic.slug + qs, label: prevTopic.title }
    : null;
  const next: TopicNavLink = nextTopic
    ? { href: "/topics/" + nextTopic.slug + qs, label: nextTopic.title }
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

  // ==== بيانات وضع القراءة ====
  const readingTitle = `مسابقة دكتوراه ${topic.year} — ${topic.university.nameAr}${
    topic.examNumber != null
      ? ` — الموضوع ${String(topic.examNumber).padStart(2, "0")}`
      : ""
  }`;
  const readingProblems = [...topic.problems]
    .sort((a, b) => a.problemNumber - b.problemNumber)
    .map((p) => ({
      problemNumber: p.problemNumber,
      title: p.title || null,
      tags: p.tags,
      statement: p.statement,
      solution: p.solution ?? null,
      remark: p.remark ?? null,
      hasSolution: Boolean(p.hasSolution && p.solution),
    }));

  const downloadHref = `/download?slug=${topic.slug}`;

  // ==== بيانات منظمة (JSON-LD) لمحركات البحث — تحسين الظهور ====
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: `مسابقة دكتوراه ${topic.year} — ${topic.university.nameAr}`,
    description: `موضوع مسابقة الالتحاق بالدكتوراه في الرياضيات — ${topic.university.nameAr} — دورة ${topic.year}.`,
    url: "https://www.docmathdz.dev/topics/" + topic.slug,
    inLanguage: "fr",
    isAccessibleForFree: true,
    educationalLevel: "دكتوراه",
    learningResourceType: "موضوع مسابقة",
    about: topic.specialty.nameAr,
    dateModified: topic.updatedAt.toISOString(),
    provider: {
      "@type": "Organization",
      name: "DocMath DZ",
      url: "https://www.docmathdz.dev",
    },
  };

  // ==== مواضيع مشابهة (نفس المحاور) — تساعد على المراجعة المتسلسلة لنفس المحور ====
  const allTags = Array.from(new Set(topic.problems.flatMap((p) => p.tags)));
  let related: Array<{
    slug: string;
    year: number;
    examNumber: number | null;
    universityName: string;
    shared: number;
  }> = [];
  if (allTags.length > 0) {
    try {
      const rawRelated = (await prisma.topic.aggregateRaw({
        pipeline: [
          {
            $match: {
              status: "published",
              slug: { $ne: topic.slug },
              "problems.tags": { $in: allTags },
            },
          },
          {
            $project: {
              slug: 1,
              year: 1,
              examNumber: 1,
              universityId: 1,
              shared: {
                $size: {
                  $setIntersection: [
                    allTags,
                    {
                      $reduce: {
                        input: "$problems",
                        initialValue: [],
                        in: { $setUnion: ["$$value", "$$this.tags"] },
                      },
                    },
                  ],
                },
              },
            },
          },
          { $sort: { shared: -1, year: -1 } },
          { $limit: 3 },
        ] as Prisma.InputJsonValue[],
      })) as unknown as Array<{
        slug: string;
        year: number;
        examNumber: number | null;
        universityId: { $oid: string };
        shared: number;
      }>;
      if (rawRelated.length) {
        const unis = await prisma.university.findMany({
          where: { id: { in: rawRelated.map((r) => r.universityId.$oid) } },
        });
        related = rawRelated.map((r) => ({
          slug: r.slug,
          year: r.year,
          examNumber: r.examNumber ?? null,
          shared: r.shared,
          universityName:
            unis.find((u) => u.id === r.universityId.$oid)?.nameAr ?? "—",
        }));
      }
    } catch {
      related = [];
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <nav className="text-xs text-muted-foreground">
        <Link href={"/search" + qs} className="hover:text-primary">
          المواضيع
        </Link>
        {" / "}
        <span>{topic.university.nameAr}</span>
        {" / "}
        {topic.year}
      </nav>

      {/* العنوان — سطر واحد صغير واضح */}
      <header className="mt-3">
        {progress && (
          <p className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 ring-1 ring-emerald-500/30">
            ✅ أنهيت حل هذا الموضوع
          </p>
        )}
        <h1 className="truncate text-sm font-bold sm:text-base">
          مسابقة دكتوراه {topic.year} — {topic.university.nameAr}
          {topic.examNumber != null &&
            ` — الموضوع ${String(topic.examNumber).padStart(2, "0")}`}
        </h1>
        <p className="mt-1 truncate text-[11px] text-muted-foreground">
          {infoLine}
        </p>

        {/* أزرار صغيرة: تحميل — حفظ — تم الحل — مؤقّت — إبلاغ */}
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
          <SolvedButton
            topicId={topic.id}
            slug={topic.slug}
            initialDone={Boolean(progress)}
            isLoggedIn={Boolean(userId)}
          />
          <SolveTimer />
          <ReadingMode
            topicTitle={readingTitle}
            infoLine={infoLine}
            problems={readingProblems}
            durationMinutes={topic.durationMinutes ?? null}
            prevHref={prev?.href ?? null}
            prevLabel={prev?.label ?? null}
            nextHref={next?.href ?? null}
            nextLabel={next?.label ?? null}
            autoOpen={sp.reading === "1"}
          />
          <ReportButton topicId={topic.id} />
        </div>

        {/* أدوات المدير — تظهر للمديرين فقط */}
        {isAdmin && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Link
              href={"/admin/topics/" + topic.id}
              title="تعديل التمارين والحلول يدويًا"
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
            >
              ✏️ تعديل
            </Link>
            <TopicAiPolish topicId={topic.id} />
            <ConfirmActionButton
              action={deleteTopicAction.bind(null, topic.id)}
              confirmText="حذف هذا الموضوع نهائيًا مع ملفاته؟"
              label="🗑 حذف"
              pendingLabel="جارٍ الحذف…"
              redirectTo={"/search" + qs}
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs text-muted-foreground transition hover:border-destructive hover:text-destructive disabled:opacity-50"
            />
          </div>
        )}

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
              <div
                dir="ltr"
                className="mt-1.5 flex flex-wrap justify-start gap-x-2 gap-y-0.5"
              >
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
                <MathContent content={p.remark} />
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
            <SuggestSolution
              topicId={topic.id}
              problemNumber={p.problemNumber}
              hasSolution={Boolean((p as any).solution)}
            />
          </article>
        ))}
      </div>

      {/* أسهم التنقل — جانبية في الحاسوب، أسفل الموضوع في الهاتف */}
      {/* مواضيع مشابهة — نفس المحاور للمراجعة المتسلسلة */}
      {related.length > 0 && (
        <section className="mt-8 border-t pt-5">
          <h2 className="text-sm font-bold">📎 مواضيع مشابهة لنفس المحاور</h2>
          <div className="mt-1 divide-y">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={"/topics/" + r.slug}
                className="group flex items-center gap-3 py-2.5"
              >
                <span className="w-11 shrink-0 text-center text-xs font-bold text-primary">
                  {r.year}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium transition group-hover:text-primary">
                    {r.universityName}
                    {r.examNumber != null &&
                      " — الموضوع " + String(r.examNumber).padStart(2, "0")}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {r.shared} {r.shared === 1 ? "محور مشترك" : "محاور مشتركة"}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground transition group-hover:-translate-x-0.5 group-hover:text-primary">
                  ←
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* بيانات منظمة لمحركات البحث */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <TopicNav prev={prev} next={next} />
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
  const pageTitle = `مسابقة دكتوراه ${topic.year} — ${topic.university.nameAr}`;
  const pageDescription = `موضوع مسابقة الالتحاق بالدكتوراه في الرياضيات — ${topic.university.nameAr} — دورة ${topic.year}، نص التمارين كاملًا بعرض رياضي واضح على DocMath DZ.`;
  return {
    title: pageTitle,
    description: pageDescription,
    alternates: { canonical: `https://www.docmathdz.dev/topics/${topic.slug}` },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      type: "article",
      url: `https://www.docmathdz.dev/topics/${topic.slug}`,
    },
  };
}
