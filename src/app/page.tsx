import { prisma } from "@/lib/prisma";
import { TopicCard } from "@/components/topic-card";

export const revalidate = 3600; // ISR — تتجدد الصفحة كل ساعة (قرار AD-03)

export default async function HomePage() {
  const [examCount, universityCount, latestTopics, agg] = await Promise.all([
    prisma.topic.count({ where: { status: "published" } }),
    prisma.university.count(),
    prisma.topic.findMany({
      where: { status: "published" },
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
      take: 6,
      include: { university: true, specialty: true },
    }),
    prisma.topic.aggregateRaw({
      pipeline: [
        { $match: { status: "published" } },
        { $project: { n: { $size: "$problems" } } },
        { $group: { _id: null, total: { $sum: "$n" } } },
      ],
    }),
  ]);
  const problemCount =
    Array.isArray(agg) && agg.length > 0
      ? Number((agg[0] as { total?: number }).total ?? 0)
      : 0;

  const stats = [
    { value: examCount, label: "موضوع مسابقة" },
    { value: problemCount, label: "تمرين بنصه الكامل" },
    { value: universityCount, label: "جامعة جزائرية" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <section className="text-center">
        <h1 className="text-3xl font-bold leading-relaxed text-primary md:text-4xl">
          أرشيف مواضيع مسابقات دكتوراه الرياضيات
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          تصفّح مواضيع مسابقات الالتحاق بالدكتوراه في الرياضيات بالجامعات
          الجزائرية — نصوص التمارين والحلول بعرض رياضي واضح
        </p>
      </section>

      <section className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border bg-card p-5 text-center shadow-sm"
          >
            <div className="text-3xl font-bold text-primary">{s.value}</div>
            <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">أحدث المواضيع</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {latestTopics.map((t) => (
            <TopicCard key={t.id} topic={t} />
          ))}
        </div>
      </section>
    </div>
  );
}
