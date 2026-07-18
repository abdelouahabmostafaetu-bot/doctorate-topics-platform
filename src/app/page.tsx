import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const revalidate = 3600; // ISR — تتجدد الصفحة كل ساعة (قرار AD-03)

export default async function HomePage() {
  const [latestTopics, topContributors, acceptedCount] = await Promise.all([
    prisma.topic.findMany({
      where: { status: "published" },
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
      take: 3,
      include: { university: true, specialty: true },
    }),
    prisma.user
      .findMany({
        where: { points: { gt: 0 } },
        orderBy: { points: "desc" },
        take: 5,
        select: { id: true, name: true, image: true, points: true },
      })
      .catch(
        () =>
          [] as Array<{
            id: string;
            name: string;
            image: string | null;
            points: number;
          }>,
      ),
    prisma.contribution.count({ where: { status: "accepted" } }).catch(() => 0),
  ]);

  const [first, ...rest] = topContributors;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <section className="text-center">
        {/* العنوان بلونين مختلفين */}
        <h1 className="text-3xl font-bold leading-relaxed md:text-4xl">
          <span className="text-foreground">أرشيف مواضيع مسابقات</span>{" "}
          <span className="text-primary">دكتوراه الرياضيات</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          أرشيف مواضيع مسابقات الالتحاق بالدكتوراه في الرياضيات — نصوص التمارين
          كاملة بعرض رياضي واضح، مع بحث وتصفية حسب الجامعة والسنة والتخصص
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/search"
            className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground transition hover:opacity-90"
          >
            تصفّح المواضيع
          </Link>
          <Link
            href="/contribute"
            className="rounded-lg border border-primary/40 px-6 py-2.5 font-medium text-primary transition hover:bg-primary/10"
          >
            🌱 ساهم
          </Link>
          <Link
            href="/coffee"
            className="rounded-lg border border-amber-400/60 px-6 py-2.5 font-medium text-amber-600 transition hover:bg-amber-100/50 dark:text-amber-400 dark:hover:bg-amber-950/40"
          >
            ☕ قهوة الدكتوراه
          </Link>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">أحدث المواضيع</h2>
        {/* ثلاثة مواضيع فقط — بدون صناديق، مع خط فاصل جميل بين كل موضوعين */}
        <div className="mt-2">
          {latestTopics.map((t, i) => (
            <div key={t.id}>
              {i > 0 && (
                <div
                  aria-hidden
                  className="h-px bg-gradient-to-l from-transparent via-primary/40 to-transparent"
                />
              )}
              <Link href={`/topics/${t.slug}`} className="group block py-4">
                <h3 className="font-semibold transition group-hover:text-primary">
                  {t.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  🏛️ {t.university.nameAr} · 🎓 {t.specialty.nameAr} · 📅{" "}
                  {t.year}
                </p>
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">🏆 أفضل المساهمين</h2>
          <Link
            href="/contributors"
            className="text-sm text-primary underline-offset-2 hover:underline"
          >
            عرض اللوحة كاملة ←
          </Link>
        </div>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          هذا الموقع يكبر بفضل مساهماتكم. حتى الآن تم قبول{" "}
          <strong>{acceptedCount}</strong> مساهمة.
        </p>
        {first ? (
          /* شكل هرمي: أكبر مساهم في القمة، ثم البقية في سطر ثانٍ */
          <div className="mt-5 flex flex-col items-center gap-5">
            <div className="flex flex-col items-center">
              <span className="text-lg">🥇</span>
              {first.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={first.image}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover ring-2 ring-amber-400"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-sm font-bold ring-2 ring-amber-400">
                  {(first.name || "?")[0]}
                </div>
              )}
              <span className="mt-1 max-w-32 truncate text-sm font-semibold">
                {first.name}
              </span>
              <span className="text-xs font-bold text-primary">
                ⭐ {first.points}
              </span>
            </div>
            {rest.length > 0 && (
              <div className="flex flex-wrap items-start justify-center gap-6">
                {rest.map((u, i) => (
                  <div key={u.id} className="flex flex-col items-center">
                    <span className="text-sm">
                      {i === 0 ? "🥈" : i === 1 ? "🥉" : "⭐"}
                    </span>
                    {u.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={u.image}
                        alt=""
                        className="h-8 w-8 rounded-full border object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-secondary text-xs">
                        {(u.name || "?")[0]}
                      </div>
                    )}
                    <span className="mt-0.5 max-w-24 truncate text-xs font-medium">
                      {u.name}
                    </span>
                    <span className="text-[10px] font-bold text-primary">
                      ⭐ {u.points}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            لا يوجد مساهمون بعد.
          </p>
        )}
        <p className="mt-4 text-center text-sm text-muted-foreground">
          تريد الظهور هنا؟{" "}
          <Link
            href="/contribute"
            className="text-primary underline-offset-2 hover:underline"
          >
            ساهم بموضوع أو حل من هنا 🌱
          </Link>
        </p>
      </section>
    </div>
  );
}
