"use client";

// زر التحليل بالذكاء الاصطناعي لمجموعة مواضيع متشابهة في صفحة المكررات
import { useState, useTransition } from "react";

type Pair = {
  a: string;
  b: string;
  duplicate: boolean;
  confidence: number;
  reason: string;
};

type Result =
  | { ok: true; pairs: Pair[]; recommendation: string }
  | { ok: false; error: string };

export function AiCompareButton({
  action,
  legend,
}: {
  action: () => Promise<Result>;
  legend: Array<{ k: string; title: string }>;
}) {
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-1.5 w-full">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setResult(await action());
          })
        }
        className="rounded-full border border-primary/40 px-3 py-1 text-[11px] font-medium text-primary transition hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
      >
        {pending ? "🤖 جارٍ تحليل المجموعة..." : "🤖 تحليل بالذكاء الاصطناعي"}
      </button>

      {result && !result.ok && (
        <p className="mt-1.5 text-[11px] text-destructive">⚠️ {result.error}</p>
      )}

      {result && result.ok && (
        <div className="mt-2 rounded-lg border border-primary/25 bg-primary/5 p-2.5 text-[11px] leading-relaxed">
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
            {legend.map((l) => (
              <span key={l.k}>
                <b>{l.k}</b> = {l.title.slice(0, 60)}
              </span>
            ))}
          </div>
          <div className="mt-1.5 space-y-1">
            {result.pairs.length === 0 && (
              <p className="text-muted-foreground">
                لم يُرجع النموذج نتائج للمقارنة.
              </p>
            )}
            {result.pairs.map((p, i) => (
              <p key={i}>
                {p.duplicate ? (
                  <span className="font-bold text-red-600 dark:text-red-400">
                    🔴 {p.a} ≡ {p.b} مكرر ({p.confidence}%)
                  </span>
                ) : (
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">
                    🟢 {p.a} ≠ {p.b} مختلف ({p.confidence}%)
                  </span>
                )}{" "}
                — {p.reason}
              </p>
            ))}
          </div>
          {result.recommendation && (
            <p className="mt-1.5 border-t pt-1.5 font-medium">
              💡 {result.recommendation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
