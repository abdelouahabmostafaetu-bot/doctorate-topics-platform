"use client";

import { useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { reviewContribution } from "@/app/admin/contributions/actions";

type Option = { id: string; label: string };

export function ContributionReviewForm({
  contributionId,
  kind,
  defaultUniversityId,
  defaultSpecialtyId,
  universities,
  specialties,
}: {
  contributionId: string;
  kind: "latex" | "files";
  defaultUniversityId: string;
  defaultSpecialtyId: string;
  universities: Option[];
  specialties: Option[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const decisionRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(decision: string) {
    const form = formRef.current;
    const decisionInput = decisionRef.current;
    if (!form || !decisionInput) return;

    // Always write the decision into a hidden field before submit.
    // This is more reliable than relying only on the clicked submit button.
    decisionInput.value = decision;
    setError(null);

    if (decision === "publishLatex") {
      const uni = new FormData(form).get("universityId");
      const spec = new FormData(form).get("specialtyId");
      if (!uni || !spec) {
        setError("اختر الجامعة والتخصص قبل النشر.");
        return;
      }
    }

    const fd = new FormData(form);
    fd.set("decision", decision);
    fd.set("id", contributionId);

    startTransition(async () => {
      try {
        await reviewContribution(fd);
      } catch (err) {
        // Next.js redirect() throws; browser will navigate, so ignore it.
        const message = err instanceof Error ? err.message : "";
        if (message.includes("NEXT_REDIRECT") || message.includes("redirect")) {
          return;
        }
        // Also ignore the special redirect digest objects.
        if (
          err &&
          typeof err === "object" &&
          "digest" in err &&
          String((err as { digest?: string }).digest || "").startsWith(
            "NEXT_REDIRECT",
          )
        ) {
          return;
        }
        setError("تعذر تنفيذ العملية. أعد المحاولة.");
      }
    });
  }

  const btn =
    "rounded-md px-3 py-2 text-xs font-medium transition disabled:opacity-50";

  return (
    <form ref={formRef} className="mt-4 space-y-3 border-t pt-4">
      <input type="hidden" name="id" value={contributionId} />
      <input ref={decisionRef} type="hidden" name="decision" defaultValue="" />

      {kind === "latex" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            الجامعة للنشر *
            <select
              name="universityId"
              defaultValue={defaultUniversityId}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">— اختر الجامعة —</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            التخصص للنشر *
            <select
              name="specialtyId"
              defaultValue={defaultSpecialtyId}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">— اختر التخصص —</option>
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <label className="block max-w-xs text-sm">
          نقاط مخصصة للمستخدم
          <input
            name="customPoints"
            type="number"
            min={0}
            max={10000}
            defaultValue={10}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
      )}

      <textarea
        name="adminNotes"
        rows={2}
        placeholder="ملاحظات إدارية (اختياري)"
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
      />

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {kind === "latex" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => submit("publishLatex")}
            className={
              btn + " bg-primary text-primary-foreground hover:opacity-90"
            }
          >
            {pending ? "جارٍ التنفيذ..." : "قبول ونشر الموضوع (+10)"}
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => submit("acceptFile")}
            className={
              btn + " bg-primary text-primary-foreground hover:opacity-90"
            }
          >
            {pending ? "جارٍ التنفيذ..." : "قبول الملفات بالنقاط المحددة"}
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => submit("duplicate")}
          className={btn + " border hover:border-primary hover:text-primary"}
        >
          مكررة وحذف
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => submit("reject")}
          className={
            btn +
            " border border-destructive/50 text-destructive hover:bg-destructive/10"
          }
        >
          رفض وحذف
        </button>
      </div>
    </form>
  );
}

// Keep ReactNode import used if needed for future extensions.
export type ContributionReviewFormProps = {
  children?: ReactNode;
};
