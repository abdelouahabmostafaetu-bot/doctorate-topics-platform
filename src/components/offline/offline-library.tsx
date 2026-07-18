"use client";

// مكتبة القراءة بدون إنترنت:
// - زر واحد يحمّل كل المواضيع المنشورة إلى جهاز المستخدم (IndexedDB)
// - القراءة والبحث يعملان بعدها بدون أي اتصال، بعرض KaTeX كامل

import { useEffect, useMemo, useState } from "react";
import { MathContent } from "@/components/math-content";
import {
  deleteLibrary,
  loadLibrary,
  saveLibrary,
  type OfflineLibraryData,
  type OfflineTopic,
} from "@/lib/offline-library";

const DIFFICULTY_META: Record<string, { label: string; cls: string }> = {
  easy: { label: "سهل", cls: "text-emerald-600" },
  medium: { label: "متوسط", cls: "text-amber-600" },
  hard: { label: "صعب", cls: "text-rose-600" },
};

function TopicReader({ topic }: { topic: OfflineTopic }) {
  return (
    <div className="space-y-4 border-t px-4 pb-5 pt-4">
      <p className="text-xs text-muted-foreground">
        🏛️ {topic.university.nameAr || topic.university.name} · 🎓{" "}
        {topic.specialty.nameAr || topic.specialty.name} · 📅 {topic.year}
        {topic.durationMinutes ? ` · ⏱️ ${topic.durationMinutes} د` : ""}
      </p>
      {[...topic.problems]
        .sort((a, b) => a.problemNumber - b.problemNumber)
        .map((p) => {
          const diff = DIFFICULTY_META[p.difficulty] ?? DIFFICULTY_META.medium;
          return (
            <div key={p.problemNumber} className="rounded-xl border p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">
                  {p.title || `تمرين ${p.problemNumber}`}
                </h3>
                <span className={`text-xs ${diff.cls}`}>● {diff.label}</span>
                {p.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <MathContent content={p.statement} className="text-sm" />
              {p.remark && (
                <p className="mt-3 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                  💡 {p.remark}
                </p>
              )}
              {p.solution && (
                <details className="mt-3">
                  <summary className="cursor-pointer select-none text-sm font-semibold text-primary">
                    ✓ عرض الحل
                  </summary>
                  <div className="mt-2 rounded-md border border-primary/20 bg-primary/5 p-3">
                    <MathContent content={p.solution} className="text-sm" />
                  </div>
                </details>
              )}
            </div>
          );
        })}
    </div>
  );
}

export function OfflineLibraryView() {
  const [lib, setLib] = useState<OfflineLibraryData | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  useEffect(() => {
    loadLibrary()
      .then((saved) => setLib(saved))
      .catch(() => {
        // IndexedDB غير متاح — نعرض زر التحميل فقط
      })
      .finally(() => setReady(true));
  }, []);

  async function download() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/offline-export");
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error("export failed");
      const next: OfflineLibraryData = {
        savedAt: new Date().toISOString(),
        count: data.count,
        topics: data.topics,
      };
      await saveLibrary(next);
      setLib(next);
      setMessage("✓ حُفظت المكتبة — يمكنك الآن القراءة بدون إنترنت");
    } catch {
      setMessage("تعذّر التحميل — تحقق من اتصالك بالإنترنت وحاول مجددًا");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    try {
      await deleteLibrary();
    } catch {
      // تجاهل
    }
    setLib(null);
    setOpenSlug(null);
    setMessage("حُذفت المكتبة من هذا الجهاز");
  }

  const filtered = useMemo(() => {
    if (!lib) return [];
    const list = [...lib.topics].sort(
      (a, b) => b.year - a.year || (a.examNumber ?? 0) - (b.examNumber ?? 0),
    );
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((t) =>
      [
        t.title,
        t.university?.name,
        t.university?.nameAr,
        t.specialty?.name,
        t.specialty?.nameAr,
        String(t.year),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [lib, query]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="text-center">
        <span className="text-5xl">📖</span>
        <h1 className="mt-3 text-2xl font-bold">مكتبة بدون إنترنت</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          حمّل كل المواضيع مرة واحدة إلى جهازك، ثم راجعها في أي وقت وأي مكان —
          حتى بدون أي اتصال.
        </p>
      </div>

      {!ready ? (
        <div className="mt-8 h-24 animate-pulse rounded-2xl bg-muted" />
      ) : !lib ? (
        <div className="mt-8 rounded-2xl border p-6 text-center">
          <button
            type="button"
            onClick={download}
            disabled={busy}
            className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "… جارٍ التحميل" : "⬇️ حفظ كل المواضيع على هذا الجهاز"}
          </button>
          <p className="mt-3 text-xs text-muted-foreground">
            تحتاج الإنترنت لهذه الخطوة مرة واحدة فقط
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm dark:border-emerald-800 dark:bg-emerald-950">
            <p className="text-emerald-700 dark:text-emerald-300">
              ✓ {lib.count} موضوعًا محفوظًا — متاح بدون إنترنت · آخر تحديث:{" "}
              {new Date(lib.savedAt).toLocaleDateString("ar-DZ")}
            </p>
            <span className="flex gap-3">
              <button
                type="button"
                onClick={download}
                disabled={busy}
                className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
              >
                {busy ? "…" : "↻ تحديث"}
              </button>
              <button
                type="button"
                onClick={remove}
                className="text-xs text-destructive hover:underline"
              >
                حذف من الجهاز
              </button>
            </span>
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            dir="auto"
            placeholder="🔍 ابحث بالعنوان، الجامعة، التخصص أو السنة…"
            className="mt-4 w-full rounded-md border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
          />

          <div className="mt-4 divide-y rounded-2xl border">
            {filtered.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">
                لا نتائج لهذا البحث
              </p>
            )}
            {filtered.map((t) => (
              <div key={t.slug}>
                <button
                  type="button"
                  onClick={() =>
                    setOpenSlug(openSlug === t.slug ? null : t.slug)
                  }
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right transition hover:bg-muted/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {t.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {t.university.nameAr || t.university.name} ·{" "}
                      {t.specialty.nameAr || t.specialty.name} · {t.year} ·{" "}
                      {t.problems.length} تمارين
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {openSlug === t.slug ? "▲" : "▼"}
                  </span>
                </button>
                {openSlug === t.slug && <TopicReader topic={t} />}
              </div>
            ))}
          </div>
        </>
      )}

      {message && (
        <p className="mt-4 text-center text-sm font-medium">{message}</p>
      )}
    </div>
  );
}
