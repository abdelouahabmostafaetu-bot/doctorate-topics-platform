"use client";

// زر التحقق بالذكاء الاصطناعي لمجموعة مواضيع متشابهة — حذف تلقائي عند 100%
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Pair = {
  a: string;
  b: string;
  duplicate: boolean;
  confidence: number;
  reason: string;
};

type Result =
  | { ok: true; pairs: Pair[]; recommendation: string; autoDeleted: string[] }
  | { ok: false; error: string };

export function AiCompareButton({
  action,
  items,
}: {
  action: () => Promise<Result>;
  items: Array<{ k: string; title: string; slug: string }>;
}) {
  const router = useRouter();
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();
  const byKey = new Map(items.map((x) => [x.k, x]));

  const shownPairs =
    result && result.ok
      ? result.pairs.filter((p) => !(p.duplicate && p.confidence >= 100))
      : [];

  return (
    <div className="mt-1.5 w-full">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await action();
            setResult(r);
            if (r.ok && r.autoDeleted.length > 0) {
              router.refresh();
            }
          })
        }
        className="rounded-full border border-primary/40 px-3 py-1 text-[11px] font-medium text-primary transition hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
      >
        {pending
          ? "🤖 جارٍ التحقق من المجموعة..."
          : "🤖 تحقق بالذكاء الاصطناعي — حذف تلقائي عند تطابق 100%"}
      </button>

      {result && !result.ok && (
        <p className="mt-1.5 text-[11px] text-destructive">⚠️ {result.error}</p>
      )}

      {result && result.ok && (
        <div className="mt-2 rounded-lg border border-primary/25 bg-primary/5 p-2.5 text-[11px] leading-relaxed">
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
            {items.map((l) => (
              <span key={l.k}>
                <b>{l.k}</b> = {l.title.slice(0, 55)}
              </span>
            ))}
          </div>

          {result.autoDeleted.length > 0 && (
            <div className="mt-1.5 rounded-md bg-red-50 p-2 dark:bg-red-950/40">
              {result.autoDeleted.map((name, i) => (
                <p
                  key={i}
                  className="font-bold text-red-700 dark:text-red-300"
                >
                  🗑️ حُذف تلقائيًا (تطابق 100%): {name}
                </p>
              ))}
            </div>
          )}

          <div className="mt-1.5 space-y-1">
            {shownPairs.length === 0 && result.autoDeleted.length === 0 && (
              <p className="text-muted-foreground">
                🟢 لم يجد النموذج أي تكرار حقيقي في هذه المجموعة — اضغط «تم
                التحقق» لإخفائها.
              </p>
            )}
            {shownPairs.map((p, i) => {
              const a = byKey.get(p.a);
              const b = byKey.get(p.b);
              return (
                <div key={i} className="py-0.5">
                  {p.duplicate && p.confidence >= 90 ? (
                    <span className="font-bold text-red-600 dark:text-red-400">
                      🔴 {p.a} ≡ {p.b} مكرر ({p.confidence}%)
                    </span>
                  ) : p.duplicate ? (
                    <span className="font-medium text-amber-600 dark:text-amber-400">
                      🟠 {p.a} ≈ {p.b} مشتبه ({p.confidence}%) — تحقق بنفسك
                    </span>
                  ) : (
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">
                      🟢 {p.a} ≠ {p.b} مختلف ({p.confidence}%)
                    </span>
                  )}{" "}
                  — {p.reason}
                  {p.duplicate && a && b && (
                    <span className="ms-2 inline-flex flex-wrap gap-1.5 align-middle">
                      <Link
                        href={"/topics/" + a.slug}
                        target="_blank"
                        className="rounded-full border px-2 py-0.5 text-[10px] transition hover:border-primary hover:text-primary"
                      >
                        فتح {p.a} ↗
                      </Link>
                      <Link
                        href={"/topics/" + b.slug}
                        target="_blank"
                        className="rounded-full border px-2 py-0.5 text-[10px] transition hover:border-primary hover:text-primary"
                      >
                        فتح {p.b} ↗
                      </Link>
                    </span>
                  )}
                </div>
              );
            })}
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
