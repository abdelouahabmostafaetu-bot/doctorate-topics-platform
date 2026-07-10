"use client";

// نموذج إدارة الموضوع الموحّد: بيانات وصفية + محرّر تمارين + حفظ تلقائي (الأسبوع 7)
import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAutoSave } from "@/hooks/use-auto-save";
import { SaveIndicator } from "@/components/save-indicator";
import { DraftRestoreBanner } from "@/components/draft-restore-banner";
import {
  ProblemsEditor,
  type EditableProblem,
} from "@/components/admin/problems-editor";

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
  const { status, scheduleSave, clearDraft, restoreAvailable, dismissRestore } =
    useAutoSave<Record<string, string>>({ formId, isLoggedIn });

  function handleFieldChange() {
    const formEl = formRef.current;
    if (!formEl) return;
    const data: Record<string, string> = {};
    const fd = new FormData(formEl);
    for (const [key, value] of fd.entries()) {
      if (typeof value === "string") data[key] = value;
    }
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
    dismissRestore();
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await action(formData);
      await clearDraft();
      if (result && result.redirectTo) {
        router.push(result.redirectTo);
      }
    });
  }

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

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            عنوان الموضوع (اختياري — يُولَّد تلقائيًا إن تُرك فارغًا)
            <input
              name="title"
              defaultValue={defaultValues.title}
              dir="auto"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm">
            الجامعة
            <select
              name="universityId"
              defaultValue={defaultValues.universityId}
              required
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="" disabled>
                اختر جامعة
              </option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            التخصص
            <select
              name="specialtyId"
              defaultValue={defaultValues.specialtyId}
              required
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="" disabled>
                اختر تخصصًا
              </option>
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            السنة
            <input
              type="number"
              name="year"
              defaultValue={defaultValues.year}
              required
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm">
            نوع المسابقة
            <select
              name="examType"
              defaultValue={defaultValues.examType}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="general">مسابقة عامة</option>
              <option value="specialty">مسابقة تخصص</option>
            </select>
          </label>

          <label className="text-sm">
            الحالة
            <select
              name="status"
              defaultValue={defaultValues.status}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="published">منشور</option>
              <option value="draft">مسودة</option>
              <option value="needs_completion">يحتاج إكمالًا</option>
            </select>
          </label>

          <label className="text-sm">
            رقم الموضوع (اختياري)
            <input
              type="number"
              name="examNumber"
              defaultValue={defaultValues.examNumber}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm">
            المعامل (اختياري)
            <input
              type="number"
              name="coefficient"
              defaultValue={defaultValues.coefficient}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm">
            المدة بالدقائق (اختياري)
            <input
              type="number"
              name="durationMinutes"
              defaultValue={defaultValues.durationMinutes}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm sm:col-span-2">
            المصدر (نص حر بالفرنسية أو الإنجليزية)
            <input
              name="source"
              defaultValue={defaultValues.source}
              dir="ltr"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-left text-sm"
            />
          </label>
        </div>

        <div>
          <h3 className="mb-3 font-semibold">التمارين</h3>
          <ProblemsEditor initialProblems={initialProblems} />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "جارٍ الحفظ..." : submitLabel}
        </button>
      </form>
    </div>
  );
}
