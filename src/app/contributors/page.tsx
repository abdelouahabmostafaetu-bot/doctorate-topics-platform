import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "أفضل المساهمين — منصة مواضيع دكتوراه الرياضيات",
};

const medals = ["🥇", "🥈", "🥉"];

const typeLabel: Record<string, string> = {
  teacher: "أستاذ",
  student: "طالب",
};

export default async function ContributorsPage() {
  const [top, acceptedCount] = await Promise.all([
    prisma.user.findMany({
      where: { points: { gt: 0 } },
      orderBy: [{ points: "desc" }, { createdAt: "asc" }],
      take: 10,
    }),
    prisma.contribution.count({ where: { status: "accepted" } }),
  ]);

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="text-center">
        <h1 className="text-2xl font-bold">🏆 أفضل المساهمين</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          هذا الموقع يكبر بفضل مساهماتكم. شكرًا لكل من شارك موضوعًا أو حلًا —
          حتى الآن تم قبول <strong>{acceptedCount.toLocaleString("en-US")}</strong>{" "}
          مساهمة.
        </p>
      </header>

      {top.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center shadow-sm">
          <p className="text-sm leading-7 text-muted-foreground">
            لا يوجد مساهمون بعد — كن أول من يدخل اللوحة!
          </p>
          <Link
            href="/contribute"
            className="mt-4 inline-block rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            ساهم الآن 🌱
          </Link>
        </div>
      ) : (
        <ol className="space-y-2">
          {top.map((u, i) => (
            <li
              key={u.id}
              className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm"
            >
              <span className="w-8 text-center text-lg font-bold">
                {medals[i] ?? i + 1}
              </span>
              {u.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={u.image}
                  alt=""
                  className="h-9 w-9 rounded-full border object-cover"
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
                  {u.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{u.name}</span>
                {u.userType && (
                  <span className="block text-xs text-muted-foreground">
                    {typeLabel[u.userType] ?? u.userType}
                  </span>
                )}
              </span>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                ⭐ {u.points}
              </span>
            </li>
          ))}
        </ol>
      )}

      <p className="text-center text-sm text-muted-foreground">
        تريد الظهور هنا؟{" "}
        <Link
          href="/contribute"
          className="text-primary underline-offset-2 hover:underline"
        >
          ساهم بموضوع أو حل من هنا 🌱
        </Link>
      </p>
    </main>
  );
}
