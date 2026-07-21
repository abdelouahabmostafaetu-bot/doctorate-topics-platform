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
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">دعم المنصة</h2>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            سجّل المبالغ بعد التحقق من وصولها فعليًا. يظهر المجموع تلقائيًا في صفحة القهوة.
          </p>
        </div>
        <div className="flex gap-6 text-left" dir="ltr">
          <div>
            <p className="text-[11px] text-muted-foreground">الإجمالي</p>
            <p className="text-lg font-semibold text-primary">{money.format(total)} DZD</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">العمليات</p>
            <p className="text-lg font-semibold">{money.format(entries.length)}</p>
          </div>
        </div>
      </div>

      <form
        action={addCoffeeSupportAction}
        className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-4"
      >
        <label className="text-xs text-muted-foreground">
          المبلغ (دج)
          <input
            name="amountDzd"
            type="number"
            min="1"
            step="1"
            required
            inputMode="numeric"
            dir="ltr"
            className="mt-1 w-full rounded-md border bg-background px-2.5 py-1.5 text-sm text-foreground"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          تاريخ الوصول
          <input
            name="receivedAt"
            type="date"
            defaultValue={today}
            required
            dir="ltr"
            className="mt-1 w-full rounded-md border bg-background px-2.5 py-1.5 text-sm text-foreground"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          اسم الداعم (اختياري)
          <input
            name="supporterName"
            maxLength={80}
            dir="auto"
            className="mt-1 w-full rounded-md border bg-background px-2.5 py-1.5 text-sm text-foreground"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          ملاحظة (اختيارية)
          <input
            name="note"
            maxLength={300}
            dir="auto"
            className="mt-1 w-full rounded-md border bg-background px-2.5 py-1.5 text-sm text-foreground"
          />
        </label>
        <div className="flex items-center justify-between gap-3 sm:col-span-4">
          <p className="text-[11px] leading-5 text-muted-foreground">
            للزوار يظهر المجموع العام واسم الداعم فقط — لا تظهر المبالغ الفردية ولا الملاحظات.
          </p>
          <button
            type="submit"
            className="shrink-0 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground"
          >
            تسجيل
          </button>
        </div>
      </form>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">لا توجد مبالغ مسجلة بعد.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[600px] text-right text-xs">
            <thead className="border-b bg-muted/40 text-[11px] text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">التاريخ</th>
                <th className="px-3 py-2 font-medium">المبلغ</th>
                <th className="px-3 py-2 font-medium">الداعم</th>
                <th className="px-3 py-2 font-medium">ملاحظة</th>
                <th className="px-3 py-2 font-medium">سجّله</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {entry.receivedAt.toLocaleDateString("ar-DZ")}
                  </td>
                  <td className="px-3 py-2 font-semibold whitespace-nowrap" dir="ltr">
                    {money.format(entry.amountDzd)} DZD
                  </td>
                  <td className="px-3 py-2">{entry.supporterName || "—"}</td>
                  <td className="max-w-48 truncate px-3 py-2 text-muted-foreground">
                    {entry.note || "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {entry.createdBy?.name || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <ConfirmActionButton
                      action={deleteCoffeeSupportAction.bind(null, entry.id)}
                      confirmText="حذف هذا السجل؟ يُستخدم الحذف لتصحيح إدخال خاطئ فقط."
                      label="حذف"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
