"use client";

// نموذج استيراد موضوع من صور/PDF بالذكاء الاصطناعي:
// 1) رفع الملف ← /api/ai/extract ← مسودة JSON
// 2) معاينة قابلة للتعديل (مع معاينة المعادلات) ← إضافة مباشرة

import { useState } from "react";
import { MathContent } from "@/components/math-content";
import { createAiTopicAction } from "@/app/admin/ai/actions";

type Item = { id: string; name: string; nameAr: string };

type DraftProblem = {
  problemNumber: number;
  title: string;
  difficulty: string;
  statement: string;
  solution?: string | null;
};

type Draft = {
  title?: string;
  year?: number | string;
  examType?: string;
  examNumber?: number | string | null;
  durationMinutes?: number | string | null;
  coefficient?: number | string | null;
  universityName?: string;
  specialtyName?: string;
  problems: DraftProblem[];
};

function guessId(items: Item[], name?: string): string {
  const n = (name ?? "").trim().toLowerCase();
  if (!n) return "__new__";
  const hit = items.find((it) => {
    const a = it.name.toLowerCase();
    return a.includes(n) || n.includes(a) || it.nameAr.includes(n) || n.includes(it.nameAr);
  });
  return hit ? hit.id : "__new__";
}

function normalizeProblems(raw: unknown): DraftProblem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p, i) => {
    const obj = (p ?? {}) as Record<string, unknown>;
    return {
      problemNumber: Number(obj.problemNumber) || i + 1,
      title: String(obj.title ?? "").trim() || "تمرين " + (i + 1),
      difficulty: String(obj.difficulty ?? "medium"),
      statement: String(obj.statement ?? ""),
      solution: obj.solution == null ? null : String(obj.solution),
    };
  });
}

