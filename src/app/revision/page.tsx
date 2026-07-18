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

// بطاقة إحصائية صغيرة
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

// صف موضوع مختصر قابل لإعادة الاستعمال
function TopicRow({
  slug,
  year,
  examNumber,
  universityName,
  subtitle,
}: {
  slug: string;
  year: number;
  examNumber: number | null;
  universityName: string;
  subtitle: string;
}) {
  return (
    <Link
      href={"/topics/" + slug}
      className="group flex items-center gap-3 py-3"
    >
      <span className="w-11 shrink-0 text-center text-xs font-bold text-primary">
        {year}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium transition group-hover:text-primary">
          {universityName}
          {examNumber != null &&
            " — الموضوع " + String(examNumber).padStart(2, "0")}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
          {subtitle}
        </span>
      </span>
      <span className="shrink-0 text-xs text-muted-foreground transition group-hover:-translate-x-0.5 group-hover:text-primary">
        ←
      </span>
    </Link>
  );
}

// شريط تقدم صغير مع تسمية
function ProgressRow({
  name,
  solved,
  total,
}: {
  name: string;
  solved: number;
  total: number;
}) {
  const pct = total ? Math.round((solved / total) * 100) : 0;
  return (
    <div className="py-1.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium">{name}</span>
        <span className="text-muted-foreground" dir="ltr">
          {solved} / {total}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: pct + "%" }}
        />
      </div>
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
          التي حللتها، شاهد تقدمك حسب التخصص والسنة، حافظ على سلسلة أيام
          المراجعة 🔥، وابدأ جلسة مراجعة بضغطة واحدة.
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
  const [progressList, favorites, totalPublished, specialties] =
    await Promise.all([
      prisma.topicProgress.findMany({
        where: { userId },
        orderBy: { doneAt: "desc" },
      }),
      prisma.favorite.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.topic.count({ where: { status: "published" } }),
      prisma.specialty.findMany({ orderBy: { nameAr: "asc" } }),
    ]);

  const solvedIds = progressList.map((p) => p.topicId);
  const solvedIdSet = new Set(solvedIds);
  const solvedTopics = solvedIds.length
    ? await prisma.topic.findMany({
        where: { id: { in: solvedIds }, status: "published" },
        include: { university: true, specialty: true },
      })
    : [];

  // ===== عدد المواضيع المحلولة لكل يوم =====
  const countsByDay = new Map<string, number>();
  for (const p of progressList) {
    const k = dayKey(p.doneAt);
    countsByDay.set(k, (countsByDay.get(k) ?? 0) + 1);
  }

  // ===== سلسلة أيام المراجعة 🔥 =====
  let streak = 0;
  {
    const d = new Date();
    // إذا لم تحل شيئًا اليوم بعد، نبدأ العد من الأمس حتى لا تنكسر السلسلة
    if (!countsByDay.has(dayKey(d))) d.setDate(d.getDate() - 1);
    while (countsByDay.has(dayKey(d))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
  }

  // ===== محلولة هذا الأسبوع =====
  let weekCount = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    weekCount += countsByDay.get(dayKey(d)) ?? 0;
  }

  // ===== خريطة النشاط: آخر 12 أسبوعًا (مثل GitHub) =====
  const heatCells: Array<{ key: string; count: number }> = [];
  {
    const start = new Date();
    start.setDate(start.getDate() - 83);
    start.setDate(start.getDate() - start.getDay()); // محاذاة إلى بداية الأسبوع
    const todayKey = dayKey(new Date());
    const d = new Date(start);
    while (dayKey(d) <= todayKey) {
      const k = dayKey(d);
      heatCells.push({ key: k, count: countsByDay.get(k) ?? 0 });
      d.setDate(d.getDate() + 1);
    }
  }

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
    .slice(0, 8);

  // ===== التقدم حسب السنوات =====
  const yearsRaw = (await prisma.topic.aggregateRaw({
    pipeline: [
      { $match: { status: "published" } },
      { $group: { _id: "$year", n: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ] as Prisma.InputJsonValue[],
  })) as unknown as Array<{ _id: number; n: number }>;
  const solvedByYear = new Map<number, number>();
  for (const t of solvedTopics) {
    solvedByYear.set(t.year, (solvedByYear.get(t.year) ?? 0) + 1);
  }
  const yearProgress = yearsRaw
    .filter((r) => typeof r._id === "number")
    .map((r) => ({
      year: r._id,
      total: r.n,
      solved: solvedByYear.get(r._id) ?? 0,
    }))
    .slice(0, 8);

  // ===== اقتراحات المراجعة: غير محلولة من تخصصك الأكثر نشاطًا =====
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

  // ===== مفضلة لم تُحل بعد — قائمة انتظار المراجعة =====
  const unsolvedFavIds = favorites
    .map((f) => f.topicId)
    .filter((id) => !solvedIdSet.has(id))
    .slice(0, 8);
  const favTopicsRaw = unsolvedFavIds.length
    ? await prisma.topic.findMany({
        where: { id: { in: unsolvedFavIds }, status: "published" },
        include: { university: true, specialty: true },
      })
    : [];
  const favQueue = unsolvedFavIds
    .map((id) => favTopicsRaw.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
    .slice(0, 4);

  // ===== آخر ما حللت =====
  const recentSolved = progressList.slice(0, 3).map((p) => ({
    doneAt: p.doneAt,
    topic: solvedTopics.find((t) => t.id === p.topicId) ?? null,
  }));

  const percent = totalPublished
    ? Math.round((solvedTopics.length / totalPublished) * 100)
    : 0;

  // ===== رسالة تحفيزية + هدف الجلسة القادمة =====
  const firstName = (session?.user?.name ?? "").trim().split(/\s+/)[0] || null;
  const motivation =
    streak >= 7
      ? `🔥 مذهل! ${streak} يومًا من المراجعة المتواصلة — لا توقف الآن`
      : streak >= 3
        ? `🔥 سلسلة ${streak} أيام متتالية — واصل!`
        : streak >= 1
          ? "بداية جيدة — حافظ على السلسلة يومًا بعد يوم 🌱"
          : weekCount > 0
            ? "راجعت هذا الأسبوع — حل موضوع اليوم لتبدأ سلسلتك 🔥"
            : "موضوع واحد اليوم خير من عشرة غدًا — ابدأ الآن 💪";
  // هدف زر «ابدأ جلسة مراجعة»: أول مفضلة غير محلولة، وإلا أول اقتراح
  const startTarget = favQueue[0] ?? suggestions[0] ?? null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-base font-bold">📚 مراجعتي</h1>
        <p className="text-[11px] text-muted-foreground">
          علّم المواضيع بـ «✓ تم الحل» ليتتبّع تقدمك هنا
        </p>
      </div>

      {/* ===== بطاقة الترحيب + بدء جلسة مراجعة ===== */}
      <div className="mt-4 flex flex-col items-start justify-between gap-3 rounded-xl border bg-gradient-to-l from-primary/10 via-card to-card p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {firstName ? `أهلًا ${firstName} 👋` : "أهلًا بك 👋"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{motivation}</p>
        </div>
        {startTarget && (
          <div className="shrink-0 text-center">
            <Link
              href={"/topics/" + startTarget.slug + "?reading=1"}
              className="inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:opacity-90"
            >
              ▶️ ابدأ جلسة مراجعة
            </Link>
            <p className="mt-1 text-[10px] text-muted-foreground">
              تُفتح مباشرة في وضع القراءة 📖
            </p>
          </div>
        )}
      </div>

      {/* ===== البطاقات الإحصائية ===== */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
        <StatCard
          icon="⭐"
          value={String(favorites.length)}
          label="في المفضلة"
        />
      </div>

      {/* ===== التقدم العام + خريطة النشاط ===== */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
          <p className="text-xs font-semibold">نشاطك في آخر 12 أسبوعًا</p>
          <div
            dir="ltr"
            className="mt-3 grid grid-flow-col grid-rows-[repeat(7,auto)] justify-center gap-[3px]"
          >
            {heatCells.map((c) => (
              <span
                key={c.key}
                title={c.key + " — " + c.count}
                className={
                  "h-2.5 w-2.5 rounded-[3px] " +
                  (c.count === 0
                    ? "bg-muted"
                    : c.count === 1
                      ? "bg-primary/40"
                      : c.count === 2
                        ? "bg-primary/70"
                        : "bg-primary")
                }
              />
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
              <TopicRow
                key={t.id}
                slug={t.slug}
                year={t.year}
                examNumber={t.examNumber ?? null}
                universityName={t.university.nameAr}
                subtitle={
                  t.specialty.nameAr + " · " + t.problems.length + " تمارين"
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* ===== حفظتها ولم تحلها بعد ===== */}
      {favQueue.length > 0 && (
        <section className="mt-7">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-bold">⭐ حفظتها ولم تحلها بعد</h2>
            <Link
              href="/account"
              className="text-[10px] text-muted-foreground transition hover:text-primary"
            >
              كل المفضلة ←
            </Link>
          </div>
          <div className="mt-1 divide-y">
            {favQueue.map((t) => (
              <TopicRow
                key={t.id}
                slug={t.slug}
                year={t.year}
                examNumber={t.examNumber ?? null}
                universityName={t.university.nameAr}
                subtitle={
                  t.specialty.nameAr + " · " + t.problems.length + " تمارين"
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* ===== التقدم حسب التخصص والسنوات ===== */}
      {(specialtyProgress.length > 0 || yearProgress.length > 0) && (
        <section className="mt-7">
          <h2 className="text-sm font-bold">📊 تقدمك بالتفصيل</h2>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {specialtyProgress.length > 0 && (
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <p className="text-[11px] font-semibold text-muted-foreground">
                  حسب التخصص
                </p>
                {specialtyProgress.map((s) => (
                  <ProgressRow
                    key={s.id}
                    name={s.name}
                    solved={s.solved}
                    total={s.total}
                  />
                ))}
              </div>
            )}
            {yearProgress.length > 0 && (
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <p className="text-[11px] font-semibold text-muted-foreground">
                  حسب السنة
                </p>
                {yearProgress.map((y) => (
                  <ProgressRow
                    key={y.year}
                    name={String(y.year)}
                    solved={y.solved}
                    total={y.total}
                  />
                ))}
              </div>
            )}
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

      {/* ===== روابط سريعة ===== */}
      <div className="mt-8 flex flex-wrap justify-center gap-2 text-xs">
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
    </div>
  );
}
