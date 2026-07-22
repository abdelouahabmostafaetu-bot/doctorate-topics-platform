import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import {
  addSiteTipAction,
  deleteSiteTipAction,
  toggleSiteTipAction,
  updateSiteTipAction,
} from "./actions";

export const dynamic = "force-dynamic";

const SEED = [
  "💡 نصيحة: حل تمرينًا واحدًا كاملًا بتركيز خير من تصفح عشرة مواضيع!",
  "🎯 جرّب موضوعًا عشوائيًا من صفحة المواضيع — المفاجأة أفضل تدريب ليوم المسابقة.",
  "📚 راجع مواضيع نفس الجامعة لثلاث سنوات متتالية — ستلاحظ نمطًا يتكرر.",
  "✨ Mathora في الصفحة الرئيسية يبحث لك عن المواضيع ويقترح تمارين — جرّبه!",
  "🧠 25 دقيقة تركيز ثم 5 دقائق راحة — طريقة Pomodoro تصنع المعجزات.",
  "📝 لخّص كل برهان تحله في ثلاثة أسطر من ذاكرتك — هذا هو الفهم الحقيقي.",
  "☕ فنجان قهوة واحد منك يُبقي هذه المنصة مجانية للجميع.",
  "🕐 المراجعة المنتظمة قبل النوم تُثبّت المعلومة أفضل — جرّب مسألة واحدة الليلة!",
];

export default async function AdminTipsPage() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") redirect("/admin");

  let tips: Array<{
    id: string;
    text: string;
    href: string | null;
    cta: string | null;
    active: boolean;
    order: number;
  }> = [];
  let dbError = "";

  try {
    tips = await prisma.siteTip.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
    if (tips.length === 0) {
      await prisma.siteTip.createMany({
        data: SEED.map((text, i) => ({
          text,
          order: i,
          active: true,
          href: i === 3 ? "/" : i === 6 ? "/coffee" : null,
          cta: i === 3 ? "Open Mathora" : i === 6 ? "قهوة دكتوراه" : null,
        })),
      });
      tips = await prisma.siteTip.findMany({
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      });
    }
  } catch {
    dbError =
      "تعذر قراءة النصائح — أضف model SiteTip ثم نفّذ: npx prisma db push";
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-base font-semibold">نصائح الشريط العلوي</h2>
        <p className="mt-1 text-xs leading-6 text-muted-foreground">
          تتحكم هنا بالنصائح التي تظهر أعلى الموقع كل 15 دقيقة. يمكنك الإضافة،
          التعديل، الإخفاء، أو الحذف. الرابط وزر الدعوة اختياريان.
        </p>
      </div>

      {dbError ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700">
          ⚠️ {dbError}
        </div>
      ) : null}

      <form
        action={addSiteTipAction}
        className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2"
      >
        <label className="text-xs text-muted-foreground sm:col-span-2">
          نص النصيحة
          <textarea
            name="text"
            required
            maxLength={280}
            rows={2}
            dir="auto"
            placeholder="💡 اكتب نصيحة جميلة…"
            className="mt-1 w-full rounded-md border bg-background px-2.5 py-1.5 text-sm text-foreground"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          رابط (اختياري)
          <input
            name="href"
            dir="ltr"
            placeholder="/coffee أو https://…"
            className="mt-1 w-full rounded-md border bg-background px-2.5 py-1.5 text-sm text-foreground"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          نص الزر (اختياري)
          <input
            name="cta"
            dir="auto"
            placeholder="افتح · قهوة دكتوراه"
            className="mt-1 w-full rounded-md border bg-background px-2.5 py-1.5 text-sm text-foreground"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          الترتيب (رقم أصغر = أولًا)
          <input
            name="order"
            type="number"
            defaultValue={0}
            dir="ltr"
            className="mt-1 w-full rounded-md border bg-background px-2.5 py-1.5 text-sm text-foreground"
          />
        </label>
        <div className="flex items-end sm:col-span-2">
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground"
          >
            ➕ إضافة نصيحة
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {tips.map((tip) => (
          <div
            key={tip.id}
            className={`rounded-lg border p-3 ${
              tip.active ? "bg-card" : "bg-secondary/40 opacity-70"
            }`}
          >
            <form
              action={updateSiteTipAction}
              className="grid gap-2 sm:grid-cols-2"
            >
              <input type="hidden" name="id" value={tip.id} />
              <label className="text-[11px] text-muted-foreground sm:col-span-2">
                النص
                <textarea
                  name="text"
                  required
                  maxLength={280}
                  rows={2}
                  dir="auto"
                  defaultValue={tip.text}
                  className="mt-1 w-full rounded-md border bg-background px-2.5 py-1.5 text-sm"
                />
              </label>
              <label className="text-[11px] text-muted-foreground">
                رابط
                <input
                  name="href"
                  dir="ltr"
                  defaultValue={tip.href ?? ""}
                  className="mt-1 w-full rounded-md border bg-background px-2.5 py-1.5 text-sm"
                />
              </label>
              <label className="text-[11px] text-muted-foreground">
                زر
                <input
                  name="cta"
                  dir="auto"
                  defaultValue={tip.cta ?? ""}
                  className="mt-1 w-full rounded-md border bg-background px-2.5 py-1.5 text-sm"
                />
              </label>
              <label className="text-[11px] text-muted-foreground">
                ترتيب
                <input
                  name="order"
                  type="number"
                  defaultValue={tip.order}
                  dir="ltr"
                  className="mt-1 w-full rounded-md border bg-background px-2.5 py-1.5 text-sm"
                />
              </label>
              <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                <button
                  type="submit"
                  className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                >
                  💾 حفظ
                </button>
                <span className="ms-auto text-[10px] text-muted-foreground">
                  {tip.active ? "✅ ظاهرة" : "⏸️ مخفية"}
                </span>
              </div>
            </form>
            <div className="mt-2 flex flex-wrap gap-2 border-t pt-2">
              <form action={toggleSiteTipAction.bind(null, tip.id)}>
                <button
                  type="submit"
                  className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                >
                  {tip.active ? "⏸️ إخفاء" : "▶️ إظهار"}
                </button>
              </form>
              <ConfirmActionButton
                action={deleteSiteTipAction.bind(null, tip.id)}
                label="🗑️ حذف"
                confirmText="هل تريد حذف هذه النصيحة نهائيًا؟"
                className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
              />
            </div>
          </div>
        ))}
        {tips.length === 0 && !dbError ? (
          <p className="text-xs text-muted-foreground">لا توجد نصائح بعد.</p>
        ) : null}
      </div>
    </div>
  );
}
