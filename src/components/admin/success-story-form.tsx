"use client";

import { useState, useTransition } from "react";

const inputClass =
  "w-full border-b border-border bg-transparent px-0 py-2 text-xs outline-none transition placeholder:text-muted-foreground/65 focus:border-primary";
const labelClass = "block text-[10px] font-semibold text-muted-foreground";

type StoryInitial = {
  id?: string;
  name?: string | null;
  university?: string | null;
  year?: number | null;
  title?: string;
  excerpt?: string;
  story?: string;
  advice?: string;
  position?: number;
  published?: boolean;
};

export function SuccessStoryForm({
  action,
  initial,
  submitLabel = "حفظ",
}: {
  action: (formData: FormData) => Promise<void>;
  initial?: StoryInitial;
  submitLabel?: string;
}) {
  const [published, setPublished] = useState(initial?.published ?? false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      dir="rtl"
      className="max-w-2xl space-y-4 text-right"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const formData = new FormData(event.currentTarget);
        formData.set("published", published ? "1" : "0");
        startTransition(async () => {
          try {
            await action(formData);
          } catch (cause) {
            const message =
              cause instanceof Error ? cause.message : String(cause);
            if (!message.includes("NEXT_REDIRECT")) setError(message);
          }
        });
      }}
    >
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      {error && <p className="text-xs text-destructive">⚠️ {error}</p>}

      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
        <label className={labelClass}>
          الاسم <span className="font-normal">(اختياري)</span>
          <input
            name="name"
            defaultValue={initial?.name ?? ""}
            className={inputClass}
            placeholder="يظهر إن كتبته"
          />
        </label>
        <label className={labelClass}>
          الجامعة <span className="font-normal">(اختياري)</span>
          <input
            name="university"
            defaultValue={initial?.university ?? ""}
            className={inputClass}
            placeholder="جامعة الجزائر 1"
          />
        </label>
        <label className={labelClass}>
          سنة النجاح
          <input
            name="year"
            type="number"
            min="2000"
            max="2100"
            defaultValue={initial?.year ?? ""}
            className={inputClass}
            placeholder="2025"
          />
        </label>
      </div>

      <label className={labelClass}>
        عنوان التجربة *
        <input
          name="title"
          required
          defaultValue={initial?.title ?? ""}
          className={inputClass}
          placeholder="من التردد إلى النجاح في المسابقة"
        />
      </label>
      <label className={labelClass}>
        ملخص قصير *
        <textarea
          name="excerpt"
          required
          rows={2}
          defaultValue={initial?.excerpt ?? ""}
          className={`${inputClass} resize-none`}
          placeholder="سطران فقط يعرّفان بالتجربة..."
        />
      </label>
      <label className={labelClass}>
        التجربة *
        <textarea
          name="story"
          required
          rows={6}
          defaultValue={initial?.story ?? ""}
          className={`${inputClass} resize-y leading-6`}
          placeholder="اكتب القصة والتحديات وما الذي صنع الفرق..."
        />
      </label>
      <label className={labelClass}>
        النصيحة الذهبية *
        <textarea
          name="advice"
          required
          rows={2}
          defaultValue={initial?.advice ?? ""}
          className={`${inputClass} resize-none`}
          placeholder="نصيحة عملية واحدة للطلبة..."
        />
      </label>

      <div className="flex items-center justify-between border-t pt-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPublished((value) => !value)}
            className={`relative inline-flex h-5 w-9 rounded-full transition ${published ? "bg-primary" : "bg-muted"}`}
            aria-label="تبديل حالة النشر"
          >
            <span
              className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${published ? "translate-x-0.5" : "translate-x-4"}`}
            />
          </button>
          <span className="text-[11px] text-muted-foreground">
            {published ? "منشورة" : "مسودة"}
          </span>
        </div>
        <input
          name="position"
          type="hidden"
          defaultValue={initial?.position ?? 0}
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "جارٍ الحفظ…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
