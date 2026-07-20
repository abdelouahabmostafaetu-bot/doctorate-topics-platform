import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StoryFeedback } from "@/components/success-stories/story-feedback";

export const dynamic = "force-dynamic";

export default async function SuccessStoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const story = await prisma.successStory.findFirst({
    where: { slug, published: true },
    include: { _count: { select: { likes: true } } },
  });
  if (!story) notFound();
  return (
    <main
      className="min-h-screen bg-[#f8fafc] px-5 py-8 dark:bg-background sm:px-8 sm:py-14"
      dir="rtl"
    >
      <article className="mx-auto max-w-3xl">
        <Link
          href="/guide/success-stories"
          className="text-xs text-muted-foreground transition hover:text-primary"
        >
          ← كل قصص النجاح
        </Link>
        <header className="mt-5 border-b border-slate-200 pb-6 dark:border-border">
          <p className="text-[10px] font-bold tracking-[0.16em] text-amber-700 dark:text-amber-300">
            ✦ من الطريق إلى الدكتوراه
          </p>
          <h1 className="mt-3 text-2xl font-bold leading-relaxed sm:text-3xl">
            {story.title}
          </h1>
          <p className="mt-3 text-sm leading-8 text-muted-foreground">
            {story.excerpt}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            {story.name}
            {story.university ? ` · ${story.university}` : ""}
            {story.year ? ` · ${story.year}` : ""}
          </p>
        </header>
        <section className="mt-7 whitespace-pre-line text-[15px] leading-9 text-slate-800 dark:text-slate-100">
          {story.story}
        </section>
        <section className="mt-8 rounded-2xl border-r-4 border-amber-400 bg-amber-50 px-5 py-5 dark:bg-amber-950/20">
          <p className="text-[10px] font-bold tracking-wider text-amber-700 dark:text-amber-300">
            النصيحة الذهبية
          </p>
          <p className="mt-2 text-sm leading-8 text-amber-950 dark:text-amber-50">
            {story.advice}
          </p>
        </section>
        <StoryFeedback
          slug={story.slug}
          initialLikes={story._count.likes}
          initialViews={story.viewCount}
        />
        <div className="mt-8 text-center">
          <Link
            href="/guide/success-stories/submit"
            className="inline-flex rounded-full border border-primary/40 px-5 py-2.5 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground"
          >
            شاركنا تجربتك
          </Link>
        </div>
      </article>
    </main>
  );
}
