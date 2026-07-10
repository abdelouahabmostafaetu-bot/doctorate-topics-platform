"use client";

// غلاف عام يضيف الحفظ التلقائي لأي نموذج ثابت الحقول (بلاغ، ملف شخصي، ملاحظات المشرف)
import { useEffect, useRef } from "react";
import { useAutoSave } from "@/hooks/use-auto-save";
import { SaveIndicator } from "@/components/save-indicator";
import { DraftRestoreBanner } from "@/components/draft-restore-banner";

type FieldMap = Record<string, string>;

export function AutoSaveFormWrapper({
  formId,
  isLoggedIn,
  action,
  children,
  className,
}: {
  formId: string;
  isLoggedIn: boolean;
  action: (formData: FormData) => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const { status, scheduleSave, clearDraft, restoreAvailable, dismissRestore } =
    useAutoSave<FieldMap>({ formId, isLoggedIn });

  useEffect(() => {
    const formEl = formRef.current;
    if (!formEl) return;
    function handleChange() {
      if (!formEl) return;
      const data: FieldMap = {};
      const fd = new FormData(formEl);
      for (const [key, value] of fd.entries()) {
        if (typeof value === "string") data[key] = value;
      }
      scheduleSave(data);
    }
    formEl.addEventListener("input", handleChange);
    formEl.addEventListener("change", handleChange);
    return () => {
      formEl.removeEventListener("input", handleChange);
      formEl.removeEventListener("change", handleChange);
    };
  }, [scheduleSave]);

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

  return (
    <div>
      <div className="mb-2 flex justify-end">
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
        action={async (formData) => {
          await action(formData);
          await clearDraft();
          formRef.current?.reset();
        }}
        className={className}
      >
        {children}
      </form>
    </div>
  );
}
