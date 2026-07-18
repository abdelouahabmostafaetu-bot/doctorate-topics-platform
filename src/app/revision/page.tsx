import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "مراجعتي — تقدمك في المراجعة للدكتوراه",
  description:
    "لوحة مراجعة شخصية: تتبّع تقدمك، سلسلة أيام المراجعة، واقتراحات ما تراجعه اليوم.",
};

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// شارة إحصائية كبيرة
function StatCard({
  icon,
  value,
  label,
  hint,
}: {
  icon: string;
  value: string;
  label: string;
  hint?: string;
}) {
  return (
    <div
      title={hint}
      className="flex flex-col items-center rounded-xl border bg-card px-3 py-3 text-center shadow-sm"
    >
      <span className="text-lg">{icon}</span>
      <b className="mt-1 text-lg text-primary" dir="ltr">
        {value}
      </b>
      <span className="mt-0.5 text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

export default async function RevisionPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  // ===== زائر غير مسجل: شرح الميزة + دعوة للتسجيل =====
  if (!userId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">📚 مراجعتي</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
          لوحة مراجعة شخصية تساعدك على التحضير لمسابقة الدكتوراه: تتبّع المواضيع
          التي حللتها، شاهد تقدمك حسب التخصص، حافظ على سلسلة أيام المراجعة 🔥،
          واحصل على اقتراحات لما تراجعه اليوم.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signin"
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            تسجيل الدخول
          </Link>
          <Link
            href="/signup"
            className="rounded-lg border border-primary/40 px-6 py-2.5 text-sm font-medium text-primary transition hover:bg-primary/10"
          >
            إنشاء حساب مجاني
          </Link>
        </div>
        <p className="mt-8 text-xs text-muted-foreground">
          أو ابدأ الآن مباشرة:
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
          <Link
            href="/practice"
            className="rounded-full border px-3 py-1.5 transition hover:border-primary hover:text-primary"
          >
            🧭 المراجعة حسب المحاور
          </Link>
          <Link
            href="/topics/random"
            className="rounded-full border px-3 py-1.5 transition hover:border-primary hover:text-primary"
          >
            🎲 موضوع عشوائي
          </Link>
        </div>
      </div>
    );
  }

  // ===== البيانات =====
  const [progressList, favoritesCount, totalPublished, specialties] =
    await Promise.all([
      prisma.topicProgress.findMany({
        where: { userId },
        orderBy: { doneAt: "desc" },
      }),
      prisma.favorite.count({ where: { userId } }),
      prisma.topic.count({ where: { status: "published" } }),
      prisma.specialty.findMany({ orderBy: { nameAr: "asc" } }),
    ]);

  const solvedIds = progressList.map((p) => p.topicId);
  const solvedTopics = solvedIds.length
    ? await prisma.topic.findMany({
        where: { id: { in: solvedIds }, status: "published" },
        include: { university: true, specialty: true },
      })
    : [];

  // ===== سلسلة أيام المراجعة 🔥 =====
  const dayKeys = new Set(progressList.map((p) => dayKey(p.doneAt)));
  let streak = 0;
  {
    const d = new Date();
    // إذا لم تحل شيئًا اليوم بعد، نبدأ العد من الأمس حتى لا تنكسر السلسلة
    if (!dayKeys.has(dayKey(d))) d.setDate(d.getDate() - 1);
    while (dayKeys.has(dayKey(d))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
  }

  // ===== نشاط آخر 7 أيام =====
  const days: Array<{ label: string; count: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const key = dayKey(day);
    days.push({
      label: day.toLocaleDateString("ar-DZ", { weekday: "narrow" }),
      count: progressList.filter((p) => dayKey(p.doneAt) === key).length,
    });
  }
  const weekCount = days.reduce((s, x) => s + x.count, 0);
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  // ===== التقدم حسب التخصص =====
  const totalsRaw = (await prisma.topic.aggregateRaw({
    pipeline: [
      { $match: { status: "published" } },
      { $group: { _id: "$specialtyId", n: { $sum: 1 } } },
    ] as Prisma.InputJsonValue[],
  })) as unknown as Array<{ _id: { $oid: string }; n: number }>;

  const solvedBySpec = new Map<string, number>();
  for (const t of solvedTopics) {
    solvedBySpec.set(t.specialtyId, (solvedBySpec.get(t.specialtyId) ?? 0) + 1);
  }
  const specialtyProgress = totalsRaw
    .map((row) => {
      const id = row._id?.$oid ?? "";
      return {
        id,
        name: specialties.find((s) => s.id === id)?.nameAr ?? "—",
        total: row.n,
        solved: solvedBySpec.get(id) ?? 0,
      };
    })
    .filter((s) => s.total > 0)
    .sort((a, b) => b.solved - a.solved || b.total - a.total)
    .slice(0, 10);

  // ===== اقتراحات المراجعة: مواضيع غير محلولة من تخصصك الأكثر نشاطًا =====
  let topSpecialtyId: string | null = null;
  {
    const best = [...solvedBySpec.entries()].sort((a, b) => b[1] - a[1])[0];
    topSpecialtyId = best?.[0] ?? null;
  }
  let suggestions = await prisma.topic.findMany({
    where: topSpecialtyId
      ? {
          status: "published",
          id: { notIn: solvedIds },
          specialtyId: topSpecialtyId,
        }
      : { status: "published", id: { notIn: solvedIds } },
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    take: 4,
    include: { university: true, specialty: true },
  });
  if (suggestions.length < 4) {
    const more = await prisma.topic.findMany({
      where: {
        status: "published",
        id: { notIn: [...solvedIds, ...suggestions.map((t) => t.id)] },
      },
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
      take: 4 - suggestions.length,
      include: { university: true, specialty: true },
    });
    suggestions = [...suggestions, ...more];
  }

  // ===== آخر ما حللت =====
  const recentSolved = progressList.slice(0, 3).map((p) => ({
    doneAt: p.doneAt,
    topic: solvedTopics.find((t) => t.id === p.topicId) ?? null,
  }));

  const percent = totalPublished
    ? Math.round((solvedTopics.length / totalPublished) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-base font-bold">📚 مراجعتي</h1>
        <p className="text-[11px] text-muted-foreground">
          علّم المواضيع بـ «✓ تم الحل» ليتتبّع تقدمك هنا
        </p>
      </div>

      {/* ===== البطاقات الإحصائية ===== */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard
          icon="✅"
          value={solvedTopics.length + " / " + totalPublished}
          label="موضوعًا محلولًا"
          hint="عدد المواضيع التي أنهيت حلها من مجموع المواضيع المنشورة"
        />
        <StatCard
          icon="🔥"
          value={String(streak)}
          label="أيام مراجعة متتالية"
          hint="حل موضوعًا واحدًا على الأقل كل يوم للحفاظ على السلسلة"
        />
        <StatCard
          icon="📅"
          value={String(weekCount)}
          label="محلولة هذا الأسبوع"
        />
        <StatCard icon="⭐" value={String(favoritesCount)} label="في المفضلة" />
      </div>

      {/* ===== شريط التقدم العام + نشاط الأسبوع ===== */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-semibold">التقدم العام</span>
            <span className="font-bold text-primary">{percent}%</span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: percent + "%" }}
            />
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            كل موضوع تحله يقرّبك خطوة من يوم المسابقة 💪
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold">نشاط آخر 7 أيام</p>
          <div dir="ltr" className="mt-3 flex items-end justify-center gap-2">
            {days.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  title={d.count + " موضوع"}
                  className={
                    "w-6 rounded-t " +
                    (d.count > 0 ? "bg-primary/80" : "bg-muted")
                  }
                  style={{
                    height: Math.max(5, (d.count / maxDay) * 44) + "px",
                  }}
                />
                <span className="text-[9px] text-muted-foreground">
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== ماذا تراجع اليوم؟ ===== */}
      <section className="mt-7">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-bold">🎯 ماذا تراجع اليوم؟</h2>
          {topSpecialtyId && (
            <span className="text-[10px] text-muted-foreground">
              مقترحة من تخصصك الأكثر نشاطًا
            </span>
          )}
        </div>
        {suggestions.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            🎉 رائع — حللت كل المواضيع المنشورة!
          </p>
        ) : (
          <div className="mt-1 divide-y">
            {suggestions.map((t) => (
              <Link
                key={t.id}
                href={"/topics/" + t.slug}
                className="group flex items-center gap-3 py-3"
              >
                <span className="w-11 shrink-0 text-center text-xs font-bold text-primary">
                  {t.year}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium transition group-hover:text-primary">
                    {t.university.nameAr}
                    {t.examNumber != null &&
                      " — الموضوع " + String(t.examNumber).padStart(2, "0")}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {t.specialty.nameAr} · {t.problems.length} تمارين
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground transition group-hover:-translate-x-0.5 group-hover:text-primary">
                  ←
                </span>
              </Link>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Link
            href="/practice"
            className="rounded-full border px-3 py-1.5 transition hover:border-primary hover:text-primary"
          >
            🧭 المراجعة حسب المحاور
          </Link>
          <Link
            href="/topics/random"
            className="rounded-full border px-3 py-1.5 transition hover:border-primary hover:text-primary"
          >
            🎲 موضوع عشوائي
          </Link>
          <Link
            href="/search"
            className="rounded-full border px-3 py-1.5 transition hover:border-primary hover:text-primary"
          >
            🔍 كل المواضيع
          </Link>
          <Link
            href="/account"
            className="rounded-full border px-3 py-1.5 transition hover:border-primary hover:text-primary"
          >
            ⭐ مفضلتي
          </Link>
        </div>
      </section>

      {/* ===== تقدمك حسب التخصص ===== */}
      {specialtyProgress.length > 0 && (
        <section className="mt-7">
          <h2 className="text-sm font-bold">📊 تقدمك حسب التخصص</h2>
          <div className="mt-2 rounded-xl border bg-card p-4 shadow-sm">
            {specialtyProgress.map((s) => (
              <div key={s.id} className="py-1.5">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground" dir="ltr">
                    {s.solved} / {s.total}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width:
                        (s.total ? Math.round((s.solved / s.total) * 100) : 0) +
                        "%",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== آخر ما حللت ===== */}
      {recentSolved.length > 0 && (
        <section className="mt-7">
          <h2 className="text-sm font-bold">🕒 آخر ما حللت</h2>
          <div className="mt-1 divide-y">
            {recentSolved.map(
              (r, i) =>
                r.topic && (
                  <Link
                    key={i}
                    href={"/topics/" + r.topic.slug}
                    className="group flex items-center gap-3 py-2.5"
                  >
                    <span className="shrink-0 text-sm">✅</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm transition group-hover:text-primary">
                        {r.topic.university.nameAr} — {r.topic.year}
                        {r.topic.examNumber != null &&
                          " — الموضوع " +
                            String(r.topic.examNumber).padStart(2, "0")}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {r.doneAt.toLocaleDateString("ar-DZ")}
                    </span>
                  </Link>
                ),
            )}
          </div>
        </section>
      )}
    </div>
  );
}
