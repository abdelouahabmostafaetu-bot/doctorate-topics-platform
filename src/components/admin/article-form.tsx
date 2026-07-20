"use client";

import { useState, useTransition } from "react";
import { LatexEditorPane } from "@/components/latex-editor-pane";

const inputClass =
  "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const labelClass = "block text-sm font-medium mb-1";

type ArticleInitial = {
  id?: string;
  titleAr?: string;
  summary?: string;
  content?: string;
  position?: number;
  published?: boolean;
};

export function ArticleForm({
  action,
  initial,
  submitLabel = "حفظ المقال",
}: {
  action: (fd: FormData) => Promise<void>;
  initial?: ArticleInitial;
  submitLabel?: string;
}) {
  const [content, setContent] = useState(initial?.content ?? "");
  const [published, setPublished] = useState(initial?.published ?? false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-5 text-right"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        // نضيف القيم يدويًا لأنها تتحكم بها State
        fd.set("content", content);
        fd.set("published", published ? "1" : "0");
        startTransition(async () => {
          try {
            await action(fd);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes("NEXT_REDIRECT") || msg.includes("Redirect")) return;
            setError(msg || "تعذّر الحفظ");
          }
        });
      }}
    >
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          ⚠️ {error}
        </p>
      )}

      {/* عنوان المقال */}
      <div>
        <label className={labelClass}>عنوان المقال *</label>
        <input
          name="titleAr"
          defaultValue={initial?.titleAr ?? ""}
          required
          dir="rtl"
          placeholder="مثال: كيف تستعد لمسابقة الدكتوراه في الرياضيات؟"
          className={inputClass}
        />
      </div>

      {/* ملخص قصير */}
      <div>
        <label className={labelClass}>ملخص قصير (يظهر في القائمة)</label>
        <textarea
          name="summary"
          defaultValue={initial?.summary ?? ""}
          rows={2}
          dir="rtl"
          placeholder="جملة أو جملتان تصفان محتوى المقال للقارئ..."
          className={inputClass}
        />
      </div>

      {/* محتوى LaTeX */}
      <div>
        <label className={labelClass}>محتوى المقال (Markdown + LaTeX) *</label>
        <div className="rounded-md border">
          <LatexEditorPane
            value={content}
            onChange={setContent}
            rows={18}
            placeholder="اكتب محتوى المقال هنا — يمكنك استخدام Markdown وLaTeX..."
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          استخدم **غليظ** و*مائل* و$معادلة$ و$$معادلة مستقلة$$ والنقاط والأرقام.
        </p>
      </div>

      {/* خيارات إضافية */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>ترتيب الظهور (الأصغر أولاً)</label>
          <input
            name="position"
            type="number"
            defaultValue={initial?.position ?? 0}
            min={0}
            className={inputClass}
          />
        </div>

        <div className="flex items-center gap-3 pt-6">
          <button
            type="button"
            onClick={() => setPublished((p) => !p)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
              published ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                published ? "translate-x-0" : "translate-x-5"
              }`}
            />
          </button>
          <span className="text-sm font-medium">
            {published ? "✅ منشور" : "📝 مسودة"}
          </span>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "جارٍ الحفظ…" : submitLabel}
      </button>
    </form>
  );
}
