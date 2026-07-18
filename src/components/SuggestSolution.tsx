"use client";

// «اقترح حلاً» — بالمحرر الاحترافي الموحد:
// - رابط نصي صغير تحت التمارين التي لا تملك حلاً
// - محرر LaTeX كامل (شريط أدوات + رموز + قوالب + معاينة مباشرة)
// - حلول الطلبة المعتمدة تُعرض تلقائيًا بتصيير رياضي كامل

import { useEffect, useState } from "react";
import { LatexEditorPane } from "@/components/latex-editor-pane";
import { MathContent } from "@/components/math-content";

type Props = {
  topicId: string;
  problemNumber: number;
  hasSolution?: boolean;
};

type Solution = {
  id: string;
  authorName: string | null;
  contentText: string;
  createdAt: string;
};

export default function SuggestSolution({
  topicId,
  problemNumber,
  hasSolution,
}: Props) {
  const [open, setOpen] = useState(false);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (hasSolution) return;
    fetch(
      `/api/solutions?topicId=${encodeURIComponent(topicId)}&problemIndex=${problemNumber}`,
    )
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && Array.isArray(d.solutions)) setSolutions(d.solutions);
      })
      .catch(() => {});
  }, [topicId, problemNumber, hasSolution]);

  if (hasSolution) return null;

  async function submit() {
    if (text.trim().length < 20) {
      setMessage("اكتب 20 حرفاً على الأقل");
      return;
    }
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/solutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          problemIndex: problemNumber,
          authorName: author.trim() || null,
          contentText: text.trim(),
        }),
      });
      const data = await res.json();
      if (data?.ok) {
        setText("");
        setAuthor("");
        setOpen(false);
        setMessage("✓ تم الإرسال — سيُنشر بعد المراجعة");
      } else {
        setMessage("تعذّر الإرسال — حاول مجدداً");
      }
    } catch {
      setMessage("تعذّر الاتصال — تحقق من الإنترنت");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-3 space-y-3">
      {/* حلول الطلبة المعتمدة — تُعرض تلقائيًا بتصيير رياضي */}
      {solutions.map((s) => (
        <div key={s.id} className="rounded-xl border p-4">
          <p className="mb-2 text-[11px] text-muted-foreground">
            حل مقترح من {s.authorName || "طالب"}
          </p>
          <MathContent content={s.contentText} className="text-sm" />
        </div>
      ))}

      {!open && (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setMessage(null);
          }}
          className="text-sm font-medium text-primary transition hover:underline"
        >
          اقترح حلاً
        </button>
      )}

      {open && (
        <div className="space-y-3 rounded-xl border p-4">
          <LatexEditorPane
            value={text}
            rows={7}
            autoFocus
            placeholder={
              "اكتب الحل هنا...\n\nLaTeX مدعوم: $x^2 + \\frac{a}{b}$"
            }
            onChange={setText}
          />
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="اسمك (اختياري)"
            className="w-full rounded-lg border bg-muted/30 p-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={sending}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {sending ? "جارِ الإرسال..." : "إرسال"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm text-muted-foreground transition hover:underline"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}