export function AiImportForm({
  universities,
  specialties,
}: {
  universities: Item[];
  specialties: Item[];
}) {
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [showPreview, setShowPreview] = useState<Record<number, boolean>>({});

  async function handleExtract(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const pdf = fd.get("pdf") as File | null;
    const images = (fd.getAll("images") as File[]).filter((f) => f && f.size > 0);
    const hasPdf = Boolean(pdf && pdf.size > 0);

    if (!hasPdf && images.length === 0) {
      setError("اختر ملف PDF أو صورة واحدة على الأقل");
      return;
    }
    if (hasPdf && images.length > 0) {
      setError("إما ملف PDF أو صور — ليس الاثنين معًا");
      return;
    }
    if (images.length > 2) {
      setError("صورتان كحد أقصى في كل مرة");
      return;
    }
    if (hasPdf && (pdf as File).size > 3.5 * 1024 * 1024) {
      setError("حجم PDF يجب أن يكون أقل من 3.5MB");
      return;
    }
    for (const img of images) {
      if (img.size > 1.8 * 1024 * 1024) {
        setError("كل صورة يجب أن تكون أقل من 1.8MB");
        return;
      }
    }

    setReading(true);
    try {
      const res = await fetch("/api/ai/extract", { method: "POST", body: fd });
      const data = (await res.json()) as { ok: boolean; error?: string; draft?: Draft };
      if (!data.ok || !data.draft) {
        setError(data.error || "فشل الاستخراج — أعد المحاولة");
      } else {
        const d = data.draft;
        d.problems = normalizeProblems(d.problems);
        if (d.problems.length === 0) {
          setError("لم يستخرج النموذج أي تمرين — جرّب صورًا أوضح أو ملفًا أفضل");
        } else {
          setDraft(d);
          setShowPreview({});
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setReading(false);
    }
  }

  function updateProblem(index: number, patch: Partial<DraftProblem>) {
    setDraft((prev) => {
      if (!prev) return prev;
      const problems = prev.problems.map((p, i) => (i === index ? { ...p, ...patch } : p));
      return { ...prev, problems };
    });
  }

  function togglePreview(index: number) {
    setShowPreview((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  if (!draft) {
    return (
      <form onSubmit={handleExtract} className="rounded-xl border p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs">
            <span className="font-bold">ملف PDF واحد (حتى 3.5MB)</span>
            <input type="file" name="pdf" accept="application/pdf" className="w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="space-y-1 text-xs">
            <span className="font-bold">أو صور (صورتان كحد أقصى — 1.8MB لكل صورة)</span>
            <input type="file" name="images" accept="image/*" multiple className="w-full rounded-lg border px-3 py-2" />
          </label>
        </div>
        {error ? (
          <div className="mt-3 rounded-lg border border-red-300 bg-red-50 p-2 text-xs text-red-700">⚠️ {error}</div>
        ) : null}
        <button
          type="submit"
          disabled={reading}
          className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60"
        >
          {reading ? "🤖 جارٍ قراءة الاختبار… قد يستغرق دقيقة" : "🤖 قراءة الاختبار بالذكاء الاصطناعي"}
        </button>
      </form>
    );
  }

  const uniGuess = guessId(universities, draft.universityName);
  const specGuess = guessId(specialties, draft.specialtyName);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold">👁 معاينة الموضوع قبل الإضافة — عدّل ما تشاء</h3>
        <button
          type="button"
          onClick={() => {
            setDraft(null);
            setError("");
          }}
          className="rounded-lg border px-3 py-1 text-[11px] font-bold hover:bg-secondary"
        >
          🔄 قراءة ملف آخر
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-2 text-xs text-red-700">⚠️ {error}</div>
      ) : null}

      <form action={createAiTopicAction} className="space-y-4">
        <input type="hidden" name="problemsJson" value={JSON.stringify(draft.problems)} />

        <div className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
          <label className="space-y-1 text-xs sm:col-span-2">
            <span className="font-bold">عنوان الموضوع</span>
            <input name="title" defaultValue={draft.title ?? ""} className="w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="space-y-1 text-xs">
            <span className="font-bold">السنة</span>
            <input name="year" type="number" required defaultValue={String(draft.year ?? "")} className="w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="space-y-1 text-xs">
            <span className="font-bold">نوع المسابقة</span>
            <select name="examType" defaultValue={draft.examType === "specialty" ? "specialty" : "general"} className="w-full rounded-lg border px-3 py-2">
              <option value="general">عامة</option>
              <option value="specialty">تخصص</option>
            </select>
          </label>
          <label className="space-y-1 text-xs">
            <span className="font-bold">رقم الموضوع</span>
            <input name="examNumber" type="number" defaultValue={draft.examNumber == null ? "" : String(draft.examNumber)} className="w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="space-y-1 text-xs">
            <span className="font-bold">المدة (دقائق)</span>
            <input name="durationMinutes" type="number" defaultValue={draft.durationMinutes == null ? "" : String(draft.durationMinutes)} className="w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="space-y-1 text-xs">
            <span className="font-bold">المعامل</span>
            <input name="coefficient" type="number" defaultValue={draft.coefficient == null ? "" : String(draft.coefficient)} className="w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="space-y-1 text-xs">
            <span className="font-bold">الحالة</span>
            <select name="status" defaultValue="published" className="w-full rounded-lg border px-3 py-2">
              <option value="published">منشور مباشرة</option>
              <option value="draft">مسودة</option>
            </select>
          </label>
          <label className="space-y-1 text-xs">
            <span className="font-bold">الجامعة {draft.universityName ? "(اقتراح: " + draft.universityName + ")" : ""}</span>
            <select name="universityId" defaultValue={uniGuess} className="w-full rounded-lg border px-3 py-2">
              <option value="__new__">➕ جامعة جديدة (الاسم في الحقل المجاور)</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>{u.nameAr} — {u.name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs">
            <span className="font-bold">اسم الجامعة الجديدة (إن اخترت جديدة)</span>
            <input name="newUniversityName" defaultValue={draft.universityName ?? ""} className="w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="space-y-1 text-xs">
            <span className="font-bold">التخصص {draft.specialtyName ? "(اقتراح: " + draft.specialtyName + ")" : ""}</span>
            <select name="specialtyId" defaultValue={specGuess} className="w-full rounded-lg border px-3 py-2">
              <option value="__new__">➕ تخصص جديد (الاسم في الحقل المجاور)</option>
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>{s.nameAr} — {s.name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs">
            <span className="font-bold">اسم التخصص الجديد (إن اخترت جديدًا)</span>
            <input name="newSpecialtyName" defaultValue={draft.specialtyName ?? ""} className="w-full rounded-lg border px-3 py-2" />
          </label>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-bold">التمارين ({draft.problems.length})</h4>
          {draft.problems.map((p, i) => (
            <div key={i} className="rounded-xl border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold">تمرين {p.problemNumber}</span>
                <input
                  value={p.title}
                  onChange={(e) => updateProblem(i, { title: e.target.value })}
                  className="rounded-lg border px-2 py-1 text-xs"
                />
                <select
                  value={p.difficulty}
                  onChange={(e) => updateProblem(i, { difficulty: e.target.value })}
                  className="rounded-lg border px-2 py-1 text-xs"
                >
                  <option value="easy">سهل</option>
                  <option value="medium">متوسط</option>
                  <option value="hard">صعب</option>
                </select>
                <button
                  type="button"
                  onClick={() => togglePreview(i)}
                  className="rounded-lg border px-2 py-1 text-[11px] font-bold hover:bg-secondary"
                >
                  {showPreview[i] ? "📝 تحرير فقط" : "👁 معاينة المعادلات"}
                </button>
              </div>
              <textarea
                value={p.statement}
                onChange={(e) => updateProblem(i, { statement: e.target.value })}
                rows={8}
                dir="ltr"
                className="mt-2 w-full rounded-lg border px-3 py-2 font-mono text-xs"
              />
              {showPreview[i] ? (
                <div className="mt-2 rounded-lg border bg-secondary/30 p-3" dir="ltr">
                  <MathContent content={p.statement} />
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
          ✅ إضافة الموضوع الآن
        </button>
      </form>
    </div>
  );
}
