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

export const dynamic = "force-dynamic";

const examTypeLabel: Record<string, string> = {
  general: "مسابقة عامة",
  specialty: "مسابقة تخصص",
};

type TopicSearchParams = {
  university?: string;
  specialty?: string;
  year?: string;
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

  const downloadHref = `/download?slug=${topic.slug}`;

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
          </article>
        ))}
      </div>

      {/* أسهم التنقل — جانبية في الحاسوب، أسفل الموضوع في الهاتف */}
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
  return {
    title: `مسابقة دكتوراه ${topic.year} — ${topic.university.nameAr}`,
  };
}
