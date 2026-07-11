import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TopicCard } from "@/components/topic-card";

export const revalidate = 3600; // ISR — تتجدد الصفحة كل ساعة (قرار AD-03)

export default async function HomePage() {
  const [examCount, latestTopics] = await Promise.all([
    prisma.topic.count({ where: { status: "published" } }),
    prisma.topic.findMany({
      where: { status: "published" },
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
      take: 6,
      include: { university: true, specialty: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <section className="text-center">
        <h1 className="text-3xl font-bold leading-relaxed text-primary md:text-4xl">
          أرشيف مواضيع مسابقات دكتوراه الرياضيات
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          تصفّح أكثر من {examCount} موضوع من مسابقات الالتحاق بالدكتوراه في
          الرياضيات في الجزائر
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href="/search"
            className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground transition hover:opacity-90"
          >
            تصفّح المواضيع 📚
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
    </div>
  );
}
