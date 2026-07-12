"use client";

import { useMemo, useState } from "react";
import { MathContent } from "@/components/math-content";

export type EditorProblem = {
  problemNumber: number;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string;
  statement: string;
  solution: string;
  /** ملاحظة محفوظة من البيانات الأصلية — تُمرر كما هي دون تحرير */
  remark?: string | null;
};

const emptyProblem = (n: number): EditorProblem => ({
  problemNumber: n,
  title: `تمرين ${n}`,
  difficulty: "medium",
  tags: "",
  statement: "",
  solution: "",
  remark: null,
});

const TABLE_TEMPLATE = `
| العمود 1 | العمود 2 | العمود 3 |
| --- | --- | --- |
|  |  |  |
|  |  |  |
`;

const ENUM_TEMPLATE = `
1. 
2. 
3. 
`;

// شريط أدوات مُصغّر — B: bold · I: emph · قوائم · جدول · معادلة
function Toolbar({
  onInsert,
}: {
  onInsert: (before: string, after?: string) => void;
}) {
  const buttons: Array<{
    label: string;
    title: string;
    before: string;
    after?: string;
    extraClass?: string;
  }> = [
    { label: "B", title: "bold — غليظ", before: "**", after: "**", extraClass: "font-bold" },
    { label: "I", title: "emph — مائل", before: "*", after: "*", extraClass: "italic" },
    { label: "1.", title: "قائمة مرقمة", before: ENUM_TEMPLATE },
    { label: "⊞", title: "جدول", before: TABLE_TEMPLATE },
    { label: "$x$", title: "معادلة رياضية", before: "$", after: "$" },
  ];
  return (
    <div className="mb-1.5 flex flex-wrap gap-1" dir="ltr">
      {buttons.map((b) => (
        <button
          key={b.label}
          type="button"
          title={b.title}
          dir="ltr"
          onClick={() => onInsert(b.before, b.after)}
          className={`min-w-7 rounded border px-2 py-1 text-xs transition hover:border-primary hover:text-primary ${b.extraClass ?? ""}`}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}

export function ProblemsEditor({
  name = "problemsJson",
  initialProblems,
}: {
  name?: string;
  initialProblems?: EditorProblem[];
}) {
  const [problems, setProblems] = useState<EditorProblem[]>(
    initialProblems && initialProblems.length > 0
      ? initialProblems
      : [emptyProblem(1)],
  );
  const [open, setOpen] = useState(0);
  // لكل تمرين: التبويب النشط (نص التمرين أو الحل) — يُعرض واحد فقط
  const [activeTab, setActiveTab] = useState<Record<number, "statement" | "solution">>({});
  // لكل تمرين: وضع المعاينة (معاينة LaTeX بدل التحرير)
  const [preview, setPreview] = useState<Record<number, boolean>>({});

  const json = useMemo(
    () =>
      JSON.stringify(
        problems.map((p, idx) => ({
          problemNumber: idx + 1,
          title: p.title?.trim() || `تمرين ${idx + 1}`,
          difficulty: p.difficulty || "medium",
          tags: p.tags
            ? p.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : [],
          statement: p.statement,
          solution: p.solution || null,
          remark: p.remark ?? null,
          hasSolution: Boolean(p.solution.trim()),
        })),
      ),
    [problems],
  );

  function update(i: number, patch: Partial<EditorProblem>) {
    setProblems((prev) =>
      prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)),
    );
  }

  function insertAtCursor(
    i: number,
    field: "statement" | "solution",
    before: string,
    after = "",
  ) {
    const el = document.getElementById(
      `prob-${i}-${field}`,
    ) as HTMLTextAreaElement | null;
    const current = problems[i][field];
    if (!el) {
      update(i, { [field]: current + before + after });
      return;
    }
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    const next =
      current.slice(0, start) + before + current.slice(start, end) + after + current.slice(end);
    update(i, { [field]: next });
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + before.length;
      el.setSelectionRange(pos, pos);
    });
  }

  // بدون صناديق داخلية — التمارين مفصولة بخطوط داخل الصندوق الخارجي فقط
  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={json} />
      <div className="divide-y">
        {problems.map((p, i) => {
          const tab = activeTab[i] ?? "statement";
          const isPreview = preview[i] ?? false;
          const fieldValue = tab === "statement" ? p.statement : p.solution;
          return (
            <div key={i}>
              <button
                type="button"
                className="flex w-full items-center justify-between py-2 text-sm font-medium"
                onClick={() => setOpen(open === i ? -1 : i)}
              >
                <span>
                  تمرين {i + 1}
                  {!p.statement.trim() && (
                    <span className="mr-2 text-xs text-destructive">(فارغ)</span>
                  )}
                  {p.solution.trim() && (
                    <span className="mr-2 text-xs text-muted-foreground">✓ مع الحل</span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {open === i ? "▲" : "▼"}
                </span>
              </button>
              {open === i && (
                <div className="space-y-2 pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setActiveTab((prev) => ({ ...prev, [i]: "statement" }))}
                        className={`rounded px-2.5 py-1 text-xs ${
                          tab === "statement"
                            ? "bg-primary text-primary-foreground"
                            : "border"
                        }`}
                      >
                        نص التمرين
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab((prev) => ({ ...prev, [i]: "solution" }))}
                        className={`rounded px-2.5 py-1 text-xs ${
                          tab === "solution"
                            ? "bg-primary text-primary-foreground"
                            : "border"
                        }`}
                      >
                        الحل {p.solution.trim() ? "✓" : "(اختياري)"}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreview((prev) => ({ ...prev, [i]: !isPreview }))}
                      className="rounded border px-2.5 py-1 text-xs hover:border-primary"
                    >
                      {isPreview ? "✏️ تحرير" : "👁 معاينة LaTeX"}
                    </button>
                  </div>

                  {isPreview ? (
                    <div className="min-h-[220px] rounded-md bg-secondary/30 p-3">
                      {fieldValue.trim() ? (
                        <MathContent content={fieldValue} className="text-sm" />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          لا يوجد محتوى للمعاينة بعد.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <Toolbar onInsert={(b, a) => insertAtCursor(i, tab, b, a)} />
                      <textarea
                        id={`prob-${i}-${tab}`}
                        value={fieldValue}
                        onChange={(e) => update(i, { [tab]: e.target.value })}
                        rows={tab === "statement" ? 12 : 9}
                        dir="ltr"
                        className="min-h-[220px] w-full resize-y rounded-md bg-secondary/40 p-3 font-mono text-xs leading-6 focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder={
                          tab === "statement"
                            ? "اكتب نص التمرين بصيغة LaTeX..."
                            : "الحل بصيغة LaTeX (اختياري)"
                        }
                      />
                    </div>
                  )}

                  {problems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setProblems((prev) => prev.filter((_, idx) => idx !== i));
                        setOpen(Math.max(0, i - 1));
                      }}
                      className="text-xs text-destructive hover:underline"
                    >
                      حذف هذا التمرين
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => {
          const n = problems.length + 1;
          setProblems((prev) => [...prev, emptyProblem(n)]);
          setOpen(problems.length);
        }}
        className="rounded-md border px-3 py-1.5 text-xs hover:border-primary"
      >
        + إضافة تمرين
      </button>
    </div>
  );
}
