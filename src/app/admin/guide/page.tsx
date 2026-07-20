import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { deleteArticleAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminGuidePage() {
  const articles = await prisma.article.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold">📚 دليل الطالب — المقالات</h2>
        <Link
          href="/admin/guide/new"
          className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition hover:opacity-90"
        >
          ➕ مقال جديد
        </Link>
      </div>

      {articles.length === 0 ? (
        <div className="mt-10 rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            لا توجد مقالات بعد —{" "}
            <Link
              href="/admin/guide/new"
              className="text-primary hover:underline"
            >
              أضف أول مقال
            </Link>
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {articles.map((article, index) => (
            <div
              key={article.id}
              className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{article.titleAr}</p>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span
                    className={
                      article.published ? "text-emerald-600" : "text-amber-600"
                    }
                  >
                    {article.published ? "✅ منشور" : "📝 مسودة"}
                  </span>
                  <span>·</span>
                  <span>ترتيب: {article.position}</span>
                  <span>·</span>
                  <span>
                    {article.createdAt.toLocaleDateString("ar-DZ")}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {article.published && (
                  <Link
                    href={`/guide/${article.slug}`}
                    target="_blank"
                    className="rounded-full border px-2.5 py-1 text-[10px] text-muted-foreground transition hover:border-primary hover:text-primary"
                  >
                    👁️ معاينة
                  </Link>
                )}
                <Link
                  href={`/admin/guide/${article.id}/edit`}
                  className="rounded-full border px-2.5 py-1 text-[10px] text-muted-foreground transition hover:border-primary hover:text-primary"
                >
                  ✏️ تعديل
                </Link>
                <ConfirmActionButton
                  action={deleteArticleAction.bind(null, article.id)}
                  confirmText={`حذف "‏${article.titleAr}"؟`}
                  label="حذف"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
