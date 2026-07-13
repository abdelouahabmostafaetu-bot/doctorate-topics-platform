import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AI_TASKS, taskLabel } from "@/lib/ai/tasks";
import { envProvider } from "@/lib/ai/llm";
import { testAllAiKeysAction } from "../actions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type AiKeyRow = {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  task: string;
  active: boolean;
  lastStatus: string | null;
  lastError: string | null;
  lastCheckedAt: Date | null;
};

function statusText(k: AiKeyRow): string {
  if (!k.active) return "⏸️ معطّل";
  if (k.lastStatus === "ok") return "✅ يعمل";
  if (k.lastStatus === "fail") return "❌ لا يعمل";
  return "لم يُفحص";
}

export default async function AiStatusPage() {
  let keys: AiKeyRow[] = [];
  let dbError = "";
  try {
    keys = await prisma.aiKey.findMany({ orderBy: { createdAt: "asc" } });
  } catch {
    dbError = "تعذر قراءة المفاتيح — تأكد من تنفيذ npx prisma generate";
  }
  const env = envProvider();
  const active = keys.filter((k) => k.active);

  return (
    <div className="space-y-5 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold">📊 حالة الذكاء الاصطناعي</h2>
          <p className="mt-1 text-xs text-muted-foreground">أي مفتاح يخدم كل مهمة، ونتيجة آخر فحص لكل مفتاح</p>
        </div>
        <Link href="/admin/ai" className="rounded-lg border px-3 py-1.5 text-xs font-bold hover:bg-secondary">← إدارة المفاتيح</Link>
      </div>

      {dbError ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700">⚠️ {dbError}</div>
      ) : null}

      <form action={testAllAiKeysAction} className="flex flex-wrap items-center gap-2">
        <button className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">🔄 فحص كل المفاتيح الآن</button>
        <span className="text-[11px] text-muted-foreground">الفحص يستغرق نحو ثانيتين لكل مفتاح</span>
      </form>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="border-b bg-secondary/50">
              <th className="p-2">المهمة</th>
              <th className="p-2">المفتاح المستخدم</th>
              <th className="p-2">النموذج</th>
              <th className="p-2">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {AI_TASKS.map((t) => {
              const serving =
                active.find((k) => k.task === t.id) ??
                active.find((k) => k.task === "general") ??
                null;
              return (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="p-2 font-bold">{t.label}</td>
                  <td className="p-2">{serving ? serving.name : env ? "🛟 احتياطي متغيرات البيئة" : "—"}</td>
                  <td className="p-2 font-mono" dir="ltr">{serving ? serving.model : env ? env.model : "—"}</td>
                  <td className="p-2">
                    {serving ? statusText(serving) : env ? "🛟 يعمل عبر البيئة" : "❌ لا يوجد مفتاح"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold">تفاصيل المفاتيح ({keys.length})</h3>
        {keys.length === 0 && !dbError ? (
          <p className="text-xs text-muted-foreground">
            لا توجد مفاتيح — <Link href="/admin/ai" className="underline">أضف مفتاحًا من صفحة الإدارة</Link>
          </p>
        ) : null}
        {keys.map((k) => (
          <div key={k.id} className="rounded-xl border p-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold">{k.name}</span>
              <span>{statusText(k)}</span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">{taskLabel(k.task)}</span>
              <span className="text-[11px] text-muted-foreground">
                آخر فحص: {k.lastCheckedAt ? new Date(k.lastCheckedAt).toLocaleString("ar-DZ") : "—"}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground" dir="ltr">
              {k.model} @ {k.baseUrl}
            </div>
            {k.lastError ? (
              <div className="mt-1 rounded bg-red-50 p-2 text-[11px] text-red-700" dir="ltr">{k.lastError}</div>
            ) : null}
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground">
        {env
          ? "🛟 مفتاح احتياطي من متغيرات البيئة متوفر (" + env.model + ") — يُستخدم فقط عند غياب مفتاح مناسب"
          : "لا يوجد مفتاح في متغيرات البيئة"}
      </p>
    </div>
  );
}
