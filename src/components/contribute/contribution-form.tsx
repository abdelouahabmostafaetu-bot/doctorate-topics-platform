"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { MathContent } from "@/components/math-content";
import { submitContribution } from "@/app/contribute/actions";

const MAX_FILE_MB = 4;
const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.tex,.zip,.rar,.7z,.doc,.docx";
const DRAFT_KEY = "contribution-draft-v2";

type UploadedFile = {
  url: string;
  fileName: string;
  sizeBytes: number;
  contentType: string;
};

type ProblemDraft = {
  statement: string;
  solution: string;
};

type Draft = {
  kind: "latex" | "files";
  title: string;
  universityName: string;
  specialtyName: string;
  year: string;
  examType: string;
  message: string;
  problems: ProblemDraft[];
  savedAt: number;
};

const emptyProblem: ProblemDraft = { statement: "", solution: "" };

function buildLatex(problems: ProblemDraft[]): string {
  return problems
    .filter((p) => p.statement.trim() || p.solution.trim())
    .map((p, i) => {
      let block = "## Exercice " + (i + 1) + "\n\n" + p.statement.trim();
      if (p.solution.trim()) {
        block += "\n\n### Solution\n\n" + p.solution.trim();
      }
      return block;
    })
    .join("\n\n---\n\n");
}

