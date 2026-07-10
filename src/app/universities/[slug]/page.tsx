import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TopicCard } from "@/components/topic-card";

export const revalidate = 3600;

export default async function UniversityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const university = await prisma.university.findUnique({ where: { slug } });
  if (!university) notFound();

  const topics = await prisma.topic.findMany({
    where: { universityId: university.id, status: "published" },
    orderBy: [{ year: "desc" }, { examNumber: "asc" }],
    include: { university: true, specialty: true },
  });
  const years = [...new Set(topics.map((t) => t.year))];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold">{university.nameAr}</h1>
      <p dir="ltr" className="mt-1 text-left text-sm text-muted-foreground">
        {university.name}
      </p>

      {years.map((year) => (
        <section key={year} className="mt-8">
          <h2 className="border-b pb-2 text-xl font-semibold text-primary">
            {year}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topics
              .filter((t) => t.year === year)
              .map((t) => (
                <TopicCard key={t.id} topic={t} />
              ))}
          </div>
        </section>
      ))}

      {topics.length === 0 && (
        <p className="mt-8 text-muted-foreground">
          لا توجد مواضيع منشورة لهذه الجامعة بعد.
        </p>
      )}
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const university = await prisma.university.findUnique({ where: { slug } });
  if (!university) return { title: "جامعة غير موجودة" };
  return { title: `${university.nameAr} — مواضيع دكتوراه الرياضيات` };
}
