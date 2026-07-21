import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import {
  addCoffeeSupportAction,
  deleteCoffeeSupportAction,
} from "./actions";

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("ar-DZ");

export default async function AdminCoffeeSupportPage() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") redirect("/admin");

  const entries = await prisma.coffeeSupport.findMany({
    orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
    include: { createdBy: { select: { name: true } } },
  });
  const total = entries.reduce((sum, entry) => sum + entry.amountDzd, 0);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">☕ سجل دعم المنصة</h2>
        <p className="mt-1 max-w-2xl text-sm leading-7 text-muted-foreground">
          سجّل هنا المبالغ التي وصلت فعليًا إلى حساب المنصة. يظهر المجموع تلقائيًا
          في صفحة «قهوة الدكتوراه». لا تسجّل وعود الدعم أو التحويلات غير المؤكدة.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-5">
          <p className="text-sm text-muted-foreground">إجمالي الدعم المؤكد</p>
          <p className="mt-2 text-3xl font-bold text-primary" dir="ltr">
            {money.format(total)} DZD
          </p>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <p className="text-sm text-muted-foreground">عدد المساهمات المسجلة</p>
          <p className="mt-2 text-3xl font-bold">{money.format(entries.length)}</p>
        </div>
      </div>

      <section className="rounded-lg border bg-card p-5">
        <h3 className="font-semibold">إضافة مبلغ مستلم</h3>
        <form action={addCoffeeSupportAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            المبلغ بالدينار الجزائري
            <input
              name="amountDzd"
              type="number"
              min="1"
              step="1"
              required
              inputMode="numeric"
              dir="ltr"
              placeholder="1000"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            تاريخ وصول المبلغ
            <input
              name="receivedAt"
              type="date"
              defaultValue={today}
              required
              dir="ltr"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            اسم الداعم (اختياري)
            <input
              name="supporterName"
              maxLength={80}
              dir="auto"
              placeholder="يظهر في قائمة الشكر إذا أُدخل"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            ملاحظة داخلية (اختيارية)
            <input
              name="note"
              maxLength={300}
              dir="auto"
              placeholder="مثال: تحويل بريدي مؤكد"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
          <p className="text-xs leading-6 text-muted-foreground sm:col-span-2">
            لحماية الخصوصية، المبلغ الفردي والملاحظة لا يظهران للزوار. يظهر فقط
            المجموع العام واسم الداعم إن اخترت تسجيله.
          </p>
          <button
            type="submit"
            className="min-h-11 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground sm:col-span-2 sm:w-fit"
          >
            تسجيل المبلغ المؤكد
          </button>
        </form>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">السجل المالي</h3>
          <span className="text-xs text-muted-foreground">{entries.length} عملية</span>
        </div>
        {entries.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">لا توجد مبالغ مسجلة بعد.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-right text-sm">
              <thead className="border-b text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-3 font-medium">التاريخ</th>
                  <th className="px-2 py-3 font-medium">المبلغ</th>
                  <th className="px-2 py-3 font-medium">الداعم</th>
                  <th className="px-2 py-3 font-medium">ملاحظة</th>
                  <th className="px-2 py-3 font-medium">سجّله</th>
                  <th className="px-2 py-3 font-medium">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-2 py-3">{entry.receivedAt.toLocaleDateString("ar-DZ")}</td>
                    <td className="px-2 py-3 font-semibold" dir="ltr">
                      {money.format(entry.amountDzd)} DZD
                    </td>
                    <td className="px-2 py-3">{entry.supporterName || "—"}</td>
                    <td className="max-w-52 truncate px-2 py-3 text-muted-foreground">
                      {entry.note || "—"}
                    </td>
                    <td className="px-2 py-3 text-muted-foreground">
                      {entry.createdBy?.name || "—"}
                    </td>
                    <td className="px-2 py-3">
                      <ConfirmActionButton
                        action={deleteCoffeeSupportAction.bind(null, entry.id)}
                        confirmText="حذف هذا السجل؟ استخدم الحذف فقط لتصحيح إدخال خاطئ."
                        label="حذف"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
