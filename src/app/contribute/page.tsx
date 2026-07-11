import Link from "next/link";
import { auth } from "@/auth";
import { ContributionForm } from "@/components/contribute/contribution-form";

export const metadata = {
  title: "ساهم معنا — منصة مواضيع دكتوراه الرياضيات",
};

export default async function ContributePage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">🌱 ساهم معنا</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          هذا الموقع ثمرة سنوات من العمل، وكل مساهمة منك تجعله أفضل. للمساهمة
          بموضوع أو حل، يجب تسجيل الدخول أولًا حتى نتمكن من احتساب نقاطك وشكرك
          باسمك.
        </p>
        <Link
          href="/signin"
          className="mt-6 inline-block rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          تسجيل الدخول
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="text-center">
        <h1 className="text-2xl font-bold">🌱 ساهم معنا</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          شارك موضوعًا جديدًا أو حلًا لموضوع موجود. اختر الطريقة المناسبة لك:
          كتابة مباشرة بصيغة LaTeX، أو رفع ملفات (صور، PDF، Word، TEX، ZIP...).
        </p>
      </header>

      <div className="rounded-lg border bg-card p-4 text-sm leading-7 text-muted-foreground shadow-sm">
        ⭐ نظام النقاط: موضوع جديد مع الحل <strong>+10</strong> — موضوع بدون حل
        أو حل لموضوع موجود <strong>+5</strong> — موضوع مكرر <strong>0</strong>{" "}
        (مع الشكر!). تُحتسب النقاط بعد مراجعة الإدارة.
      </div>

      <ContributionForm />
    </main>
  );
}
