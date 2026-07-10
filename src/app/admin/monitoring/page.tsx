import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DASHBOARD_LINKS = [
  { label: "MongoDB Atlas", url: "https://cloud.mongodb.com" },
  { label: "Cloudflare R2", url: "https://dash.cloudflare.com" },
  { label: "Resend (البريد)", url: "https://resend.com/emails" },
  { label: "Vercel", url: "https://vercel.com/dashboard" },
];

export default async function AdminMonitoringPage() {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") redirect("/admin");

  const dbStart = Date.now();
  let dbLatencyMs: number | null = null;
  let dbOk = true;
  try {
    await prisma.$runCommandRaw({ ping: 1 });
    dbLatencyMs = Date.now() - dbStart;
  } catch {
    dbOk = false;
  }

  const [topicsCount, usersCount, openReportsCount, recentErrors] =
    await Promise.all([
      prisma.topic.count(),
      prisma.user.count(),
      prisma.report.count({ where: { status: "open" } }),
      prisma.errorLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold">المراقبة الداخلية</h2>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">استجابة القاعدة</p>
          <p className="mt-1 text-lg font-bold">
            {dbOk ? `${dbLatencyMs} ملّي` : "🔴 متعطلة"}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">عدد المواضيع</p>
          <p className="mt-1 text-lg font-bold">{topicsCount}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">عدد المستخدمين</p>
          <p className="mt-1 text-lg font-bold">{usersCount}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">بلافات مفتوحة</p>
          <p className="mt-1 text-lg font-bold">{openReportsCount}</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5">
        <h3 className="font-semibold">روابط لوحات المزوّدين</h3>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          {DASHBOARD_LINKS.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border px-3 py-1.5 text-primary transition hover:bg-secondary"
            >
              {link.label} ↗
            </a>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5">
        <h3 className="font-semibold">سجل الأخطاء الأخيرة</h3>
        {recentErrors.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            لا توجد أخطاء مسجلة. 🎉
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {recentErrors.map((err) => (
              <div key={err.id} className="rounded-md border px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span dir="ltr" className="font-mono">
                    {err.message}
                  </span>
                  <span className="text-muted-foreground">
                    {err.createdAt.toLocaleString("ar-DZ")}
                  </span>
                </div>
                {err.path && (
                  <p dir="ltr" className="mt-1 text-muted-foreground">
                    {err.path}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
