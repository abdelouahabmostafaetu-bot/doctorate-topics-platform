"use client";

// نموذج الإبلاغ عن خطأ في موضوع (FR-401 وما يتصل به)
import { useState, useTransition } from "react";
import { createReportAction } from "@/app/topics/actions";

const TYPE_LABELS: Record<string, string> = {
  wrong_content: "محتوى خاطئ",
  broken_file: "ملف معطوب",
  wrong_classification: "تصنيف خاطئ",
  other: "أخرى",
};

export function ReportForm({ topicId }: { topicId: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm text-emerald-600">
        ✓ تم إرسال بلاغك، شكرًا لمساعدتك في تحسين المنصة.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
      >
        ⚠️ الإبلاغ عن خطأ في هذا الموضوع
      </button>
    );
  }

  return (
    <form
      action={(formData) => {
        formData.set("topicId", topicId);
        startTransition(async () => {
          await createReportAction(formData);
          setDone(true);
        });
      }}
      className="space-y-3 rounded-lg border bg-card p-4"
    >
      <h3 className="text-sm font-semibold">الإبلاغ عن خطأ</h3>
      <label className="block text-sm">
        نوع المشكلة
        <select
          name="type"
          defaultValue="other"
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        رقم التمرين (اختياري)
        <input
          type="number"
          name="problemNumber"
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm">
        وصف المشكلة
        <textarea
          name="message"
          required
          rows={3}
          dir="auto"
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {pending ? "جارٍ الإرسال..." : "إرسال البلاغ"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border px-4 py-1.5 text-sm"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}
