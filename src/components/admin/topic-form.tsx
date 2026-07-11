"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAutoSave } from "@/hooks/use-auto-save";
import { SaveIndicator } from "@/components/save-indicator";
import { DraftRestoreBanner } from "@/components/draft-restore-banner";
import {
  ProblemsEditor,
  type EditableProblem,
} from "@/components/admin/problems-editor";
import {
  durationLabelForExamType,
  durationMinutesForExamType,
} from "@/lib/exam-duration";

const NEW = "__new__";

export type TopicFieldValues = {
  title: string;
  universityId: string;
  specialtyId: string;
  year: string;
  examType: string;
  status: string;
  examNumber: string;
  coefficient: string;
  durationMinutes: string;
  source: string;
};

type Option = { id: string; label: string };

export function AdminTopicForm({
  formId,
  action,
  universities,
  specialties,
  defaultValues,
  initialProblems,
  submitLabel,
  isLoggedIn,
  hiddenId,
  titleHint,
}: {
  formId: string;
  action: (formData: FormData) => Promise<{ redirectTo?: string } | void>;
  universities: Option[];
  specialties: Option[];
  defaultValues: TopicFieldValues;
  initialProblems: EditableProblem[];
  submitLabel: string;
  isLoggedIn: boolean;
  hiddenId?: string;
  titleHint?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [examType, setExamType] = useState(defaultValues.examType || "general");
  const [universitySelect, setUniversitySelect] = useState(
    defaultValues.universityId || "",
  );
  const [specialtySelect, setSpecialtySelect] = useState(
    defaultValues.specialtyId || "",
  );
  const [universityOther, setUniversityOther] = useState("");
  const [specialtyOther, setSpecialtyOther] = useState("");
  const { status, scheduleSave, clearDraft, restoreAvailable, dismissRestore } =
    useAutoSave<Record<string, string>>({ formId, isLoggedIn });

  const inputClass =
    "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm font-normal";

  function handleFieldChange() {
    const formEl = formRef.current;
    if (!formEl) return;
    const data: Record<string, string> = {};
    const fd = new FormData(formEl);
    for (const [key, value] of fd.entries()) {
      if (typeof value === "string") data[key] = value;
    }
    data.durationMinutes = String(durationMinutesForExamType(data.examType));
    scheduleSave(data);
  }

  function restore() {
    const formEl = formRef.current;
    if (!formEl || !restoreAvailable) return;
    for (const [key, value] of Object.entries(restoreAvailable.data)) {
      const el = formEl.elements.namedItem(key);
      if (el && "value" in el) {
        (el as unknown as { value: string }).value = value;
      }
    }
    const d = restoreAvailable.data;
    setExamType(d.examType || defaultValues.examType || "general");
    setUniversitySelect(d.universityId || "");
    setSpecialtySelect(d.specialtyId || "");
    setUniversityOther(d.universityOther || "");
    setSpecialtyOther(d.specialtyOther || "");
    dismissRestore();
  }

  function handleSubmit(formData: FormData) {
    formData.set(
      "durationMinutes",
      String(
        durationMinutesForExamType(String(formData.get("examType") || "")),
      ),
    );
    // Map "new" selections for the server action.
    if (universitySelect === NEW) {
      formData.set("universityId", "");
      formData.set("universityOther", universityOther.trim());
    }
    if (specialtySelect === NEW) {
      formData.set("specialtyId", "");
      formData.set("specialtyOther", specialtyOther.trim());
    }
    startTransition(async () => {
      const result = await action(formData);
      await clearDraft();
      if (result && result.redirectTo) {
        router.push(result.redirectTo);
      }
    });
  }

  const autoMinutes = durationMinutesForExamType(examType);
  const autoLabel = durationLabelForExamType(examType);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        {titleHint ? (
          <p className="text-xs text-muted-foreground">{titleHint}</p>
        ) : (
          <span />
        )}
        <SaveIndicator status={status} />
      </div>
      {restoreAvailable && (
        <DraftRestoreBanner
          savedAt={restoreAvailable.savedAt}
          onRestore={restore}
          onDiscard={() => {
            dismissRestore();
            clearDraft();
          }}
        />
      )}
      <form
        ref={formRef}
        action={handleSubmit}
        onChange={handleFieldChange}
        className="space-y-6 rounded-lg border bg-card p-5"
      >
        {hiddenId && <input type="hidden" name="id" value={hiddenId} />}
        <input
          type="hidden"
          name="durationMinutes"
          value={String(autoMinutes)}
        />
        <input type="hidden" name="universityOther" value={universityOther} />
        <input type="hidden" name="specialtyOther" value={specialtyOther} />

        {/* Same info block style as /contribute */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            الجامعة
            <select
              name="universityId"
              value={universitySelect}
              onChange={(e) => setUniversitySelect(e.target.value)}
              required={universitySelect !== NEW}
              className={inputClass}
            >
              <option value="">— اختر الجامعة —</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
              <option value={NEW}>➕ جامعة غير موجودة في القائمة...</option>
            </select>
            {universitySelect === NEW && (
              <input
                value={universityOther}
                onChange={(e) => setUniversityOther(e.target.value)}
                required
                placeholder="اكتب اسم الجامعة الجديدة"
                className={inputClass}
              />
            )}
          </label>

          <label className="block text-sm font-medium">
            التخصص
            <select
              name="specialtyId"
              value={specialtySelect}
              onChange={(e) => setSpecialtySelect(e.target.value)}
              required={specialtySelect !== NEW}
              className={inputClass}
            >
              <option value="">— اختر التخصص —</option>
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
              <option value={NEW}>➕ تخصص غير موجود في القائمة...</option>
            </select>
            {specialtySelect === NEW && (
              <input
                value={specialtyOther}
                onChange={(e) => setSpecialtyOther(e.target.value)}
                required
                placeholder="اكتب اسم التخصص الجديد"
                className={inputClass}
              />
            )}
          </label>

          <label className="block text-sm font-medium">
            السنة
            <input
              type="number"
              name="year"
              min={2000}
              max={2100}
              defaultValue={defaultValues.year}
              required
              placeholder="2026"
              className={inputClass}
            />
          </label>

          <label className="block text-sm font-medium">
            نوع المسابقة
            <select
              name="examType"
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              className={inputClass}
            >
              <option value="general">مسابقة عامة</option>
              <option value="specialty">مسابقة تخصص</option>
            </select>
          </label>

          <div className="text-sm font-medium sm:col-span-2">
            مدة الامتحان
            <div className="mt-1 rounded-md border bg-secondary/40 px-3 py-2 text-sm font-normal">
              {autoLabel}{" "}
              <span className="text-muted-foreground">
                ({autoMinutes} دقيقة)
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                تلقائي: عامة = 1س 30د · تخصص = 3 ساعات
              </span>
            </div>
          </div>
        </div>

        {/* Admin-only extras, compact */}
        <details className="rounded-md border px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium">
            خيارات إدارية إضافية (اختياري)
          </summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium sm:col-span-2">
              عنوان الموضوع (اختياري — يُولَّد تلقائيًا إن تُرك فارغًا)
              <input
                name="title"
                defaultValue={defaultValues.title}
                dir="auto"
                className={inputClass}
              />
            </label>
            <label className="block text-sm font-medium">
              الحالة
              <select
                name="status"
                defaultValue={defaultValues.status}
                className={inputClass}
              >
                <option value="published">منشور</option>
                <option value="draft">مسودة</option>
                <option value="needs_completion">يحتاج إكمالًا</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              رقم الموضوع (اختياري)
              <input
                type="number"
                name="examNumber"
                defaultValue={defaultValues.examNumber}
                className={inputClass}
              />
            </label>
            <label className="block text-sm font-medium">
              المعامل (اختياري)
              <input
                type="number"
                name="coefficient"
                defaultValue={defaultValues.coefficient}
                className={inputClass}
              />
            </label>
            <label className="block text-sm font-medium sm:col-span-2">
              المصدر (نص حر بالفرنسية أو الإنجليزية)
              <input
                name="source"
                defaultValue={defaultValues.source}
                dir="ltr"
                className={inputClass + " text-left"}
              />
            </label>
          </div>
        </details>

        <div>
          <h3 className="mb-3 font-semibold">التمارين</h3>
          <ProblemsEditor initialProblems={initialProblems} />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50 sm:w-auto"
        >
          {pending ? "جارٍ الحفظ..." : submitLabel}
        </button>
      </form>
    </div>
  );
}
