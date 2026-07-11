"use client";

import { useState } from "react";
import Link from "next/link";
import { MathContent } from "@/components/math-content";
import { LatexEditor } from "@/components/latex-editor";

export type EditableProblem = {
  problemNumber: number;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string;
  statement: string;
  solution: string;
  remark: string;
};

function emptyProblem(n: number): EditableProblem {
  return {
    problemNumber: n,
    title: `تمرين ${n}`,
    difficulty: "medium",
    tags: "",
    statement: "",
    solution: "",
    remark: "",
  };
}

const guideLink = (
  <Link
    href="/latex-guide"
    target="_blank"
    className="text-xs text-primary underline-offset-2 hover:underline"
  >
    📖 كيف أكتب بـ LaTeX؟
  </Link>
);

export function ProblemsEditor({
  name = "problemsJson",
  initialProblems,
}: {
  name?: string;
  initialProblems: EditableProblem[];
}) {
  const [problems, setProblems] = useState<EditableProblem[]>(
    initialProblems.length ? initialProblems : [emptyProblem(1)]
  );
  const [openIndex, setOpenIndex] = useState(0);
  const [openField, setOpenField] = useState<"statement" | "solution" | "preview">("statement");

  function update(i: number, patch: Partial<EditableProblem>) {
    setProblems((prev) =>
      prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p))
    );
  }

  function addProblem() {
    setProblems((prev) => {
      setOpenIndex(prev.length);
      return [...prev, emptyProblem(prev.length + 1)];
    });
    setOpenField("statement");
  }

  function removeProblem(i: number) {
    setProblems((prev) =>
      prev
        .filter((_, idx) => idx !== i)
        .map((p, idx) => ({ ...p, problemNumber: idx + 1 }))
    );
    setOpenIndex((cur) => {
      if (cur === i) return Math.max(0, i - 1);
      if (cur > i) return cur - 1;
      return cur;
    });
    setOpenField("statement");
  }

  const inputClass = "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm";

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(problems)} />

      {problems.map((p, i) =>
        i === openIndex ? (
          <div key={i} className="space-y-3 rounded-lg border border-primary/40 bg-card p-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-semibold">
                📝 التمرين {p.problemNumber}
                {openField === "solution" ? " — الحل" : openField === "preview" ? " — معاينة" : ""}
              </h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpenField(openField === "preview" ? "statement" : "preview")}
                  className="rounded-md border px-2 py-1 text-xs transition hover:border-primary hover:text-primary"
                >
                  {openField === "preview" ? "✍️ كتابة" : "👁️ معاينة"}
                </button>
                {problems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProblem(i)}
                    className="rounded-md border border-destructive/50 px-2 py-1 text-xs text-destructive transition hover:bg-destructive/10"
                  >
                    حذف ✕
                  </button>
                )}
              </div>
            </div>

            {/* Meta fields: title, difficulty, tags */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                عنوان التمرين
                <input
                  value={p.title}
                  onChange={(e) => update(i, { title: e.target.value })}
                  dir="auto"
                  className={inputClass}
                />
              </label>
              <label className="text-sm">
                الصعوبة
                <select
                  value={p.difficulty}
                  onChange={(e) =>
                    update(i, { difficulty: e.target.value as EditableProblem["difficulty"] })
                  }
                  className={inputClass}
                >
                  <option value="easy">سهل</option>
                  <option value="medium">متوسط</option>
                  <option value="hard">صعب</option>
                </select>
              </label>
              <label className="text-sm sm:col-span-2">
                الوسوم (مفصولة بفواصل)
                <input
                  value={p.tags}
                  onChange={(e) => update(i, { tags: e.target.value })}
                  dir="auto"
                  placeholder="topologie, int\u00e9grale, eigenvalues"
                  className={inputClass}
                />
              </label>
            </div>

            {/* Step: statement → solution, or preview */}
            {openField === "preview" ? (
              <div className="rounded-md border bg-background p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">معاينة نص التمرين:</p>
                <MathContent content={p.statement || "*(\u0641\u0627\u0631\u063a)*"} className="text-sm" />
                {p.solution && (
                  <>
                    <p className="mb-2 mt-4 text-xs font-medium text-muted-foreground">معاينة الحل:</p>
                    <MathContent content={p.solution} className="text-sm" />
                  </>
                )}
              </div>
            ) : openField === "statement" ? (
              <>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">نص التمرين *</span>
                    {guideLink}
                  </div>
                  <LatexEditor
                    value={p.statement}
                    onChange={(v) => update(i, { statement: v })}
                    rows={8}
                    placeholder={"Soit $f : \\mathbb{R} \\to \\mathbb{R}$ une fonction..."}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setOpenField("solution")}
                  className="w-full rounded-md bg-secondary px-4 py-2 text-sm font-medium transition hover:opacity-90"
                >
                  إضافة الحل ←
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setOpenField("statement")}
                  className="text-xs text-primary underline-offset-2 hover:underline"
                >
                  ▴ الرجوع إلى نص التمرين
                </button>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">الحل (اختياري)</span>
                    {guideLink}
                  </div>
                  <LatexEditor
                    value={p.solution}
                    onChange={(v) => update(i, { solution: v })}
                    rows={8}
                    placeholder={"Solution :\nOn a ..."}
                  />
                </div>
                <div>
                  <span className="text-sm font-medium">ملاحظة (اختياري)</span>
                  <textarea
                    value={p.remark}
                    onChange={(e) => update(i, { remark: e.target.value })}
                    rows={2}
                    dir="ltr"
                    placeholder="Remarque..."
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 font-mono text-sm outline-none"
                  />
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => { setOpenIndex(i); setOpenField("statement"); }}
            className="flex w-full items-center justify-between gap-2 rounded-lg border bg-card px-4 py-3 text-start transition hover:border-primary"
          >
            <span className="text-sm font-semibold">📝 التمرين {p.problemNumber}</span>
            <span className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                {p.solution.trim()
                  ? "مع الحل ✅"
                  : p.statement.trim()
                  ? "بدون حل"
                  : "فارغ"}
              </span>
              <span className="text-primary">تعديل ▾</span>
            </span>
          </button>
        )
      )}

      <button
        type="button"
        onClick={addProblem}
        className="w-full rounded-md border border-dashed px-4 py-2 text-sm font-medium transition hover:border-primary hover:text-primary"
      >
        ➕ إضافة تمرين {problems.length + 1}
      </button>
    </div>
  );
}
