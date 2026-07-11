import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TopicCard } from "@/components/topic-card";

export const revalidate = 3600; // ISR — تتجدد الصفحة كل ساعة (قرار AD-03)

export default async function HomePage() {
  const [latestTopics, topContributors, acceptedCount] = await Promise.all([
    prisma.topic.findMany({
      where: { status: "published" },
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
      take: 6,
      include: { university: true, specialty: true },
    }),
    prisma.user.findMany({
      where: { points: { gt: 0 } },
      orderBy: { points: "desc" },
      take: 5,
      select: { id: true, name: true, image: true, points: true },
    }).catch(() => [] as Array<{ id: string; name: string; image: string | null; points: number }>),
    prisma.contribution.count({ where: { status: "accepted" } }).catch(() => 0),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <section className="text-center">
        <h1 className="text-3xl font-bold leading-relaxed text-primary md:text-4xl">
          أرشيف مواضيع مسابقات دكتوراه الرياضيات
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          أرشيف مواضيع مسابقات الالتحاق بالدكتوراه في الرياضيات — نصوص
          التمارين كاملة بعرض رياضي واضح، مع بحث وتصفية حسب الجامعة والسنة
          والتخصص
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href="/search"
            className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground transition hover:opacity-90"
          >
            تصفّح المواضيع
          </Link>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">أحدث المواضيع</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {latestTopics.map((t) => (
            <TopicCard key={t.id} topic={t} />
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
        {topContributors.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {topContributors.map((u, i) => (
              <div
                key={u.id}
                className="flex flex-col items-center gap-2 rounded-lg border bg-card p-4 text-center shadow-sm"
              >
                <span className="text-lg">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "⭐"}
                </span>
                {u.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={u.image}
                    alt=""
                    className="h-10 w-10 rounded-full border object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-secondary text-sm">
                    {(u.name || "?")[0]}
                  </div>
                )}
                <span className="w-full truncate text-sm font-medium">{u.name}</span>
                <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">
                  ⭐ {u.points}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">لا يوجد مساهمون بعد.</p>
        )}
        <p className="mt-3 text-center text-sm text-muted-foreground">
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
