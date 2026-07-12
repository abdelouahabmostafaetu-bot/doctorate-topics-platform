"use client";

// نموذج الموضوع — بنفس أسلوب نموذج صفحة ساهم معنا (حقول بخط سفلي بدون صناديق)
import { useMemo, useState, useTransition } from "react";
import { ProblemsEditor, type EditorProblem } from "./problems-editor";
import { durationFromExamType } from "@/lib/exam-duration";

const NEW = "__new__";

type Option = { id: string; name: string; nameAr: string };

const fieldClass =
  "w-full border-0 border-b border-border bg-transparent px-0 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-0";
const labelClass = "mb-1 block text-xs font-medium text-muted-foreground";

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
    initial?.durationMinutes ??
      durationFromExamType(initial?.examType ?? "general"),
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
            // redirect() يرمي خطأ خاصًا في Next.js — نتجاهل NEXT_REDIRECT
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes("NEXT_REDIRECT") || msg.includes("Redirect"))
              return;
            setError(msg || "تعذر الحفظ");
          }
        });
      }}
    >
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      {/* بيانات المسابقة — بدون صندوق */}
      <section>
        <h3 className="text-sm font-bold">📋 بيانات المسابقة</h3>
        <div className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>
              العنوان (اختياري — يُولّد تلقائيًا إن تُرك فارغًا)
            </label>
            <input
              name="title"
              defaultValue={initial?.title ?? ""}
              dir="auto"
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>الجامعة</label>
            <select
              name="universityId"
              required
              value={universityId}
              onChange={(e) => setUniversityId(e.target.value)}
              className={fieldClass}
            >
              <option value="">— اختر —</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nameAr || u.name}
                </option>
              ))}
              <option value={NEW}>➕ إضافة جامعة جديدة</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>التخصص</label>
            <select
              name="specialtyId"
              required
              value={specialtyId}
              onChange={(e) => setSpecialtyId(e.target.value)}
              className={fieldClass}
            >
              <option value="">— اختر —</option>
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nameAr || s.name}
                </option>
              ))}
              <option value={NEW}>➕ إضافة تخصص جديد</option>
            </select>
          </div>

          {showNewUniversity && (
            <>
              <div>
                <label className={labelClass}>اسم الجامعة (لاتيني)</label>
                <input
                  name="newUniversityName"
                  required
                  dir="ltr"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>اسم الجامعة (عربي)</label>
                <input
                  name="newUniversityNameAr"
                  dir="rtl"
                  className={fieldClass}
                />
              </div>
            </>
          )}

          {showNewSpecialty && (
            <>
              <div>
                <label className={labelClass}>اسم التخصص (لاتيني)</label>
                <input
                  name="newSpecialtyName"
                  required
                  dir="ltr"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>اسم التخصص (عربي)</label>
                <input
                  name="newSpecialtyNameAr"
                  dir="rtl"
                  className={fieldClass}
                />
              </div>
            </>
          )}

          <div>
            <label className={labelClass}>السنة</label>
            <input
              type="number"
              name="year"
              required
              defaultValue={yearDefault}
              min={1990}
              max={2100}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>نوع المسابقة</label>
            <select
              name="examType"
              value={examType}
              onChange={(e) => {
                const v = e.target.value as "general" | "specialty";
                setExamType(v);
                setDuration(durationFromExamType(v));
              }}
              className={fieldClass}
            >
              <option value="general">مسابقة عامة</option>
              <option value="specialty">مسابقة تخصص</option>
            </select>
          </div>

          {/* رقم الموضوع والمعامل — تُمرر قيمهما الحالية فقط عند التعديل */}
          {initial?.examNumber != null && (
            <input type="hidden" name="examNumber" value={initial.examNumber} />
          )}
          {initial?.coefficient != null && (
            <input
              type="hidden"
              name="coefficient"
              value={initial.coefficient}
            />
          )}

          <div>
            <label className={labelClass}>المدة (بالدقائق)</label>
            <input
              type="number"
              name="durationMinutes"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value, 10) || 0)}
              className={fieldClass}
            />
            <span className="mt-1 block text-[10px] text-muted-foreground">
              {durationHint}
            </span>
          </div>

          <div>
            <label className={labelClass}>الحالة</label>
            <select
              name="status"
              defaultValue={statusDefault}
              className={fieldClass}
            >
              <option value="published">✅ منشور</option>
              <option value="draft">📝 مسودة</option>
              <option value="needs_completion">⛳ يحتاج تكميلًا</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>المصدر (نص أصلي — اختياري)</label>
            <input
              name="source"
              defaultValue={initial?.source ?? ""}
              dir="ltr"
              className={fieldClass}
            />
          </div>
        </div>
      </section>

      <div className="h-px bg-gradient-to-l from-primary/40 via-border to-transparent" />

      {/* التمارين — نفس محرر صفحة المساهمة */}
      <section>
        <h3 className="text-sm font-bold">∑ التمارين</h3>
        <div className="mt-3">
          <ProblemsEditor initialProblems={initial?.problems} />
        </div>
      </section>

      {error && (
        <div className="border-s-2 border-destructive ps-3 text-xs text-destructive">
          ⚠️ {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "جاري الحفظ..." : submitLabel}
      </button>
    </form>
  );
}
