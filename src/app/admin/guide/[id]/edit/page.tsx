import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ArticleForm } from "@/components/admin/article-form";
import { updateArticleAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function AdminEditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") redirect("/");

  const { id } = await params;
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold">✏️ تعديل مقال</h2>
        <Link
          href="/admin/guide"
          className="text-[11px] text-muted-foreground transition hover:text-primary"
        >
          ← رجوع للقائمة
        </Link>
      </header>
      <p className="mt-1 text-[11px] text-muted-foreground">
        عدّل المحتوى بحرية — التغييرات فورية مع المعاينة الجانبية.
      </p>
      <div className="mt-4 h-px bg-gradient-to-l from-primary/40 via-border to-transparent" />
      <div className="mt-5">
        <ArticleForm
          action={updateArticleAction}
          initial={{
            id: article.id,
            titleAr: article.titleAr,
            summary: article.summary ?? "",
            content: article.content,
            position: article.position,
            published: article.published,
          }}
          submitLabel="💾 حفظ التعديلات"
        />
      </div>
    </div>
  );
}
