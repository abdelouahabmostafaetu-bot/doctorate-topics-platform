import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "قصص من الطريق إلى الدكتوراه | زاد الباحث" };

export default async function SuccessStoriesPublicPage() {
  const stories = await prisma.successStory.findMany({
    where: { published: true },
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { likes: true } } },
  });

  return (
    <main className="min-h-screen px-5 py-7 sm:px-8 sm:py-10" dir="rtl">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/guide"
          className="text-[11px] text-muted-foreground transition hover:text-primary"
        >
          ← العودة إلى زاد الباحث
        </Link>
        <header className="mt-5 border-b border-slate-200 pb-5 dark:border-border">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground">
                من الطريق إلى الدكتوراه
              </p>
              <h1 className="mt-1 text-xl font-bold sm:text-2xl">
                قصص تستحق أن تُروى
              </h1>
              <p className="mt-2 max-w-2xl text-[11px] leading-6 text-muted-foreground sm:text-xs">
                تجارب واقعية يشاركها ناجحون؛ فيها صعوبة الطريق، ما تعلّموه منه،
                وكلمات قد تفيد من يسير فيه اليوم.
              </p>
            </div>
            <Link
              href="/guide/success-stories/submit"
              className="shrink-0 rounded-full border border-primary/40 px-4 py-2 text-[11px] font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
            >
              شاركنا تجربتك
            </Link>
          </div>
        </header>

        {stories.length > 0 ? (
          <section className="mt-2 divide-y divide-slate-200 dark:divide-border">
            {stories.map((story, index) => (
              <Link
                key={story.id}
                href={`/guide/success-stories/${story.slug}`}
                className="group flex gap-3 py-5 transition hover:bg-muted/20 sm:gap-5 sm:py-6"
              >
                <span className="w-6 shrink-0 pt-0.5 text-xs font-bold text-muted-foreground/60 sm:w-8">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <article className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
                    <span>{story.name || "باحث/ة ناجح/ة"}</span>
                    {story.university && <span>· {story.university}</span>}
                    {story.year && <span>· {story.year}</span>}
                    <span>· {story.viewCount} قراءة</span>
                  </div>
                  <h2 className="mt-1 text-sm font-bold leading-6 transition group-hover:text-primary sm:text-base sm:leading-7">
                    {story.title}
                  </h2>
                  <p className="mt-1 max-w-2xl text-[11px] leading-6 text-muted-foreground sm:text-xs">
                    {story.excerpt}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-[10px]">
                    <span className="font-semibold text-primary">
                      اقرأ التجربة ←
                    </span>
                    <span className="text-muted-foreground">
                      ♡ {story._count.likes}
                    </span>
                  </div>
                </article>
              </Link>
            ))}
          </section>
        ) : (
          <p className="py-14 text-center text-xs text-muted-foreground">
            ستظهر أول تجربة نجاح هنا قريبًا.
          </p>
        )}
      </div>
    </main>
  );
}
