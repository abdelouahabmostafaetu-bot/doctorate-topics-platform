"use client";

import { useEffect, useMemo, useState } from "react";
import { LatexEditorPane } from "@/components/latex-editor-pane";

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

const DIFFICULTY_META: Record<
  EditorProblem["difficulty"],
  { label: string; cls: string }
> = {
  easy: { label: "سهل", cls: "text-emerald-600" },
  medium: { label: "متوسط", cls: "text-amber-600" },
  hard: { label: "صعب", cls: "text-rose-600" },
};

const DRAFT_KEY = "docmath-contribution-draft";
const metaField =
  "w-full border-0 border-b border-border bg-transparent px-0 py-1 text-sm focus:border-primary focus:outline-none focus:ring-0";
const metaLabel = "mb-1 block text-[11px] font-medium text-muted-foreground";

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
  // لكل تمرين: التبويب النشط (نص التمرين أو الحل)
  const [activeTab, setActiveTab] = useState<
    Record<number, "statement" | "solution">
  >({});
  const [draftRestored, setDraftRestored] = useState(false);

  // الحفظ التلقائي كمسودة في المتصفح — فقط في نموذج المساهمة (بدون بيانات أولية)
  const enableDraft = !initialProblems || initialProblems.length === 0;

  useEffect(() => {
    if (!enableDraft) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as EditorProblem[];
      if (
        Array.isArray(parsed) &&
        parsed.some(
          (p) => (p.statement || "").trim() || (p.solution || "").trim(),
        )
      ) {
        setProblems(parsed.map((p, i) => ({ ...emptyProblem(i + 1), ...p })));
        setDraftRestored(true);
      }
    } catch {
      // تجاهل المسودة التالفة
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!enableDraft) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(problems));
      } catch {
        // مساحة التخزين ممتلئة — نتجاهل
      }
    }, 800);
    return () => clearTimeout(t);
  }, [problems, enableDraft]);

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    setProblems([emptyProblem(1)]);
    setActiveTab({});
    setOpen(0);
    setDraftRestored(false);
  }

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

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= problems.length) return;
    setProblems((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setOpen(j);
  }

  function duplicate(i: number) {
    setProblems((prev) => [
      ...prev.slice(0, i + 1),
      { ...prev[i] },
      ...prev.slice(i + 1),
    ]);
    setOpen(i + 1);
  }

  // بدون صناديق — التمارين مفصولة بخطوط رفيعة فقط
  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={json} />

      {draftRestored && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
          <span>📝 استعدنا مسودتك المحفوظة تلقائيًا من هذا المتصفح.</span>
          <button
            type="button"
            onClick={clearDraft}
            className="text-destructive hover:underline"
          >
            مسح المسودة والبدء من جديد
          </button>
        </div>
      )}

      <div className="divide-y">
        {problems.map((p, i) => {
          const tab = activeTab[i] ?? "statement";
          const fieldValue = tab === "statement" ? p.statement : p.solution;
          const diff = DIFFICULTY_META[p.difficulty] ?? DIFFICULTY_META.medium;
          return (
            <div key={i}>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="flex flex-1 items-center justify-between py-2 text-sm font-medium"
                  onClick={() => setOpen(open === i ? -1 : i)}
                >
                  <span>
                    {p.title?.trim() || `تمرين ${i + 1}`}
                    <span className={`mr-2 text-xs ${diff.cls}`}>
                      ● {diff.label}
                    </span>
                    {!p.statement.trim() && (
                      <span className="mr-2 text-xs text-destructive">
                        (فارغ)
                      </span>
                    )}
                    {p.solution.trim() && (
                      <span className="mr-2 text-xs text-muted-foreground">
                        ✓ مع الحل
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {open === i ? "▲" : "▼"}
                  </span>
                </button>
                {problems.length > 1 && (
                  <span className="flex shrink-0 gap-0.5">
                    <button
                      type="button"
                      title="نقل لأعلى"
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                      className="rounded px-1 text-xs text-muted-foreground transition hover:text-primary disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      title="نقل لأسفل"
                      disabled={i === problems.length - 1}
                      onClick={() => move(i, 1)}
                      className="rounded px-1 text-xs text-muted-foreground transition hover:text-primary disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </span>
                )}
              </div>

              {open === i && (
                <div className="space-y-3 pb-4">
                  {/* بيانات التمرين */}
                  <div className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
                    <div>
                      <label className={metaLabel}>عنوان التمرين</label>
                      <input
                        value={p.title}
                        onChange={(e) => update(i, { title: e.target.value })}
                        dir="auto"
                        className={metaField}
                      />
                    </div>
                    <div>
                      <label className={metaLabel}>مستوى الصعوبة</label>
                      <select
                        value={p.difficulty}
                        onChange={(e) =>
                          update(i, {
                            difficulty: e.target
                              .value as EditorProblem["difficulty"],
                          })
                        }
                        className={metaField}
                      >
                        <option value="easy">سهل</option>
                        <option value="medium">متوسط</option>
                        <option value="hard">صعب</option>
                      </select>
                    </div>
                    <div>
                      <label className={metaLabel}>
                        وسوم (افصل بينها بفاصلة)
                      </label>
                      <input
                        value={p.tags}
                        onChange={(e) => update(i, { tags: e.target.value })}
                        dir="auto"
                        placeholder="جبر, تحليل, احتمالات"
                        className={metaField}
                      />
                    </div>
                  </div>

                  {/* تبويبا النص والحل */}
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveTab((prev) => ({ ...prev, [i]: "statement" }))
                      }
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
                      onClick={() =>
                        setActiveTab((prev) => ({ ...prev, [i]: "solution" }))
                      }
                      className={`rounded px-2.5 py-1 text-xs ${
                        tab === "solution"
                          ? "bg-primary text-primary-foreground"
                          : "border"
                      }`}
                    >
                      الحل {p.solution.trim() ? "✓" : "(اختياري)"}
                    </button>
                  </div>

                  <LatexEditorPane
                    id={`prob-${i}-${tab}`}
                    value={fieldValue}
                    rows={tab === "statement" ? 10 : 8}
                    placeholder={
                      tab === "statement"
                        ? "اكتب نص التمرين بصيغة LaTeX..."
                        : "الحل بصيغة LaTeX (اختياري)"
                    }
                    onChange={(v) => update(i, { [tab]: v })}
                  />

                  <div className="flex flex-wrap gap-4">
                    <button
                      type="button"
                      onClick={() => duplicate(i)}
                      className="text-xs text-muted-foreground transition hover:text-primary"
                    >
                      ⧉ نسخ هذا التمرين
                    </button>
                    {problems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setProblems((prev) =>
                            prev.filter((_, idx) => idx !== i),
                          );
                          setOpen(Math.max(0, i - 1));
                        }}
                        className="text-xs text-destructive hover:underline"
                      >
                        حذف هذا التمرين
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
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
        {enableDraft && (
          <p className="text-[11px] text-muted-foreground">
            💾 تُحفظ كتابتك تلقائيًا كمسودة في متصفحك
          </p>
        )}
      </div>
    </div>
  );
}
