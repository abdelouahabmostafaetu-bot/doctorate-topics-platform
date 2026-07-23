import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ContributionForm } from "@/components/contribute/contribution-form";
import { PointsNotice } from "@/components/contribute/points-notice";

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

export default async function ContributePage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
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

  const sp = await searchParams;
  const userId = session.user.id ?? "";
  const [me, mine, universities, specialties] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.contribution.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.university.findMany({ orderBy: { nameAr: "asc" } }),
    prisma.specialty.findMany({ orderBy: { nameAr: "asc" } }),
  ]);
  const points = me?.points ?? 0;

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="text-center">
        <h1 className="text-2xl font-bold">🌱 ساهم معنا</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          شارك موضوعًا جديدًا أو حلًا لموضوع موجود. اختر الطريقة المناسبة لك:
          كتابة مباشرة بصيغة LaTeX، أو رفع ملفات (حتى 100 ملف).
        </p>
      </header>

      {sp.submitted === "1" && (
        <div className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-center text-sm">
          ✅ تم إرسال مساهمتك بنجاح. ستظهر بعد المراجعة.
        </div>
      )}

      <PointsNotice points={points} />

      <Link
        href="/contribute-lectures"
        className="block rounded-xl border border-primary/25 bg-gradient-to-l from-primary/10 via-card to-card px-4 py-3 shadow-sm transition hover:border-primary/50"
      >
        <p className="text-sm font-bold">📚 ساهم بدروس جامعتك ←</p>
        <p className="mt-1 text-xs leading-6 text-muted-foreground">
          عندك محاضرات أو ملخصات؟ ارفعها كما هي دون ترتيب — نحن نصنّفها
          وننشرها وتحصل أنت على نقاط. ⭐
        </p>
      </Link>

      <div>
        <ContributionForm
          universities={universities.map((u) => ({
            id: u.id,
            name: u.name,
            nameAr: u.nameAr,
          }))}
          specialties={specialties.map((s) => ({
            id: s.id,
            name: s.name,
            nameAr: s.nameAr,
          }))}
        />
      </div>

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
                    {(c.pointsAwarded ?? 0) > 0
                      ? " — +" + c.pointsAwarded + " نقاط"
                      : ""}
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

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/latex-guide" className="text-primary hover:underline">
          📖 دليل كتابة LaTeX
        </Link>
      </p>
    </main>
  );
}
