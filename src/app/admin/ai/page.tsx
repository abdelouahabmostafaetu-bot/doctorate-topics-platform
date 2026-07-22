import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AI_TASKS, taskLabel } from "@/lib/ai/tasks";
import { envProvider } from "@/lib/ai/llm";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { AiKeyForm } from "@/components/admin/ai-key-form";
import {
  deleteAiKeyAction,
  testAiKeyAction,
  toggleAiKeyAction,
} from "./actions";

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

function maskKey(k: string): string {
  if (k.length <= 10) return "••••••";
  return k.slice(0, 5) + "••••••" + k.slice(-4);
}

function StatusBadge({ k }: { k: AiKeyRow }) {
  if (!k.active) {
    return <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold">⏸️ معطّل</span>;
  }
  if (k.lastStatus === "ok") {
    return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">✅ يعمل</span>;
  }
  if (k.lastStatus === "fail") {
    return <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">❌ لا يعمل</span>;
  }
  return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">لم يُفحص</span>;
}

export default async function AiAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; added?: string }>;
}) {
  const sp = await searchParams;
  let keys: AiKeyRow[] = [];
  let dbError = "";
  try {
    keys = await prisma.aiKey.findMany({ orderBy: { createdAt: "desc" } });
  } catch {
    dbError = "تعذر قراءة المفاتيح — تأكد من تنفيذ npx prisma generate ونشر آخر نسخة";
  }
  const env = envProvider();

  return (
    <div className="space-y-5 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold">🧠 الذكاء الاصطناعي</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            أضف مفاتيح API من أي خدمة متوافقة مع صيغة OpenAI وخصص مهمة لكل مفتاح — دون تعديل الكود أو Vercel
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link href="/admin/ai/usage" className="rounded-lg border px-3 py-1.5 font-bold hover:bg-secondary">📈 استخدام المستخدمين</Link>
          <Link href="/admin/ai/status" className="rounded-lg border px-3 py-1.5 font-bold hover:bg-secondary">📊 حالة الذكاء الاصطناعي</Link>
          <Link href="/admin/ai/import" className="rounded-lg border px-3 py-1.5 font-bold hover:bg-secondary">📥 استيراد موضوع من صور/PDF</Link>
        </div>
      </div>

      {sp.error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700">⚠️ {sp.error}</div>
      ) : null}
      {sp.added === "ok" ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-700">✅ أُضيف المفتاح والفحص ناجح — جاهز للعمل</div>
      ) : null}
      {sp.added === "fail" ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-700">⚠️ أُضيف المفتاح لكن الفحص فشل — راجع سبب الخطأ في القائمة ثم اضغط 🔄 فحص بعد التصحيح</div>
      ) : null}
      {dbError ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700">⚠️ {dbError}</div>
      ) : null}

      <AiKeyForm />

      <div className="rounded-xl border p-4">
        <h3 className="text-sm font-bold">ماذا تعني المهام؟</h3>
        <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
          {AI_TASKS.map((t) => (
            <li key={t.id}>
              <span className="font-bold text-foreground">{t.label}</span> — {t.desc}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold">المفاتيح ({keys.length})</h3>
        {keys.length === 0 && !dbError ? (
          <p className="text-xs text-muted-foreground">لا توجد مفاتيح بعد — أضف أول مفتاح من النموذج أعلاه</p>
        ) : null}
        {keys.map((k) => (
          <div key={k.id} className="rounded-xl border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold">{k.name}</span>
              <StatusBadge k={k} />
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">{taskLabel(k.task)}</span>
            </div>
            <div className="mt-1.5 text-[11px] text-muted-foreground" dir="ltr">
              {k.model} @ {k.baseUrl} — {maskKey(k.apiKey)}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              آخر فحص: {k.lastCheckedAt ? new Date(k.lastCheckedAt).toLocaleString("ar-DZ") : "—"}
            </div>
            {k.lastError ? (
              <div className="mt-1 rounded bg-red-50 p-2 text-[11px] text-red-700" dir="ltr">{k.lastError}</div>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <form action={testAiKeyAction.bind(null, k.id)}>
                <button className="rounded-lg border px-3 py-1 text-[11px] font-bold hover:bg-secondary">🔄 فحص</button>
              </form>
              <form action={toggleAiKeyAction.bind(null, k.id)}>
                <button className="rounded-lg border px-3 py-1 text-[11px] font-bold hover:bg-secondary">
                  {k.active ? "⏸️ تعطيل" : "▶️ تفعيل"}
                </button>
              </form>
              <ConfirmActionButton
                action={deleteAiKeyAction.bind(null, k.id)}
                confirmText="حذف هذا المفتاح نهائيًا؟"
                label="🗑️ حذف"
                className="rounded-lg border border-red-300 px-3 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50"
              />
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground">
        {env
          ? "🛟 يوجد مفتاح احتياطي في متغيرات البيئة (MISTRAL_API_KEY) — يُستخدم فقط عندما لا يوجد مفتاح مناسب هنا"
          : "لا يوجد مفتاح في متغيرات البيئة — كل الاعتماد على المفاتيح المضافة هنا"}
      </p>
    </div>
  );
}
