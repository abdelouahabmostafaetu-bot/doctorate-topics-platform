import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArticleContent } from "@/components/article-content";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await prisma.article.findUnique({
    where: { slug, published: true },
    select: { titleAr: true, summary: true },
  });
  if (!article) return {};
  return {
    title: `${article.titleAr} | زاد الباحث`,
    description: article.summary ?? undefined,
  };
}

function readTime(content: string) {
  return Math.max(1, Math.ceil(content.trim().split(/\s+/).length / 200));
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (slug === "ali-maths-special-functions-common-exam-edge") {
    redirect(`/guide/success-stories/${slug}`);
  }

  const [article, allArticles] = await Promise.all([
    prisma.article.findUnique({ where: { slug, published: true } }),
    prisma.article.findMany({
      where: { published: true },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: { slug: true, titleAr: true },
    }),
  ]);

  if (!article) notFound();
  const index = allArticles.findIndex((item) => item.slug === slug);
  const previous = index > 0 ? allArticles[index - 1] : null;
  const next = index < allArticles.length - 1 ? allArticles[index + 1] : null;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-background" dir="rtl">
      <div className="border-b border-slate-200 bg-white dark:border-border dark:bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3 sm:px-8 sm:py-4">
          <Link
            href="/guide"
            className="text-xs font-medium text-muted-foreground transition hover:text-primary sm:text-sm"
          >
            ← العودة إلى زاد الباحث
          </Link>
          <Image
            src="/icon.png"
            alt="DocMath DZ"
            width={30}
            height={30}
            className="h-7 w-7 object-contain sm:h-8 sm:w-8"
          />
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-16">
        <header className="border-b border-slate-200 pb-7 dark:border-border sm:pb-9">
          <p className="text-[11px] font-bold tracking-[0.14em] text-primary sm:text-xs">
            زاد الباحث
          </p>
          <h1 className="mt-3 max-w-3xl text-2xl font-bold leading-tight text-slate-900 dark:text-foreground sm:mt-4 sm:text-4xl md:text-5xl">
            {article.titleAr}
          </h1>
          {article.summary && (
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 dark:text-muted-foreground sm:mt-6 sm:text-lg">
              {article.summary}
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground sm:mt-7 sm:gap-3 sm:text-sm">
            <span>
              {article.createdAt.toLocaleDateString("ar-DZ", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>{readTime(article.content)} دقائق للقراءة</span>
          </div>
        </header>

        <article className="mt-6 sm:mt-8">
          <ArticleContent content={article.content} />
        </article>

        {(next || previous) && (
          <nav className="mt-7 grid gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-4">
            {next ? (
              <Link
                href={`/guide/${next.slug}`}
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-primary/40 hover:shadow-sm dark:border-border dark:bg-card sm:p-5"
              >
                <span className="text-[11px] text-muted-foreground sm:text-xs">
                  المقال التالي ←
                </span>
                <span className="mt-1.5 block text-sm font-bold leading-7 text-primary sm:mt-2">
                  {next.titleAr}
                </span>
              </Link>
            ) : (
              <div />
            )}
            {previous ? (
              <Link
                href={`/guide/${previous.slug}`}
                className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-primary/40 hover:shadow-sm dark:border-border dark:bg-card sm:p-5"
              >
                <span className="text-[11px] text-muted-foreground sm:text-xs">
                  → المقال السابق
                </span>
                <span className="mt-1.5 block text-sm font-bold leading-7 text-primary sm:mt-2">
                  {previous.titleAr}
                </span>
              </Link>
            ) : (
              <div />
            )}
          </nav>
        )}
      </main>
    </div>
  );
}
