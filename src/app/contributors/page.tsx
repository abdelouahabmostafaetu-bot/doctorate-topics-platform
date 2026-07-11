import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "أفضل المساهمين — منصة مواضيع دكتوراه الرياضيات",
};

export default async function ContributorsPage() {
  const users = await prisma.user.findMany({
    where: { points: { gt: 0 } },
    orderBy: { points: "desc" },
    take: 50,
    select: { id: true, name: true, image: true, points: true },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">🏆 أفضل المساهمين</h1>
      <p className="mt-2 text-muted-foreground">
        شكرًا لكل من يشارك مواضيع وحلولًا.
      </p>
      {users.length === 0 ? (
        <div className="mt-8 rounded-lg border p-8 text-center text-muted-foreground">
          لا يوجد مساهمون بعد — كن الأول من صفحة ساهم.
        </div>
      ) : (
        <ol className="mt-8 space-y-3">
          {users.map((u, i) => (
            <li
              key={u.id}
              className="flex items-center gap-3 rounded-lg border bg-card p-4"
            >
              <span className="w-8 text-center text-lg">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
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
              <span className="flex-1 truncate font-medium">{u.name}</span>
              <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">
                ⭐ {u.points}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
