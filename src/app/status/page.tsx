import { prisma } from "@/lib/prisma";
import { ensureServiceStatuses, STATE_LABELS } from "@/lib/status";
import { subscribeAction } from "./actions";

export const dynamic = "force-dynamic";

function formatDuration(start: Date, end: Date | null) {
  const ms = (end ?? new Date()).getTime() - start.getTime();
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  return `${hours} ساعة و${minutes % 60} دقيقة`;
}

export default async function StatusPage() {
  const [services, incidents] = await Promise.all([
    ensureServiceStatuses(),
    prisma.incident.findMany({
      orderBy: { startedAt: "desc" },
      take: 10,
    }),
  ]);

  const allOperational = services.every((s) => s.state === "operational");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-xl font-bold">حالة النظام</h1>
      <div
        className={`mt-4 rounded-lg border p-4 text-sm font-medium ${
          allOperational
            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
            : "border-amber-300 bg-amber-50 text-amber-700"
        }`}
      >
        {allOperational
          ? "🟢 جميع الخدمات تعمل بشكل طبيعي"
          : "⚠️ بعض الخدمات تواجه مشاكل حاليًّا"}
      </div>

      <div className="mt-6 divide-y rounded-lg border bg-card">
        {services.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between px-4 py-3 text-sm"
          >
            <span>{s.labelAr}</span>
            <span>{STATE_LABELS[s.state] ?? s.state}</span>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-semibold">سجل الأعطال الأخيرة</h2>
      {incidents.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          لا توجد أعطال مسجلة.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {incidents.map((inc) => (
            <div key={inc.id} className="rounded-lg border bg-card p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{inc.titleAr}</span>
                <span
                  className={
                    inc.resolvedAt
                      ? "text-xs text-emerald-600"
                      : "text-xs text-amber-600"
                  }
                >
                  {inc.resolvedAt ? "تم الحل" : "جارٍ المعالجة"}
                </span>
              </div>
              {inc.descriptionAr && (
                <p className="mt-1 text-muted-foreground">
                  {inc.descriptionAr}
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                المدة: {formatDuration(inc.startedAt, inc.resolvedAt)}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">
          اشترك للتنبيه عند تعلّق الأعطال
        </h3>
        <form action={subscribeAction} className="mt-3 flex flex-wrap gap-2">
          <input
            type="email"
            name="email"
            required
            placeholder="you@example.com"
            dir="ltr"
            className="min-w-[200px] flex-1 rounded-md border bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            اشتراك
          </button>
        </form>
      </div>
    </div>
  );
}
