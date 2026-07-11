"use client";

import { useMemo, useState, useTransition } from "react";
import { ProblemsEditor, type EditorProblem } from "./problems-editor";
import { durationFromExamType } from "@/lib/exam-duration";

const NEW = "__new__";

type Option = { id: string; name: string; nameAr: string };

export function TopicForm({
  action,
  universities,
  specialties,
  initial,
  submitLabel = "حفظ الموضوع",
}: {
  action: (formData: FormData) => Promise<void>;
  universities: Option[];
  specialties: Option[];
  initial?: {
    id?: string;
    title?: string;
    universityId?: string;
    specialtyId?: string;
    year?: number;
    examType?: "general" | "specialty";
    examNumber?: number | null;
    coefficient?: number | null;
    durationMinutes?: number | null;
    status?: string;
    source?: string;
    problems?: EditorProblem[];
  };
  submitLabel?: string;
}) {
  const [universityId, setUniversityId] = useState(initial?.universityId ?? "");
  const [specialtyId, setSpecialtyId] = useState(initial?.specialtyId ?? "");
  const [examType, setExamType] = useState<"general" | "specialty">(
    initial?.examType ?? "general",
  );
  const [duration, setDuration] = useState<number>(
    initial?.durationMinutes ?? durationFromExamType(initial?.examType ?? "general"),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const yearDefault = initial?.year ?? new Date().getFullYear();

  const showNewUniversity = universityId === NEW;
  const showNewSpecialty = specialtyId === NEW;

  const statusDefault = initial?.status ?? "published";

  const durationHint = useMemo(
    () =>
      examType === "specialty"
        ? "تخصص: 3 ساعات (180 دقيقة)"
        : "عامة: 1 ساعة و 30 دقيقة (90 دقيقة)",
    [examType],
  );

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          try {
            await action(fd);
          } catch (err) {
            // redirect() throws a special error in Next.js — ignore NEXT_REDIRECT
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes("NEXT_REDIRECT") || msg.includes("Redirect")) return;
            setError(msg || "تعذر الحفظ");
          }
        });
      }}
    >
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid gap-4 rounded-lg border bg-card p-5 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">
          العنوان (اختياري — يُولَّد تلقائيًا إن تُرك فارغًا)
          <input
            name="title"
            defaultValue={initial?.title ?? ""}
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
            <option value={NEW}>+ إضافة جامعة جديدة</option>
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
            <option value={NEW}>+ إضافة تخصص جديد</option>
          </select>
        </label>

        {showNewUniversity && (
          <>
            <label className="text-sm">
              اسم الجامعة (لاتيني)
              <input
                name="newUniversityName"
                required
                dir="ltr"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              اسم الجامعة (عربي)
              <input
                name="newUniversityNameAr"
                dir="rtl"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </label>
          </>
        )}

        {showNewSpecialty && (
          <>
            <label className="text-sm">
              اسم التخصص (لاتيني)
              <input
                name="newSpecialtyName"
                required
                dir="ltr"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              اسم التخصص (عربي)
              <input
                name="newSpecialtyNameAr"
                dir="rtl"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </label>
          </>
        )}

        <label className="text-sm">
          السنة
          <input
            type="number"
            name="year"
            required
            defaultValue={yearDefault}
            min={1990}
            max={2100}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="text-sm">
          نوع المسابقة
          <select
            name="examType"
            value={examType}
            onChange={(e) => {
              const v = e.target.value as "general" | "specialty";
              setExamType(v);
              setDuration(durationFromExamType(v));
            }}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="general">مسابقة عامة</option>
            <option value="specialty">مسابقة تخصص</option>
          </select>
        </label>

        {/* رقم الموضوع والمعامل أُزيلا من الواجهة — تُمرر قيمهما الحالية فقط عند التعديل */}
        {initial?.examNumber != null && (
          <input type="hidden" name="examNumber" value={initial.examNumber} />
        )}
        {initial?.coefficient != null && (
          <input type="hidden" name="coefficient" value={initial.coefficient} />
        )}

        <label className="text-sm">
          المدة (بالدقائق)
          <input
            type="number"
            name="durationMinutes"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value, 10) || 0)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-xs text-muted-foreground">{durationHint}</span>
        </label>

        <label className="text-sm">
          الحالة
          <select
            name="status"
            defaultValue={statusDefault}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="published">منشور</option>
            <option value="draft">مسودة</option>
            <option value="needs_completion">يحتاج تكميلًا</option>
          </select>
        </label>

        <label className="text-sm sm:col-span-2">
          المصدر (نص أصلي — اختياري)
          <input
            name="source"
            defaultValue={initial?.source ?? ""}
            dir="ltr"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="rounded-lg border bg-card p-5">
        <h3 className="mb-3 font-semibold">التمارين</h3>
        <ProblemsEditor initialProblems={initial?.problems} />
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          ⚠️ {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "جاري الحفظ..." : submitLabel}
      </button>
    </form>
  );
}
