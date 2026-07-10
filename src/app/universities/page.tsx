import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const revalidate = 3600;

export const metadata = {
  title: "الجامعات — منصة مواضيع دكتوراه الرياضيات",
};

export default async function UniversitiesPage() {
  const [universities, counts] = await Promise.all([
    prisma.university.findMany({ orderBy: { name: "asc" } }),
    prisma.topic.groupBy({
      by: ["universityId"],
      where: { status: "published" },
      _count: { _all: true },
    }),
  ]);
  const countMap = new Map(counts.map((c) => [c.universityId, c._count._all]));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold">الجامعات</h1>
      <p className="mt-1 text-muted-foreground">
        اختر جامعة لتصفّح مواضيعها حسب السنة
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {universities.map((u) => (
          <Link
            key={u.id}
            href={`/universities/${u.slug}`}
            className="rounded-lg border bg-card p-4 shadow-sm transition hover:border-primary hover:shadow-md"
          >
            <h2 className="font-semibold leading-snug">{u.nameAr}</h2>
            <p
              dir="ltr"
              className="mt-1 text-left text-xs text-muted-foreground"
            >
              {u.name}
            </p>
            <p className="mt-2 text-sm font-medium text-primary">
              {countMap.get(u.id) ?? 0} موضوعًا
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
