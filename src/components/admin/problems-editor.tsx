"use client";

import { useMemo, useState } from "react";

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

function Toolbar({
  onInsert,
}: {
  onInsert: (before: string, after?: string) => void;
}) {
  const buttons: Array<{ label: string; before: string; after?: string }> = [
    { label: "x²", before: "$x^2$" },
    { label: "√", before: "$\\sqrt{}$" },
    { label: "∫", before: "$\\int$" },
    { label: "∑", before: "$\\sum$" },
    { label: "frac", before: "$\\frac{", after: "}{}$" },
    { label: "$$", before: "\n$$\n", after: "\n$$\n" },
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

  const json = useMemo(
    () =>
      JSON.stringify(
        problems.map((p) => ({
          problemNumber: p.problemNumber,
          title: p.title,
          difficulty: p.difficulty,
          tags: p.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
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
      {problems.map((p, i) => (
        <div key={i} className="rounded-lg border bg-card">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
            onClick={() => setOpen(open === i ? -1 : i)}
          >
            <span>
              {p.title || `تمرين ${p.problemNumber}`}
              {!p.statement.trim() && (
                <span className="mr-2 text-xs text-destructive">(فارغ)</span>
              )}
            </span>
            <span className="text-muted-foreground">{open === i ? "▲" : "▼"}</span>
          </button>
          {open === i && (
            <div className="space-y-3 border-t px-4 py-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-sm">
                  الرقم
                  <input
                    type="number"
                    value={p.problemNumber}
                    onChange={(e) =>
                      update(i, {
                        problemNumber: parseInt(e.target.value, 10) || i + 1,
                      })
                    }
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm sm:col-span-2">
                  العنوان
                  <input
                    value={p.title}
                    onChange={(e) => update(i, { title: e.target.value })}
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm">
                  الصعوبة
                  <select
                    value={p.difficulty}
                    onChange={(e) =>
                      update(i, {
                        difficulty: e.target.value as EditorProblem["difficulty"],
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
                  الوسوم (مفصولة بفاصلة)
                  <input
                    value={p.tags}
                    onChange={(e) => update(i, { tags: e.target.value })}
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    dir="ltr"
                  />
                </label>
              </div>

              <div>
                <div className="mb-1 text-sm font-medium">نص التمرين (LaTeX)</div>
                <Toolbar onInsert={(b, a) => insertAtCursor(i, "statement", b, a)} />
                <textarea
                  id={`prob-${i}-statement`}
                  value={p.statement}
                  onChange={(e) => update(i, { statement: e.target.value })}
                  rows={8}
                  dir="ltr"
                  className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
                  placeholder="اكتب نص التمرين بصيغة LaTeX..."
                />
              </div>

              <div>
                <div className="mb-1 text-sm font-medium">الحل (اختياري)</div>
                <Toolbar onInsert={(b, a) => insertAtCursor(i, "solution", b, a)} />
                <textarea
                  id={`prob-${i}-solution`}
                  value={p.solution}
                  onChange={(e) => update(i, { solution: e.target.value })}
                  rows={5}
                  dir="ltr"
                  className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
                  placeholder="الحل بصيغة LaTeX (اختياري)"
                />
              </div>

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
      ))}

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