export function ContributionForm() {
  const [kind, setKind] = useState<"latex" | "files">("latex");
  const [view, setView] = useState<"write" | "preview">("write");
  const [title, setTitle] = useState("");
  const [universityName, setUniversityName] = useState("");
  const [specialtyName, setSpecialtyName] = useState("");
  const [year, setYear] = useState("");
  const [examType, setExamType] = useState("");
  const [message, setMessage] = useState("");
  const [problems, setProblems] = useState<ProblemDraft[]>([{ ...emptyProblem }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [draftFound, setDraftFound] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingDraft = useRef<Draft | null>(null);

  // البحث عن مسودة محفوظة عند فتح الصفحة
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as Draft;
      const hasProblems =
        Array.isArray(d.problems) &&
        d.problems.some((p) => (p.statement ?? "").trim() || (p.solution ?? "").trim());
      if ((d.title && d.title.trim()) || hasProblems) {
        pendingDraft.current = d;
        setDraftFound(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // حفظ تلقائي للمسودة أثناء الكتابة
  useEffect(() => {
    if (draftFound || success) return;
    const hasContent =
      title.trim() ||
      message.trim() ||
      problems.some((p) => p.statement.trim() || p.solution.trim());
    if (!hasContent) return;
    const t = window.setTimeout(() => {
      try {
        const d: Draft = {
          kind,
          title,
          universityName,
          specialtyName,
          year,
          examType,
          message,
          problems,
          savedAt: Date.now(),
        };
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
        setSavedAt(new Date().toLocaleTimeString("ar-DZ"));
      } catch {
        /* ignore */
      }
    }, 1000);
    return () => window.clearTimeout(t);
  }, [
    kind,
    title,
    universityName,
    specialtyName,
    year,
    examType,
    message,
    problems,
    draftFound,
    success,
  ]);

  function restoreDraft() {
    const d = pendingDraft.current;
    if (d) {
      setKind(d.kind === "files" ? "files" : "latex");
      setTitle(d.title ?? "");
      setUniversityName(d.universityName ?? "");
      setSpecialtyName(d.specialtyName ?? "");
      setYear(d.year ?? "");
      setExamType(d.examType ?? "");
      setMessage(d.message ?? "");
      setProblems(
        Array.isArray(d.problems) && d.problems.length > 0
          ? d.problems.map((p) => ({
              statement: p.statement ?? "",
              solution: p.solution ?? "",
            }))
          : [{ ...emptyProblem }]
      );
    }
    setDraftFound(false);
  }

  function discardDraft() {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    pendingDraft.current = null;
    setDraftFound(false);
  }

  function resetAll() {
    setTitle("");
    setUniversityName("");
    setSpecialtyName("");
    setYear("");
    setExamType("");
    setMessage("");
    setProblems([{ ...emptyProblem }]);
    setView("write");
    setSavedAt(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }

  function updateProblem(
    index: number,
    field: "statement" | "solution",
    value: string
  ) {
    setProblems((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  }

  function addProblem() {
    setProblems((prev) => [...prev, { ...emptyProblem }]);
    setView("write");
  }

  function removeProblem(index: number) {
    setProblems((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("يرجى كتابة عنوان للمساهمة.");
      return;
    }

    setBusy(true);
    try {
      const files: UploadedFile[] = [];
      let latexContent: string | null = null;

      if (kind === "latex") {
        latexContent = buildLatex(problems);
        if (!latexContent) {
          setError("يرجى كتابة نص التمرين الأول على الأقل.");
          setBusy(false);
          return;
        }
      } else {
        const list = fileInputRef.current?.files
          ? Array.from(fileInputRef.current.files)
          : [];
        if (list.length === 0) {
          setError("يرجى اختيار ملف واحد على الأقل.");
          setBusy(false);
          return;
        }
        if (list.length > 10) {
          setError("يمكن رفع 10 ملفات كحد أقصى في المساهمة الواحدة.");
          setBusy(false);
          return;
        }
        for (const f of list) {
          if (f.size > MAX_FILE_MB * 1024 * 1024) {
            setError(
              "الملف «" +
                f.name +
                "» أكبر من " +
                MAX_FILE_MB +
                " م.ب — يرجى ضغطه بصيغة ZIP أو تقسيمه إلى أجزاء أصغر."
            );
            setBusy(false);
            return;
          }
        }
        for (const f of list) {
          const ufd = new FormData();
          ufd.append("file", f);
          const res = await fetch("/api/contributions/upload", {
            method: "POST",
            body: ufd,
          });
          const data = (await res.json()) as { url?: string; error?: string };
          if (!res.ok || !data.url) {
            setError(data.error ?? "تعذر رفع الملف: " + f.name);
            setBusy(false);
            return;
          }
          files.push({
            url: data.url,
            fileName: f.name,
            sizeBytes: f.size,
            contentType: f.type || "application/octet-stream",
          });
        }
      }

      const result = await submitContribution({
        kind,
        title: title.trim(),
        universityName: universityName.trim() || null,
        specialtyName: specialtyName.trim() || null,
        year: year.trim() ? Number(year.trim()) : null,
        examType: examType || null,
        message: message.trim() || null,
        latexContent,
        files,
      });
      if (result.error) {
        setError(result.error);
        setBusy(false);
        return;
      }
      resetAll();
      setSuccess(true);
    } catch {
      setError("حدث خطأ غير متوقع. حاول مجددًا.");
    }
    setBusy(false);
  }

  if (success) {
    return (
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-6 text-center dark:border-emerald-900 dark:bg-emerald-950">
        <p className="text-lg font-semibold text-emerald-800 dark:text-emerald-300">
          ✅ شكرًا لك! وصلت مساهمتك بنجاح.
        </p>
        <p className="mt-2 text-sm text-emerald-800/80 dark:text-emerald-300/80">
          ستراجعها الإدارة قريبًا، وتُضاف نقاطك بعد القبول.
        </p>
        <button
          type="button"
          onClick={() => setSuccess(false)}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          إرسال مساهمة أخرى
        </button>
      </div>
    );
  }

  const inputClass =
    "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm font-normal";
  const tabClass = (active: boolean) =>
    "rounded-md px-4 py-2 text-sm font-medium transition " +
    (active
      ? "bg-primary text-primary-foreground"
      : "border hover:border-primary hover:text-primary");
  const miniTabClass = (active: boolean) =>
    "rounded-md px-3 py-1 text-xs font-medium transition " +
    (active
      ? "bg-primary text-primary-foreground"
      : "border hover:border-primary hover:text-primary");

  const previewContent = buildLatex(problems);

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border bg-card p-5 shadow-sm"
    >
      {draftFound && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <span>♻️ وجدنا مسودة محفوظة من جلسة سابقة. هل تريد استعادتها؟</span>
          <span className="flex gap-2">
            <button
              type="button"
              onClick={restoreDraft}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90"
            >
              استعادة
            </button>
            <button
              type="button"
              onClick={discardDraft}
              className="rounded-md border px-3 py-1.5 text-xs transition hover:border-primary hover:text-primary"
            >
              تجاهل
            </button>
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setKind("latex")}
          className={tabClass(kind === "latex")}
        >
          ✍️ كتابة LaTeX
        </button>
        <button
          type="button"
          onClick={() => setKind("files")}
          className={tabClass(kind === "files")}
        >
          📎 رفع ملفات
        </button>
      </div>

      <label className="block text-sm font-medium">
        عنوان المساهمة *
        <input
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثال: موضوع دكتوراه جامعة البليدة 2024 — تحليل دالي"
          className={inputClass}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          الجامعة
          <input
            name="universityName"
            value={universityName}
            onChange={(e) => setUniversityName(e.target.value)}
            placeholder="مثال: جامعة البليدة 1"
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-medium">
          التخصص
          <input
            name="specialtyName"
            value={specialtyName}
            onChange={(e) => setSpecialtyName(e.target.value)}
            placeholder="مثال: تحليل دالي"
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-medium">
          السنة
          <input
            name="year"
            type="number"
            min={2000}
            max={2100}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="2026"
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-medium">
          نوع المسابقة
          <select
            name="examType"
            value={examType}
            onChange={(e) => setExamType(e.target.value)}
            className={inputClass}
          >
            <option value="">— غير محدد —</option>
            <option value="general">مسابقة عامة</option>
            <option value="specialty">مسابقة تخصص</option>
          </select>
        </label>
      </div>

      {kind === "latex" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">التمارين والحلول (LaTeX) *</span>
            <span className="flex gap-1">
              <button
                type="button"
                onClick={() => setView("write")}
                className={miniTabClass(view === "write")}
              >
                ✍️ كتابة
              </button>
              <button
                type="button"
                onClick={() => setView("preview")}
                className={miniTabClass(view === "preview")}
              >
                👁️ معاينة
              </button>
            </span>
          </div>

          {view === "write" ? (
            <>
              {problems.map((p, i) => (
                <div
                  key={i}
                  className="space-y-3 rounded-lg border bg-background/50 p-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">📝 التمرين {i + 1}</h3>
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
                  <label className="block text-sm font-medium">
                    نص التمرين *
                    <textarea
                      rows={6}
                      dir="ltr"
                      value={p.statement}
                      onChange={(e) => updateProblem(i, "statement", e.target.value)}
                      placeholder={"Soit $f : \\mathbb{R} \\to \\mathbb{R}$ une fonction..."}
                      className={inputClass + " text-left font-mono"}
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    الحل (اختياري)
                    <textarea
                      rows={6}
                      dir="ltr"
                      value={p.solution}
                      onChange={(e) => updateProblem(i, "solution", e.target.value)}
                      placeholder={"Solution :\nOn a $\\lim_{n \\to \\infty} ...$"}
                      className={inputClass + " text-left font-mono"}
                    />
                  </label>
                </div>
              ))}
              <button
                type="button"
                onClick={addProblem}
                className="w-full rounded-md border border-dashed px-4 py-2 text-sm font-medium transition hover:border-primary hover:text-primary"
              >
                ➕ إضافة التمرين {problems.length + 1}
              </button>
            </>
          ) : (
            <div className="min-h-[240px] rounded-md border bg-background px-4 py-3">
              {previewContent ? (
                <MathContent content={previewContent} className="text-sm" />
              ) : (
                <p className="text-sm text-muted-foreground">
                  لا شيء للمعاينة بعد — اكتب شيئًا في تبويب «كتابة» أولًا.
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {savedAt
              ? "💾 تُحفظ مسودتك تلقائيًا في متصفحك — آخر حفظ: " + savedAt
              : "💾 تُحفظ مسودتك تلقائيًا في متصفحك أثناء الكتابة."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            الملفات (صور، PDF، Word، TEX، ZIP، RAR، 7Z) *
            <input
              ref={fileInputRef}
              name="files"
              type="file"
              multiple
              accept={ACCEPT}
              className={inputClass}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            الحد الأقصى لكل ملف: 4 م.ب، وحتى 10 ملفات في المساهمة الواحدة. إذا
            كان ملفك أكبر، قسّمه إلى أجزاء أو اضغطه بصيغة ZIP.
          </p>
        </div>
      )}

      <label className="block text-sm font-medium">
        رسالة إضافية (اختياري)
        <textarea
          name="message"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="أي معلومات تساعدنا في المراجعة والتصنيف..."
          className={inputClass}
        />
      </label>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "جارٍ الإرسال..." : "إرسال المساهمة 🌱"}
      </button>
    </form>
  );
}
