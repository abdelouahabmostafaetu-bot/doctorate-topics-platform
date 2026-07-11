import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ContributionForm } from "@/components/contribute/contribution-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ساهم معنا — منصة مواضيع دكتوراه الرياضيات",
};

const statusLabel: Record<string, string> = {
  pending: "قيد المراجعة",
  accepted: "مقبولة",
  duplicate: "مكررة",
  rejected: "مرفوضة",
};

const statusClass: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  accepted:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  duplicate: "bg-secondary text-secondary-foreground",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
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

  const userId = session.user.id ?? "";
  const [me, mine] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.contribution.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  const points = me?.points ?? 0;

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="text-center">
        <h1 className="text-2xl font-bold">🌱 ساهم معنا</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          شارك موضوعًا جديدًا أو حلًا لموضوع موجود. اختر الطريقة المناسبة لك:
          كتابة مباشرة بصيغة LaTeX، أو رفع ملفات (صور، PDF، Word، TEX، ZIP...).
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-primary">⭐ {points}</p>
          <p className="mt-1 text-sm text-muted-foreground">رصيدك من النقاط</p>
          <Link
            href="/contributors"
            className="mt-2 inline-block text-sm text-primary underline-offset-2 hover:underline"
          >
            لوحة أفضل المساهمين ←
          </Link>
        </div>
        <div className="rounded-lg border bg-card p-4 text-sm leading-7 text-muted-foreground shadow-sm">
          ⭐ نظام النقاط: موضوع جديد مع الحل <strong>+10</strong> — موضوع بدون
          حل أو حل لموضوع موجود <strong>+5</strong> — موضوع مكرر{" "}
          <strong>0</strong> (مع الشكر!). تُحتسب النقاط بعد مراجعة الإدارة.
        </div>
      </div>

      <ContributionForm />

      {mine.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">📋 مساهماتي</h2>
          <div className="space-y-2">
            {mine.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card px-4 py-2 text-sm"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{c.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {c.createdAt.toLocaleDateString("ar-DZ")}
                    {c.pointsAwarded > 0 ? " — +" + c.pointsAwarded + " نقاط" : ""}
                  </span>
                </span>
                <span
                  className={
                    "rounded-full px-3 py-1 text-xs " +
                    (statusClass[c.status] ?? "")
                  }
                >
                  {statusLabel[c.status] ?? c.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
