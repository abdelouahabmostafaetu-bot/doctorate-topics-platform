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
};

const emptyProblem = (n: number): EditorProblem => ({
  problemNumber: n,
  title: `تمرين ${n}`,
  difficulty: "medium",
  tags: "",
  statement: "",
  solution: "",
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

function Toolbar({
  onInsert,
}: {
  onInsert: (before: string, after?: string) => void;
}) {
  const buttons: Array<{ label: string; before: string; after?: string }> = [
    { label: "غليظ", before: "**", after: "**" },
    { label: "مائل", before: "*", after: "*" },
    { label: "قائمة مرقمة", before: ENUM_TEMPLATE },
    { label: "جدول", before: TABLE_TEMPLATE },
    { label: "$ $", before: "$", after: "$" },
  ];
  return (
    <div className="mb-1 flex flex-wrap gap-1">
      {buttons.map((b) => (
        <button
          key={b.label}
          type="button"
          onClick={() => onInsert(b.before, b.after)}
          className="rounded border px-2 py-0.5 text-xs hover:border-primary"
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

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={json} />
      {problems.map((p, i) => {
        const tab = activeTab[i] ?? "statement";
        const isPreview = preview[i] ?? false;
        const fieldValue = tab === "statement" ? p.statement : p.solution;
        return (
          <div key={i} className="rounded-lg border bg-card">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
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
              <span className="text-muted-foreground">{open === i ? "▲" : "▼"}</span>
            </button>
            {open === i && (
              <div className="space-y-3 border-t px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab((prev) => ({ ...prev, [i]: "statement" }))}
                      className={`rounded-md px-3 py-1.5 text-sm ${
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
                      className={`rounded-md px-3 py-1.5 text-sm ${
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
                    className="rounded-md border px-3 py-1.5 text-sm hover:border-primary"
                  >
                    {isPreview ? "✏️ تحرير" : "👁 معاينة LaTeX"}
                  </button>
                </div>

                {isPreview ? (
                  <div className="min-h-24 rounded-md border bg-background px-3 py-2">
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
                      rows={tab === "statement" ? 8 : 6}
                      dir="ltr"
                      className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
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
                    className="text-sm text-destructive hover:underline"
                  >
                    حذف هذا التمرين
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => {
          const n = problems.length + 1;
          setProblems((prev) => [...prev, emptyProblem(n)]);
          setOpen(problems.length);
        }}
        className="rounded-md border px-4 py-2 text-sm hover:border-primary"
      >
        + إضافة تمرين
      </button>
    </div>
  );
}
