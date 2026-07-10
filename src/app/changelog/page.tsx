import { prisma } from "@/lib/prisma";
import { ChangelogVisitMarker } from "@/components/changelog-visit-marker";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  new: "🆕 جديد",
  improved: "⚡ تحسين",
  fixed: "🐛 إصلاح",
};

export default async function ChangelogPage() {
  const entries = await prisma.changelogEntry.findMany({
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <ChangelogVisitMarker />
      <h1 className="text-xl font-bold">جديدنا</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        أخر التحديثات والميزات الجديدة في المنصة.
      </p>

      {entries.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          لا توجد تحديثات منشورة بعد.
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          {entries.map((entry) => (
            <article key={entry.id} className="rounded-lg border bg-card p-5">
              <h2 className="font-semibold">{entry.titleAr}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {entry.publishedAt.toLocaleDateString("ar-DZ")}
              </p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {entry.items.map((item, i) => (
                  <li key={i}>
                    {TYPE_LABELS[item.type] ?? item.type} — {item.textAr}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
