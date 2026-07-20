import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "زاد الباحث | DocMath DZ",
  description:
    "مجلة DocMath DZ لنصائح المراجعة والاستعداد لمسابقة الدكتوراه في الرياضيات.",
};

function readTime(content: string) {
  return Math.max(1, Math.ceil(content.trim().split(/\s+/).length / 200));
}

function formattedDate(date: Date) {
  return date.toLocaleDateString("ar-DZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function articleNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}

const ARTICLES_PER_PAGE = 20;

type GuidePageProps = {
  searchParams: Promise<{ page?: string | string[] }>;
};

export default async function GuidePage({ searchParams }: GuidePageProps) {
  const params = await searchParams;
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const requestedPage = Math.max(1, Number.parseInt(rawPage ?? "1", 10) || 1);

  const [articleCount, successStories] = await Promise.all([
    prisma.article.count({
      where: { published: true, position: { gt: 0 } },
    }),
    prisma.successStory.findMany({
      where: { published: true },
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      take: 1,
      include: { _count: { select: { likes: true } } },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(articleCount / ARTICLES_PER_PAGE));
  const currentPage = Math.min(requestedPage, totalPages);
  const articles = await prisma.article.findMany({
    // المقال الافتتاحي له position: 0؛ هذه الصفحة تعرض مقالات زاد الباحث فقط.
    where: { published: true, position: { gt: 0 } },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    skip: (currentPage - 1) * ARTICLES_PER_PAGE,
    take: ARTICLES_PER_PAGE,
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-background" dir="rtl">
      <section className="overflow-hidden bg-[#102a43] text-white">
        <div className="mx-auto max-w-6xl px-5 py-7 sm:px-8 sm:py-10">
          <div className="flex max-w-2xl items-center gap-2.5">
            <Image
              src="/icon.png"
              alt="DocMath DZ"
              width={38}
              height={38}
              className="h-7 w-7 rounded-md bg-white/10 object-contain sm:h-8 sm:w-8"
              priority
            />
            <div>
              <p className="text-[8px] font-semibold tracking-[0.15em] text-sky-200 sm:text-[9px]">
                DOCMATH DZ · مجلة تعليمية
              </p>
              <h1 className="mt-0.5 text-2xl font-bold leading-tight sm:text-3xl">
                زاد الباحث
              </h1>
            </div>
          </div>
          <p className="mt-3 max-w-xl text-[11px] leading-6 text-slate-300 sm:mt-4 sm:text-xs sm:leading-6">
            نصائح عملية وخطط مراجعة تساعدك على الاستعداد لمسابقة الدكتوراه في
            الرياضيات.
          </p>

          <blockquote className="mt-4 max-w-2xl border-r border-amber-300/70 pr-3 text-[9px] leading-5 text-amber-100/90 sm:mt-5 sm:pr-4 sm:text-[10px] sm:leading-6">
            <p className="font-medium text-amber-200">
              ﴿وَأَنْ لَيْسَ لِلْإِنْسَانِ إِلَّا مَا سَعَىٰ ۝ وَأَنَّ سَعْيَهُ
              سَوْفَ يُرَىٰ ۝ ثُمَّ يُجْزَاهُ الْجَزَاءَ الْأَوْفَىٰ﴾
            </p>
            <cite className="mt-0.5 block not-italic text-amber-300/80">
              سورة النجم · 39–41
            </cite>
            <p className="mt-1 text-amber-100/75">
              كل ساعة تقضيها في المراجعة محفوظة عند الله، ولن يضيع سعيك.
            </p>
          </blockquote>

          <div className="mt-4 flex items-center gap-3 text-[10px] text-slate-300 sm:mt-6 sm:text-[11px]">
            <span className="h-px w-7 bg-sky-300/70 sm:w-10" />
            <span>
              {articleCount}{" "}
              {articleCount === 1 ? "مقال منشور" : "مقالات منشورة"}
            </span>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-5 py-7 sm:px-8 sm:py-14">
        {successStories.length > 0 && (
          <section className="mb-8 sm:mb-10">
            {successStories.map((story) => (
              <article
                key={story.id}
                className="border-r-2 border-primary bg-card/40 py-3 pr-4 sm:border-r-4 sm:py-4 sm:pr-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[9px] font-semibold tracking-[0.14em] text-muted-foreground sm:text-[10px]">
                    ✦ تجربة مختارة من الطريق إلى الدكتوراه
                  </p>
                  <span className="text-[9px] text-muted-foreground sm:text-[10px]">
                    {story.viewCount} قراءة · {story._count.likes} إعجاب
                  </span>
                </div>
                <h2 className="mt-1.5 text-sm font-bold leading-6 sm:text-base">
                  {story.title}
                </h2>
                <p className="mt-1 line-clamp-2 max-w-3xl text-[11px] leading-5 text-muted-foreground sm:text-xs sm:leading-6">
                  {story.excerpt}
                </p>
                <div className="mt-2 flex items-center gap-4 text-[10px] sm:text-[11px]">
                  <Link
                    href={`/guide/success-stories/${story.slug}`}
                    className="font-semibold text-primary transition hover:underline"
                  >
                    اقرأ التجربة ←
                  </Link>
                  <Link
                    href="/guide/success-stories"
                    className="text-muted-foreground transition hover:text-primary"
                  >
                    كل القصص
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}

        {articles.length > 0 ? (
          <section>
            <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-border sm:mb-5 sm:pb-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-foreground sm:text-base">
                المقالات
              </h2>
              <span className="text-[10px] text-muted-foreground sm:text-[11px]">
                اقرأ بهدوء، خطوة بعد خطوة
              </span>
            </div>

            {/* جميع المقالات بالأسلوب التحريري البسيط نفسه، بلا بطاقات أو صناديق. */}
            <div className="border-t border-slate-200 dark:border-border">
              {articles.map((article, index) => (
                <Link
                  key={article.id}
                  href={`/guide/${article.slug}`}
                  className="group block border-b border-slate-200 py-5 transition hover:bg-slate-100/70 dark:border-border dark:hover:bg-muted/25 sm:py-6"
                >
                  <div className="flex items-start gap-3 px-1 sm:gap-5 sm:px-2">
                    <span className="mt-0.5 w-7 shrink-0 font-serif text-lg font-bold text-primary/55 sm:w-9 sm:text-xl">
                      {articleNumber(
                        (currentPage - 1) * ARTICLES_PER_PAGE + index,
                      )}
                    </span>

                    <div className="min-w-0 flex-1 text-right">
                      <div className="flex flex-wrap items-center gap-2 text-[9px] text-muted-foreground sm:text-[10px]">
                        <span>{formattedDate(article.createdAt)}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                        <span>{readTime(article.content)} دقائق للقراءة</span>
                      </div>

                      <h3 className="mt-2 text-[15px] font-bold leading-7 text-slate-900 transition group-hover:text-primary dark:text-foreground sm:text-base sm:leading-7">
                        {article.titleAr}
                      </h3>

                      {article.summary && (
                        <p className="mt-1.5 max-w-3xl text-[12px] leading-6 text-slate-600 dark:text-muted-foreground sm:text-[13px]">
                          {article.summary}
                        </p>
                      )}

                      <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary sm:text-xs">
                        اقرأ المقال
                        <span className="transition group-hover:-translate-x-1">
                          ←
                        </span>
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <nav
                aria-label="صفحات المقالات"
                className="mt-7 flex flex-wrap items-center justify-center gap-1.5 sm:mt-9"
              >
                {currentPage > 1 && (
                  <Link
                    href={`/guide?page=${currentPage - 1}`}
                    className="px-3 py-2 text-[11px] font-semibold text-muted-foreground transition hover:text-primary sm:text-xs"
                  >
                    السابق
                  </Link>
                )}

                {Array.from(
                  { length: totalPages },
                  (_, index) => index + 1,
                ).map((page) => (
                  <Link
                    key={page}
                    href={`/guide?page=${page}`}
                    aria-current={page === currentPage ? "page" : undefined}
                    className={`inline-flex h-8 min-w-8 items-center justify-center rounded-sm px-2 text-[11px] font-semibold transition sm:h-9 sm:min-w-9 sm:text-xs ${
                      page === currentPage
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-slate-200 hover:text-foreground dark:hover:bg-muted"
                    }`}
                  >
                    {page}
                  </Link>
                ))}

                {currentPage < totalPages && (
                  <Link
                    href={`/guide?page=${currentPage + 1}`}
                    className="px-3 py-2 text-[11px] font-semibold text-muted-foreground transition hover:text-primary sm:text-xs"
                  >
                    التالي
                  </Link>
                )}
              </nav>
            )}
          </section>
        ) : (
          <div className="border-y border-dashed px-6 py-16 text-center sm:py-20">
            <p className="text-base font-semibold">المقالات قيد الإعداد</p>
            <p className="mt-2 text-sm text-muted-foreground">
              ستجد هنا قريبًا نصائح مفيدة للتحضير والمراجعة.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
