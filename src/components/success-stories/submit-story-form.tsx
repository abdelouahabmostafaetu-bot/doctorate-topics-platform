"use client";

import { useState, useTransition } from "react";

const input =
  "w-full border-b border-border bg-transparent px-0 py-2 text-xs outline-none transition placeholder:text-muted-foreground/60 focus:border-primary";
const label = "block text-[10px] font-semibold text-muted-foreground";

export function SubmitStoryForm({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form
      dir="rtl"
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const formData = new FormData(event.currentTarget);
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
      {error && <p className="text-xs text-destructive">⚠️ {error}</p>}
      <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
        <label className={label}>
          الاسم <span className="font-normal">(اختياري)</span>
          <input name="name" className={input} placeholder="يظهر إن رغبت" />
        </label>
        <label className={label}>
          البريد الإلكتروني <span className="font-normal">(اختياري)</span>
          <input name="email" type="email" className={input} />
        </label>
        <label className={label}>
          الجامعة <span className="font-normal">(اختياري)</span>
          <input name="university" className={input} />
        </label>
        <label className={label}>
          سنة النجاح{" "}
          <input
            name="year"
            type="number"
            min="2000"
            max="2100"
            className={input}
            placeholder="2025"
          />
        </label>
      </div>
      <label className={label}>
        عنوان التجربة *
        <input
          name="title"
          required
          className={input}
          placeholder="كيف وجدت طريقتي في التحضير؟"
        />
      </label>
      <label className={label}>
        ملخص قصير *
        <textarea
          name="excerpt"
          required
          rows={2}
          className={`${input} resize-none`}
          placeholder="سطران يعرّفان بتجربتك..."
        />
      </label>
      <label className={label}>
        التجربة *
        <textarea
          name="story"
          required
          rows={6}
          className={`${input} resize-y leading-6`}
          placeholder="اكتب ما واجهته، وما الذي ساعدك، وما الذي تغيّر..."
        />
      </label>
      <label className={label}>
        نصيحتك للطلبة *
        <textarea
          name="advice"
          required
          rows={2}
          className={`${input} resize-none`}
          placeholder="نصيحة عملية واحدة..."
        />
      </label>
      <div className="flex items-center justify-between border-t pt-3">
        <p className="max-w-xs text-[10px] leading-5 text-muted-foreground">
          لن تُنشر التجربة تلقائيًا؛ يراجعها الأدمن قبل النشر.
        </p>
        <button
          disabled={pending}
          className="shrink-0 rounded-full bg-primary px-4 py-2 text-[11px] font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "جارٍ الإرسال…" : "إرسال التجربة"}
        </button>
      </div>
    </form>
  );
}
