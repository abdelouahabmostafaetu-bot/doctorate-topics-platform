import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { deleteSuccessStoryAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function SuccessStoriesPage() {
  const stories = await prisma.successStory.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold">✨ من الطريق إلى الدكتوراه</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            قسم خاص لتجارب الناجحين، ويُدار من الأدمن فقط.
          </p>
        </div>
        <Link
          href="/admin/success-stories/new"
          className="rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90"
        >
          ➕ أضف تجربة نجاح
        </Link>
      </div>

      {stories.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          لا توجد تجارب بعد. أضف أول قصة نجاح لتظهر في صفحة زاد الباحث.
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          {stories.map((story) => (
            <div
              key={story.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-sm">
                ✦
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{story.title}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {story.name}
                  {story.university ? ` · ${story.university}` : ""}
                  {story.year ? ` · ${story.year}` : ""}
                </p>
              </div>
              <span
                className={
                  story.published
                    ? "text-xs text-emerald-600"
                    : "text-xs text-amber-600"
                }
              >
                {story.published ? "✅ منشورة" : "📝 مسودة"}
              </span>
              <Link
                href={`/admin/success-stories/${story.id}/edit`}
                className="rounded-full border px-3 py-1 text-xs transition hover:border-primary hover:text-primary"
              >
                تعديل
              </Link>
              <ConfirmActionButton
                action={deleteSuccessStoryAction.bind(null, story.id)}
                confirmText={`حذف تجربة «${story.title}»؟`}
                label="حذف"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
