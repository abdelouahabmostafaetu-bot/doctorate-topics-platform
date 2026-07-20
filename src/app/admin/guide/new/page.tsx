import Link from "next/link";
import { ArticleForm } from "@/components/admin/article-form";
import { createArticleAction } from "../actions";

export const dynamic = "force-dynamic";

export default function AdminNewArticlePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold">➕ مقال جديد</h2>
        <Link
          href="/admin/guide"
          className="text-[11px] text-muted-foreground transition hover:text-primary"
        >
          ← رجوع للقائمة
        </Link>
      </header>
      <p className="mt-1 text-[11px] text-muted-foreground">
        اكتب محتوى المقال باستخدام Markdown وLaTeX — معاينة فورية متاحة مع زر التقسيم الجانبي.
      </p>
      <div className="mt-4 h-px bg-gradient-to-l from-primary/40 via-border to-transparent" />
      <div className="mt-5">
        <ArticleForm action={createArticleAction} submitLabel="💾 نشر المقال" />
      </div>
    </div>
  );
}
