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

export const dynamic = "force-dynamic";

const examTypeLabel: Record<string, string> = {
  general: "Ù…Ø³Ø§Ø¨Ù‚Ø© Ø¹Ø§Ù…Ø©",
  specialty: "Ù…Ø³Ø§Ø¨Ù‚Ø© ØªØ®ØµØµ",
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

  // ==== Ø£Ø³Ù‡Ù… Ø§Ù„ØªÙ†Ù‚Ù„: Ø§Ù„Ø³Ø§Ø¨Ù‚/Ø§Ù„ØªØ§Ù„ÙŠ Ø¶Ù…Ù† Ù†ÙØ³ ÙÙ„ØªØ±Ø© ØµÙØ­Ø© Ø§Ù„Ù…ÙˆØ§Ø¶ÙŠØ¹ ====
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

  // Ù†ÙØ³ ØªØ±ØªÙŠØ¨ ØµÙØ­Ø© Ø§Ù„Ù…ÙˆØ§Ø¶ÙŠØ¹ ØªÙ…Ø§Ù…Ù‹Ø§ Ø­ØªÙ‰ ØªØ·Ø§Ø¨Ù‚ Ø§Ù„Ø£Ø³Ù‡Ù… ØªØ³Ù„Ø³Ù„ Ø§Ù„Ù‚Ø§Ø¦Ù…Ø©
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
    ? `${Math.floor(topic.durationMinutes / 60)}Ø³Ø§${topic.durationMinutes % 60 ? ` ${topic.durationMinutes % 60}Ø¯` : ""}`
    : null;

  // Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„Ù…ÙˆØ¶ÙˆØ¹ ÙÙŠ Ø³Ø·Ø± ØµØºÙŠØ± ÙˆØ§Ø­Ø¯ Ø¨Ø¯Ù„ Ø§Ù„Ø´Ø§Ø±Ø§Øª
  const infoLine = [
    examTypeLabel[topic.examType] ?? topic.examType,
    topic.specialty.nameAr,
    topic.coefficient != null ? `Ø§Ù„Ù…Ø¹Ø§Ù…Ù„: ${topic.coefficient}` : null,
    duration ? `Ø§Ù„Ù…Ø¯Ø©: ${duration}` : null,
  ]
    .filter(Boolean)
    .join(" Â· ");

  const downloadHref = `/download?slug=${topic.slug}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <nav className="text-xs text-muted-foreground">
        <Link href={"/search" + qs} className="hover:text-primary">
          Ø§Ù„Ù…ÙˆØ§Ø¶ÙŠØ¹
        </Link>
        {" / "}
        <span>{topic.university.nameAr}</span>
        {" / "}
        {topic.year}
      </nav>

      {/* Ø§Ù„Ø¹Ù†ÙˆØ§Ù† â€” Ø³Ø·Ø± ÙˆØ§Ø­Ø¯ ØµØºÙŠØ± ÙˆØ§Ø¶Ø­ */}
      <header className="mt-3">
        {progress && (
          <p className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 ring-1 ring-emerald-500/30">
            âœ… Ø£Ù†Ù‡ÙŠØª Ø­Ù„ Ù‡Ø°Ø§ Ø§Ù„Ù…ÙˆØ¶ÙˆØ¹
          </p>
        )}
        <h1 className="truncate text-sm font-bold sm:text-base">
          Ù…Ø³Ø§Ø¨Ù‚Ø© Ø¯ÙƒØªÙˆØ±Ø§Ù‡ {topic.year} â€” {topic.university.nameAr}
          {topic.examNumber != null &&
            ` â€” Ø§Ù„Ù…ÙˆØ¶ÙˆØ¹ ${String(topic.examNumber).padStart(2, "0")}`}
        </h1>
        <p className="mt-1 truncate text-[11px] text-muted-foreground">
          {infoLine}
        </p>

        {/* Ø£Ø²Ø±Ø§Ø± ØµØºÙŠØ±Ø©: ØªØ­Ù…ÙŠÙ„ â€” Ø­ÙØ¸ â€” ØªÙ… Ø§Ù„Ø­Ù„ â€” Ù…Ø¤Ù‚Ù‘Øª â€” Ø¥Ø¨Ù„Ø§Øº */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link
            href={downloadHref}
            title="ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…ÙˆØ¶ÙˆØ¹ PDF (Ø¨Ø¯ÙˆÙ† Ø­Ù„ÙˆÙ„)"
            className="inline-flex items-center gap-1 rounded-full border border-primary/40 px-3 py-1 text-xs font-medium text-primary transition hover:bg-primary hover:text-primary-foreground"
          >
            â¬‡ï¸ ØªØ­Ù…ÙŠÙ„
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

        {/* Ø£Ø¯ÙˆØ§Øª Ø§Ù„Ù…Ø¯ÙŠØ± â€” ØªØ¸Ù‡Ø± Ù„Ù„Ù…Ø¯ÙŠØ±ÙŠÙ† ÙÙ‚Ø· */}
        {isAdmin && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Link
              href={"/admin/topics/" + topic.id}
              title="ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„ØªÙ…Ø§Ø±ÙŠÙ† ÙˆØ§Ù„Ø­Ù„ÙˆÙ„ ÙŠØ¯ÙˆÙŠÙ‹Ø§"
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
            >
              âœï¸ ØªØ¹Ø¯ÙŠÙ„
            </Link>
            <TopicAiPolish topicId={topic.id} />
            <ConfirmActionButton
              action={deleteTopicAction.bind(null, topic.id)}
              confirmText="Ø­Ø°Ù Ù‡Ø°Ø§ Ø§Ù„Ù…ÙˆØ¶ÙˆØ¹ Ù†Ù‡Ø§Ø¦ÙŠÙ‹Ø§ Ù…Ø¹ Ù…Ù„ÙØ§ØªÙ‡ØŸ"
              label="ðŸ—‘ Ø­Ø°Ù"
              pendingLabel="Ø¬Ø§Ø±Ù Ø§Ù„Ø­Ø°Ùâ€¦"
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

      {/* ØªÙ†Ø¨ÙŠÙ‡ Ù‚Ø§Ø¨Ù„ Ù„Ù„Ø¥ØºÙ„Ø§Ù‚ â€” Ù„Ø§ ÙŠØ¹ÙˆØ¯ Ø¥Ù„Ø§ Ø¨Ø¹Ø¯ ÙŠÙˆÙ… */}
      <TopicAiNotice />

      {/* Ø§Ù„ØªÙ…Ø§Ø±ÙŠÙ† â€” Ø¨Ø¯ÙˆÙ† ØµÙ†Ø§Ø¯ÙŠÙ‚ØŒ Ø¨ÙÙˆØ§ØµÙ„ Ø£Ù†ÙŠÙ‚Ø© */}
      <div className="mt-4 divide-y">
        {topic.problems.map((p) => (
          <article key={p.problemNumber} className="py-5">
            <div className="flex items-center gap-3">
              <h2 className="shrink-0 text-sm font-bold">
                Ø§Ù„ØªÙ…Ø±ÙŠÙ† {p.problemNumber}
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
                    â—€
                  </span>
                  Ø§Ù„Ø­Ù„
                </summary>
                <div className="mt-2 border-s-2 border-primary/30 ps-3">
                  <MathContent content={p.solution} />
                </div>
              </details>
            )}
                      <SuggestSolution topicId={topic.id} problemNumber={p.problemNumber} hasSolution={Boolean((p as any).solution)} />
          </article>
        ))}
      </div>

      {/* Ø£Ø³Ù‡Ù… Ø§Ù„ØªÙ†Ù‚Ù„ â€” Ø¬Ø§Ù†Ø¨ÙŠØ© ÙÙŠ Ø§Ù„Ø­Ø§Ø³ÙˆØ¨ØŒ Ø£Ø³ÙÙ„ Ø§Ù„Ù…ÙˆØ¶ÙˆØ¹ ÙÙŠ Ø§Ù„Ù‡Ø§ØªÙ */}
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
  if (!topic) return { title: "Ù…ÙˆØ¶ÙˆØ¹ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯" };
  const pageTitle = `Ù…Ø³Ø§Ø¨Ù‚Ø© Ø¯ÙƒØªÙˆØ±Ø§Ù‡ ${topic.year} â€” ${topic.university.nameAr}`;
  const pageDescription = `Ù…ÙˆØ¶ÙˆØ¹ Ù…Ø³Ø§Ø¨Ù‚Ø© Ø§Ù„Ø§Ù„ØªØ­Ø§Ù‚ Ø¨Ø§Ù„Ø¯ÙƒØªÙˆØ±Ø§Ù‡ ÙÙŠ Ø§Ù„Ø±ÙŠØ§Ø¶ÙŠØ§Øª â€” ${topic.university.nameAr} â€” Ø¯ÙˆØ±Ø© ${topic.year}ØŒ Ù†Øµ Ø§Ù„ØªÙ…Ø§Ø±ÙŠÙ† ÙƒØ§Ù…Ù„Ù‹Ø§ Ø¨Ø¹Ø±Ø¶ Ø±ÙŠØ§Ø¶ÙŠ ÙˆØ§Ø¶Ø­ Ø¹Ù„Ù‰ DocMath DZ.`;
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

