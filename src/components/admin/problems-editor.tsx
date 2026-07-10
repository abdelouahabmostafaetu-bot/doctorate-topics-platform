"use client";

// محرّر تمارين الموضوع: إضافة/حذف/تعديل تمارين بصيغة LaTeX + معاينة مباشرة (الأسبوع 7)
import { useState } from "react";
import { MathContent } from "@/components/math-content";

export type EditableProblem = {
  problemNumber: number;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string; // مفصولة بفواصل — تُحوَّل إلى مصفوفة في الخادم
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

export function ProblemsEditor({
  name = "problemsJson",
  initialProblems,
}: {
  name?: string;
  initialProblems: EditableProblem[];
}) {
  const [problems, setProblems] = useState<EditableProblem[]>(
    initialProblems.length ? initialProblems : [emptyProblem(1)],
  );
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  function update(i: number, patch: Partial<EditableProblem>) {
    setProblems((prev) =>
      prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)),
    );
  }

  function addProblem() {
    setProblems((prev) => [...prev, emptyProblem(prev.length + 1)]);
  }

  function removeProblem(i: number) {
    setProblems((prev) =>
      prev
        .filter((_, idx) => idx !== i)
        .map((p, idx) => ({ ...p, problemNumber: idx + 1 })),
    );
    if (previewIndex === i) setPreviewIndex(null);
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name={name} value={JSON.stringify(problems)} />
      {problems.map((p, i) => (
        <div key={i} className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium">تمرين {p.problemNumber}</h4>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewIndex(previewIndex === i ? null : i)}
                className="rounded-md border px-3 py-1 text-xs transition hover:border-primary hover:text-primary"
              >
                {previewIndex === i ? "إخفاء المعاينة" : "معاينة LaTeX"}
              </button>
              {problems.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeProblem(i)}
                  className="rounded-md border border-destructive px-3 py-1 text-xs text-destructive transition hover:bg-destructive hover:text-destructive-foreground"
                >
                  حذف التمرين
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              عنوان التمرين
              <input
                value={p.title}
                onChange={(e) => update(i, { title: e.target.value })}
                dir="auto"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              الصعوبة
              <select
                value={p.difficulty}
                onChange={(e) =>
                  update(i, {
                    difficulty: e.target.value as EditableProblem["difficulty"],
                  })
                }
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
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
                placeholder="topologie, intégrale, eigenvalues"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              نص التمرين (LaTeX / Markdown)
              <textarea
                value={p.statement}
                onChange={(e) => update(i, { statement: e.target.value })}
                rows={5}
                dir="ltr"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
                placeholder={"Soit $f: \\mathbb{R} \\to \\mathbb{R}$ ..."}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              الحل (اختياري)
              <textarea
                value={p.solution}
                onChange={(e) => update(i, { solution: e.target.value })}
                rows={4}
                dir="ltr"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              ملاحظة (اختياري)
              <textarea
                value={p.remark}
                onChange={(e) => update(i, { remark: e.target.value })}
                rows={2}
                dir="ltr"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
              />
            </label>
          </div>

          {previewIndex === i && (
            <div className="mt-3 rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">
                معاينة نص التمرين:
              </p>
              <MathContent content={p.statement || "*(فارغ)*"} />
              {p.solution && (
                <>
                  <p className="mt-3 text-xs text-muted-foreground">
                    معاينة الحل:
                  </p>
                  <MathContent content={p.solution} />
                </>
              )}
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addProblem}
        className="rounded-md border px-4 py-2 text-sm transition hover:border-primary hover:text-primary"
      >
        + إضافة تمرين جديد
      </button>
    </div>
  );
}
