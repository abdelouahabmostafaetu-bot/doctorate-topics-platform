"use client";

import { useRef, useState, useTransition } from "react";
import { reviewContributionAction } from "@/app/admin/contributions/actions";

export function ContributionReviewForm({
  id,
  type,
  published = false,
}: {
  id: string;
  type: "latex" | "file";
  published?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const decisionRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(decision: string) {
    setError(null);
    if (!formRef.current || !decisionRef.current) return;
    decisionRef.current.value = decision;
    const fd = new FormData(formRef.current);
    // Ensure decision is present even if hidden field race
    fd.set("decision", decision);
    fd.set("id", id);

    startTransition(async () => {
      const result = await reviewContributionAction(fd);
      if (!result?.ok) {
        setError(result?.error || "تعذر تنفيذ العملية. أعد المحاولة.");
      }
    });
  }

  return (
    <form ref={formRef} className="mt-3 space-y-2 border-t pt-3">
      <input type="hidden" name="id" value={id} />
      <input ref={decisionRef} type="hidden" name="decision" defaultValue="" />

      <label className="block text-xs">
        ملاحظة المدير (اختياري)
        <input
          name="adminNote"
          className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
        />
      </label>

      {!published && (
        <label className="block text-xs">
          النقاط
          <input
            type="number"
            name="points"
            defaultValue={type === "file" ? 20 : 100}
            min={0}
            className="mt-1 w-28 rounded-md border bg-background px-2 py-1.5 text-sm"
          />
        </label>
      )}

      {error && (
        <p className="text-sm text-destructive">⚠️ {error}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {type === "latex" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => submit("publishLatex")}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {published ? "✓ تصديق النشر" : "قبول ونشر"}
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => submit("acceptFile")}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            قبول الملف
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => submit("duplicate")}
          className="rounded-md border px-3 py-1.5 text-xs disabled:opacity-50"
        >
          مكررة
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => submit("reject")}
          className="rounded-md border border-destructive px-3 py-1.5 text-xs text-destructive disabled:opacity-50"
        >
          {published ? "رفض وحذف الموضوع" : "رفض"}
        </button>
      </div>
    </form>
  );
}
