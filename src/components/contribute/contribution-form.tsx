"use client";

import { useState, useTransition } from "react";
import { ProblemsEditor } from "@/components/admin/problems-editor";
import { submitContributionAction } from "@/app/contribute/actions";

type Option = { id: string; name: string; nameAr: string };

export function ContributionForm({
  universities,
  specialties,
}: {
  universities: Option[];
  specialties: Option[];
}) {
  const [type, setType] = useState<"latex" | "file">("latex");
  const [universityId, setUniversityId] = useState("");
  const [specialtyId, setSpecialtyId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const uniName =
    universities.find((u) => u.id === universityId)?.nameAr ||
    universities.find((u) => u.id === universityId)?.name ||
    "";
  const specName =
    specialties.find((s) => s.id === specialtyId)?.nameAr ||
    specialties.find((s) => s.id === specialtyId)?.name ||
    "";

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        fd.set("type", type);
        fd.set("universityName", uniName);
        fd.set("specialtyName", specName);
        startTransition(async () => {
          try {
            await submitContributionAction(fd);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes("NEXT_REDIRECT") || msg.includes("Redirect")) return;
            setError(msg || "تعذر إرسال المساهمة");
          }
        });
      }}
    >
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="universityName" value={uniName} />
      <input type="hidden" name="specialtyName" value={specName} />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType("latex")}
          className={`rounded-md px-4 py-2 text-sm ${
            type === "latex"
              ? "bg-primary text-primary-foreground"
              : "border"
          }`}
        >
          كتابة بـ LaTeX
        </button>
        <button
          type="button"
          onClick={() => setType("file")}
          className={`rounded-md px-4 py-2 text-sm ${
            type === "file"
              ? "bg-primary text-primary-foreground"
              : "border"
          }`}
        >
          رفع ملف PDF
        </button>
      </div>

      <div className="grid gap-4 rounded-lg border bg-card p-5 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">
          العنوان (اختياري)
          <input
            name="title"
            dir="auto"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="text-sm">
          الجامعة
          <select
            name="universityId"
            required
            value={universityId}
            onChange={(e) => setUniversityId(e.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">— اختر —</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nameAr || u.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          التخصص
          <select
            name="specialtyId"
            required
            value={specialtyId}
            onChange={(e) => setSpecialtyId(e.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">— اختر —</option>
            {specialties.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nameAr || s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          السنة
          <input
            type="number"
            name="year"
            required
            defaultValue={new Date().getFullYear()}
            min={1990}
            max={2100}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="text-sm">
          نوع المسابقة
          <select
            name="examType"
            defaultValue="general"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="general">مسابقة عامة</option>
            <option value="specialty">مسابقة تخصص</option>
          </select>
        </label>

        <label className="text-sm">
          رقم الموضوع (اختياري)
          <input
            type="number"
            name="examNumber"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="text-sm">
          المعامل (اختياري)
          <input
            type="number"
            name="coefficient"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
      </div>

      {type === "latex" ? (
        <div className="rounded-lg border bg-card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">التمارين (LaTeX)</h3>
            <a
              href="/latex-guide"
              className="text-sm text-primary hover:underline"
            >
              📖 كيف أكتب بـ LaTeX؟
            </a>
          </div>
          <ProblemsEditor />
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-5">
          <label className="text-sm font-medium">
            ملف PDF
            <input
              type="file"
              name="file"
              accept="application/pdf"
              required={type === "file"}
              className="mt-2 block w-full text-sm"
            />
          </label>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          ⚠️ {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {pending ? "جاري الإرسال..." : "إرسال المساهمة"}
      </button>
    </form>
  );
}
