import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { MathContent } from "@/components/math-content";
import { ReportForm } from "@/components/report-form";
import { FavoriteButton } from "@/components/favorite-button";
import { AiNoticeBanner } from "@/components/ai-notice-banner";

export const revalidate = 3600;

const examTypeLabel: Record<string, string> = {
  general: "Ù…Ø³Ø§Ø¨Ù‚Ø© Ø¹Ø§Ù…Ø©",
  specialty: "Ù…Ø³Ø§Ø¨Ù‚Ø© ØªØ®ØµØµ",
};

const difficultyLabel: Record<string, string> = {
  easy: "Ø³Ù‡Ù„",
  medium: "Ù…ØªÙˆØ³Ø·",
  hard: "ØµØ¹Ø¨",
};

const difficultyClass: Record<string, string> = {
  easy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  hard: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [session, topic] = await Promise.all([
    auth(),
    prisma.topic.findUnique({
      where: { slug },
      include: { university: true, specialty: true },
    }),
  ]);
  if (!topic || topic.status !== "published") notFound();

  const userId = session?.user?.id;
  const favorite = userId
    ? await prisma.favorite.findUnique({
        where: { userId_topicId: { userId, topicId: topic.id } },
      })
    : null;

  const duration = topic.durationMinutes
    ? `${Math.floor(topic.durationMinutes / 60)}Ø³Ø§${topic.durationMinutes % 60 ? ` ${topic.durationMinutes % 60}Ø¯` : ""}`
    : null;

  const chips = [
    `${topic.year}`,
    examTypeLabel[topic.examType] ?? topic.examType,
    topic.specialty.nameAr,
    topic.coefficient != null ? `Ø§Ù„Ù…Ø¹Ø§Ù…Ù„: ${topic.coefficient}` : null,
    duration ? `Ø§Ù„Ù…Ø¯Ø©: ${duration}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <AiNoticeBanner />
      <nav className="text-sm text-muted-foreground">
        {topic.university.nameAr}
        {" / "}
        {topic.year}
      </nav>

      <header className="mt-4">
        <h1 className="text-2xl font-bold leading-relaxed">
          Ù…Ø³Ø§Ø¨Ù‚Ø© Ø¯ÙƒØªÙˆØ±Ø§Ù‡ {topic.year} â€” {topic.university.nameAr}
          {topic.examNumber != null &&
            ` â€” Ø§Ù„Ù…ÙˆØ¶ÙˆØ¹ ${String(topic.examNumber).padStart(2, "0")}`}
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
        <div className="mt-4">
          <FavoriteButton
            topicId={topic.id}
            slug={topic.slug}
            initialFavorited={Boolean(favorite)}
            isLoggedIn={Boolean(session?.user)}
          />
        </div>
      </header>

      <div className="mt-8 space-y-8">
        {topic.problems.map((p) => (
          <article
            key={p.problemNumber}
            className="rounded-lg border bg-card p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">
                Ø§Ù„ØªÙ…Ø±ÙŠÙ† {p.problemNumber}
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
                  Ø¹Ø±Ø¶ Ø§Ù„Ø­Ù„ âœ…
                </summary>
                <div className="border-t px-4 py-3">
                  <MathContent content={p.solution} />
                </div>
              </details>
            )}
          </article>
        ))}
      </div>

      <div className="mt-10">
        {session?.user ? (
          <ReportForm topicId={topic.id} />
        ) : (
          <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
            <a href="/signin" className="text-primary hover:underline">
              Ø³Ø¬Ù‘Ù„ Ø§Ù„Ø¯Ø®ÙˆÙ„
            </a>{" "}
            Ù„Ø¥Ø±Ø³Ø§Ù„ Ø¨Ù„Ø§Øº Ø¹Ù† Ø®Ø·Ø£ ÙÙŠ Ù‡Ø°Ø§ Ø§Ù„Ù…ÙˆØ¶ÙˆØ¹.
          </div>
        )}
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
  if (!topic) return { title: "Ù…ÙˆØ¶ÙˆØ¹ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯" };
  return {
    title: `Ù…Ø³Ø§Ø¨Ù‚Ø© Ø¯ÙƒØªÙˆØ±Ø§Ù‡ ${topic.year} â€” ${topic.university.nameAr}`,
  };
}

