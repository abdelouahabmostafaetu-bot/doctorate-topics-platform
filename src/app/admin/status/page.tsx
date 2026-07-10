import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import {
  ensureServiceStatuses,
  SERVICE_LABELS,
  STATE_LABELS,
} from "@/lib/status";
import {
  setServiceStateAction,
  openIncidentAction,
  resolveIncidentAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminStatusPage() {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") redirect("/admin");

  const [services, incidents] = await Promise.all([
    ensureServiceStatuses(),
    prisma.incident.findMany({ orderBy: { startedAt: "desc" }, take: 20 }),
  ]);
  const activeIncidents = incidents.filter((i) => !i.resolvedAt);

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold">حالة النظام</h2>

      <div className="rounded-lg border bg-card p-5">
        <h3 className="font-semibold">حالة الخدمات</h3>
        <div className="mt-3 space-y-2">
          {services.map((s) => (
            <form
              key={s.id}
              action={setServiceStateAction}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <input type="hidden" name="key" value={s.key} />
              <span>
                {SERVICE_LABELS[s.key] ?? s.key}{" "}
                <span className="text-xs text-muted-foreground">
                  ({s.mode === "auto" ? "فحص تلقائي" : "يدوي"})
                </span>
              </span>
              <div className="flex items-center gap-2">
                <select
                  name="state"
                  defaultValue={s.state}
                  className="rounded-md border bg-background px-2 py-1 text-xs"
                >
                  {Object.entries(STATE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-md border px-3 py-1 text-xs transition hover:border-primary hover:text-primary"
                >
                  تحديث
                </button>
              </div>
            </form>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5">
        <h3 className="font-semibold">فتح عطل جديد</h3>
        <form
          action={openIncidentAction}
          className="mt-3 grid gap-3 sm:grid-cols-2"
        >
          <label className="text-sm">
            الخدمة المتأثرة
            <select
              name="serviceKey"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {Object.entries(SERVICE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            عنوان العطل
            <input
              name="titleAr"
              required
              dir="auto"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            وصف (اختياري)
            <textarea
              name="descriptionAr"
              rows={2}
              dir="auto"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            className="sm:col-span-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            فتح العطل
          </button>
        </form>
      </div>

      <div className="rounded-lg border bg-card p-5">
        <h3 className="font-semibold">
          الأعطال النشطة ({activeIncidents.length})
        </h3>
        {activeIncidents.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            لا توجد أعطال نشطة حاليًا.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {activeIncidents.map((inc) => (
              <div
                key={inc.id}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <span>{inc.titleAr}</span>
                <ConfirmActionButton
                  action={resolveIncidentAction.bind(null, inc.id)}
                  confirmText="وسيُرسل إشعار للمشتركين — تأكيد حل العلل؟"
                  label="تم الحل"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
