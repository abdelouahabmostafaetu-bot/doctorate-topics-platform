"use client";

// نموذج تحسين موضوع واحد برابطه — مع حالة انتظار أثناء عمل الذكاء الاصطناعي
import { useFormStatus } from "react-dom";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 rounded-full bg-primary px-3.5 py-1.5 text-[11px] font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "🤖 جارٍ التحسين... قد يستغرق دقيقة" : "🤖 تحسين بالذكاء الاصطناعي"}
    </button>
  );
}

export function PolishUrlForm({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="mt-2 flex flex-wrap items-center gap-2">
      <input
        type="text"
        name="url"
        required
        dir="ltr"
        placeholder="https://docmathdz.dev/topics/..."
        className="min-w-0 flex-1 rounded-md border bg-background px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none"
      />
      <SubmitBtn />
    </form>
  );
}
