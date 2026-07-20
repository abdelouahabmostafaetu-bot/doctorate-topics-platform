import Link from "next/link";
import { SubmitStoryForm } from "@/components/success-stories/submit-story-form";
import { submitSuccessStoryAction } from "./actions";

export const metadata = { title: "شاركنا تجربتك | زاد الباحث" };

export default async function SubmitSuccessStoryPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;
  return (
    <main className="min-h-screen px-5 py-7 sm:px-8 sm:py-10" dir="rtl">
      <div className="mx-auto max-w-xl">
        <Link
          href="/guide/success-stories"
          className="text-[11px] text-muted-foreground transition hover:text-primary"
        >
          ← قصص من الطريق إلى الدكتوراه
        </Link>
        <header className="mt-5 border-b border-slate-200 pb-4 dark:border-border">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground">
            زاد الباحث · أثر طيب
          </p>
          <h1 className="mt-1 text-lg font-bold sm:text-xl">شاركنا تجربتك</h1>
          <p className="mt-2 text-[11px] leading-6 text-muted-foreground">
            تجربة صادقة قد تمنح طالبًا آخر هدوءًا وأملًا. يراجعها الأدمن قبل
            النشر.
          </p>
        </header>
        {sent === "1" ? (
          <div className="mt-6 border-r-2 border-primary py-1 pr-3 text-xs leading-6 text-muted-foreground">
            تم استلام تجربتك. شكرًا لمشاركتك، وستراجعها الإدارة قبل نشرها.
          </div>
        ) : (
          <div className="mt-5">
            <SubmitStoryForm action={submitSuccessStoryAction} />
          </div>
        )}
      </div>
    </main>
  );
}
