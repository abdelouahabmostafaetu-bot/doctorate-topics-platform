import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { ChangelogItemsEditor } from "@/components/admin/changelog-items-editor";
import {
  createChangelogEntryAction,
  deleteChangelogEntryAction,
} from "./actions";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  new: "🆕 جديد",
  improved: "⚡ تحسين",
  fixed: "🐛 إصلاح",
};

export default async function AdminChangelogPage() {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") redirect("/admin");

  const entries = await prisma.changelogEntry.findMany({
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold">التحديثات (جديدنا)</h2>

      <div className="rounded-lg border bg-card p-5">
        <h3 className="font-semibold">نشر تحديث جديد</h3>
        <form action={createChangelogEntryAction} className="mt-3 space-y-4">
          <label className="block text-sm">
            عنوان التحديث (مثال: تحديث الأسبوع 7)
            <input
              name="titleAr"
              required
              dir="auto"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
          <ChangelogItemsEditor />
          <button
            type="submit"
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground"
          >
            نشر
          </button>
        </form>
      </div>

      <div className="space-y-3">
        {entries.map((entry) => (
          <div key={entry.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-medium">{entry.titleAr}</h4>
              <ConfirmActionButton
                action={deleteChangelogEntryAction.bind(null, entry.id)}
                confirmText={`حذف "${entry.titleAr}"؟`}
                label="حذف"
              />
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              {entry.items.map((item, i) => (
                <li key={i}>
                  {TYPE_LABELS[item.type] ?? item.type} — {item.textAr}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              {entry.publishedAt.toLocaleDateString("ar-DZ")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
