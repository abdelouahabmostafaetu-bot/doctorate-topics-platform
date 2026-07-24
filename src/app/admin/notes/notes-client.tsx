"use client";

// واجهة «ملاحظاتي» — ثلاثة ألواح: الدفاتر / قائمة الملاحظات / القراءة والتحرير
// حفظ تلقائي سريع (Debounce) + Ctrl+S + عرض Markdown ومعادلات LaTeX عبر KaTeX
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { LatexEditor } from "@/components/latex-editor";
import type { MyNote, MyNotebook, MyNotesData } from "@/lib/mylibrary";
import {
  createNotebookAction,
  renameNotebookAction,
  deleteNotebookAction,
  createNoteAction,
  updateNoteAction,
  deleteNoteAction,
} from "./actions";

// ===== أدوات عرض =====

/** دعم صيغة GitLab للمعادلات (نفس منطق MathContent) */
function normalizeMath(src: string): string {
  return src
    .replace(/```math\r?\n([\s\S]*?)```/g, (_m, body) => `\n$$\n${body}\n$$\n`)
    .replace(/\$`([\s\S]*?)`\$/g, (_m, body) => `$${body}$`);
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return (
      d.toLocaleDateString("ar-DZ", { year: "numeric", month: "short", day: "numeric" }) +
      " · " +
      d.toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })
    );
  } catch {
    return "";
  }
}

function excerpt(src: string): string {
  const plain = src
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " 【معادلة】 ")
    .replace(/\$[^$\n]*\$/g, " 【معادلة】 ")
    .replace(/[#>*_`[\]!|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.slice(0, 110);
}

const NB_COLORS = [
  "#2783DE",
  "#46A171",
  "#D5803B",
  "#8E6BD6",
  "#E56458",
  "#3AA6B9",
  "#C05299",
  "#7A8B26",
];

function nbColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % 9973;
  return NB_COLORS[h % NB_COLORS.length];
}

function NoteBody({ content, scale }: { content: string; scale: number }) {
  if (!content.trim()) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        هذه الملاحظة فارغة — اضغط «✒️ تحرير» للبدء في الكتابة
      </p>
    );
  }
  return (
    <div dir="auto" className="note-reading" style={{ fontSize: `${scale}rem` }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {normalizeMath(content)}
      </ReactMarkdown>
    </div>
  );
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

// ===== المكوّن الرئيسي =====

export function NotesClient({ initialData }: { initialData: MyNotesData }) {
  const [notebooks, setNotebooks] = useState<MyNotebook[]>(initialData.notebooks);
  const [notes, setNotes] = useState<MyNote[]>(initialData.notes);
  const [selNb, setSelNb] = useState<string>("all"); // all | none | <notebookId>
  const [selNoteId, setSelNoteId] = useState<string | null>(null);
  const [mode, setMode] = useState<"read" | "edit">("read");
  const [query, setQuery] = useState("");
  const [scale, setScale] = useState(1.05);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showPreview, setShowPreview] = useState(true);
  const [busy, setBusy] = useState(false);

  // إنشاء/إعادة تسمية الدفاتر (نماذج مدمجة صغيرة)
  const [newNbOpen, setNewNbOpen] = useState(false);
  const [newNbTitle, setNewNbTitle] = useState("");
  const [renamingNb, setRenamingNb] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");

  // مرآة للحالة + تتبع الملاحظات غير المحفوظة (للحفظ التلقائي)
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const dirtyRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function flushSaves() {
    const ids = Array.from(dirtyRef.current);
    if (ids.length === 0) return;
    dirtyRef.current.clear();
    try {
      for (const id of ids) {
        const n = notesRef.current.find((x) => x.id === id);
        if (!n) continue;
        await updateNoteAction({
          id: n.id,
          col: n.col,
          title: n.title,
          content: n.content,
          notebookId: n.notebookId,
          pinned: n.pinned,
        });
      }
      setSaveStatus("saved");
      setTimeout(
        () => setSaveStatus((s) => (s === "saved" ? "idle" : s)),
        2000,
      );
    } catch {
      for (const id of ids) dirtyRef.current.add(id);
      setSaveStatus("error");
    }
  }

  /** تعديل متفائل + جدولة حفظ تلقائي سريع */
  function patchNote(id: string, patch: Partial<MyNote>) {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, ...patch, updatedAt: new Date().toISOString() }
          : n,
      ),
    );
    dirtyRef.current.add(id);
    setSaveStatus("saving");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void flushSaves(), 800);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      if (timerRef.current) clearTimeout(timerRef.current);
      void flushSaves();
    }
  }

  // ===== مشتقات =====
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    let none = 0;
    for (const n of notes) {
      if (n.notebookId) m.set(n.notebookId, (m.get(n.notebookId) ?? 0) + 1);
      else none++;
    }
    return { byNb: m, none, all: notes.length };
  }, [notes]);

  const filtered = useMemo(() => {
    let list = notes;
    if (selNb === "none") list = list.filter((n) => !n.notebookId);
    else if (selNb !== "all") list = list.filter((n) => n.notebookId === selNb);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q),
      );
    }
    return [...list].sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
    );
  }, [notes, selNb, query]);

  const current = notes.find((n) => n.id === selNoteId) ?? null;
  const currentNb = current?.notebookId
    ? (notebooks.find((b) => b.id === current.notebookId) ?? null)
    : null;

  const noteCols = useMemo(() => {
    const set = new Set<string>(notes.map((n) => n.col));
    set.add(initialData.noteWriteCollection);
    return Array.from(set);
  }, [notes, initialData.noteWriteCollection]);

  // ===== إجراءات الدفاتر =====
  async function addNotebook() {
    const title = newNbTitle.trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      const nb = await createNotebookAction({
        title,
        col: initialData.notebookWriteCollection,
      });
      setNotebooks((prev) => [...prev, nb]);
      setNewNbTitle("");
      setNewNbOpen(false);
      setSelNb(nb.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "تعذّر إنشاء الدفتر");
    } finally {
      setBusy(false);
    }
  }

  async function renameNb(nb: MyNotebook) {
    const title = renameTitle.trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      await renameNotebookAction({ id: nb.id, col: nb.col, title });
      setNotebooks((prev) =>
        prev.map((b) => (b.id === nb.id ? { ...b, title } : b)),
      );
      setRenamingNb(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "تعذّر تعديل الدفتر");
    } finally {
      setBusy(false);
    }
  }

  async function deleteNb(nb: MyNotebook) {
    const count = counts.byNb.get(nb.id) ?? 0;
    if (!confirm(`حذف الدفتر «${nb.title}»؟`)) return;
    let deleteNotes = false;
    if (count > 0) {
      deleteNotes = confirm(
        `يحتوي الدفتر على ${count} ملاحظة.\n\nموافق = حذف الملاحظات أيضًا\nإلغاء = نقلها إلى «غير مصنّفة»`,
      );
    }
    setBusy(true);
    try {
      await deleteNotebookAction({
        id: nb.id,
        col: nb.col,
        deleteNotes,
        noteCols,
      });
      setNotebooks((prev) => prev.filter((b) => b.id !== nb.id));
      setNotes((prev) =>
        deleteNotes
          ? prev.filter((n) => n.notebookId !== nb.id)
          : prev.map((n) =>
              n.notebookId === nb.id ? { ...n, notebookId: null } : n,
            ),
      );
      if (selNb === nb.id) setSelNb("all");
      if (deleteNotes && current?.notebookId === nb.id) setSelNoteId(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "تعذّر حذف الدفتر");
    } finally {
      setBusy(false);
    }
  }

  // ===== إجراءات الملاحظات =====
  async function addNote() {
    if (busy) return;
    setBusy(true);
    try {
      const note = await createNoteAction({
        col: initialData.noteWriteCollection,
        notebookId: selNb !== "all" && selNb !== "none" ? selNb : null,
        title: "ملاحظة جديدة",
        content: "",
      });
      setNotes((prev) => [note, ...prev]);
      setSelNoteId(note.id);
      setMode("edit");
    } catch (e) {
      alert(e instanceof Error ? e.message : "تعذّر إنشاء الملاحظة");
    } finally {
      setBusy(false);
    }
  }

  async function deleteNote(n: MyNote) {
    if (!confirm(`حذف الملاحظة «${n.title}» نهائيًا؟`)) return;
    setBusy(true);
    try {
      await deleteNoteAction({ id: n.id, col: n.col });
      dirtyRef.current.delete(n.id);
      setNotes((prev) => prev.filter((x) => x.id !== n.id));
      if (selNoteId === n.id) {
        setSelNoteId(null);
        setMode("read");
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "تعذّر حذف الملاحظة");
    } finally {
      setBusy(false);
    }
  }

  function openNote(id: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    void flushSaves();
    setSelNoteId(id);
    setMode("read");
  }

  const saveLabel: Record<SaveStatus, { text: string; cls: string }> = {
    idle: { text: "", cls: "" },
    saving: { text: "⏳ جارٍ الحفظ...", cls: "text-muted-foreground" },
    saved: { text: "✓ تم الحفظ", cls: "text-emerald-600" },
    error: { text: "⚠️ تعذّر الحفظ — أعد المحاولة", cls: "text-destructive" },
  };

  // ===== الواجهة =====
  return (
    <div className="space-y-3" onKeyDown={onKeyDown}>
      {/* الرأس */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">📝 ملاحظاتي</h2>
          <p className="text-xs text-muted-foreground">
            مساحتك الخاصة للدراسة والمراجعة — متّصلة بقاعدة mylibrary القديمة ·{" "}
            {counts.all} ملاحظة في {notebooks.length} دفتر
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium ${saveLabel[saveStatus].cls}`}>
            {saveLabel[saveStatus].text}
          </span>
          <button
            onClick={() => void addNote()}
            disabled={busy}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            + ملاحظة جديدة
          </button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[230px_290px_1fr]">
        {/* ===== اللوح 1: الدفاتر ===== */}
        <aside
          className={`rounded-xl border bg-card p-2 ${selNoteId ? "hidden lg:block" : ""}`}
        >
          <div className="max-h-[70vh] space-y-0.5 overflow-y-auto p-1">
            <button
              onClick={() => setSelNb("all")}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                selNb === "all"
                  ? "bg-primary/10 font-bold text-primary"
                  : "hover:bg-secondary"
              }`}
            >
              <span>📚 كل الملاحظات</span>
              <span className="text-[10px] opacity-70">{counts.all}</span>
            </button>

            {counts.none > 0 && (
              <button
                onClick={() => setSelNb("none")}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                  selNb === "none"
                    ? "bg-primary/10 font-bold text-primary"
                    : "hover:bg-secondary"
                }`}
              >
                <span>📋 غير مصنّفة</span>
                <span className="text-[10px] opacity-70">{counts.none}</span>
              </button>
            )}

            <div className="px-2.5 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              الدفاتر
            </div>

            {notebooks.map((nb) =>
              renamingNb === nb.id ? (
                <div key={nb.id} className="flex items-center gap-1 px-1 py-1">
                  <input
                    autoFocus
                    dir="auto"
                    value={renameTitle}
                    onChange={(e) => setRenameTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void renameNb(nb);
                      if (e.key === "Escape") setRenamingNb(null);
                    }}
                    className="w-full rounded-md border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
                  />
                  <button
                    onClick={() => void renameNb(nb)}
                    className="shrink-0 text-xs text-primary"
                    title="حفظ"
                  >
                    ✓
                  </button>
                </div>
              ) : (
                <div
                  key={nb.id}
                  className={`group flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition ${
                    selNb === nb.id
                      ? "bg-primary/10 font-bold text-primary"
                      : "hover:bg-secondary"
                  }`}
                >
                  <button
                    onClick={() => setSelNb(nb.id)}
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-start"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: nbColor(nb.id) }}
                    />
                    <span dir="auto" className="truncate">
                      {nb.title}
                    </span>
                  </button>
                  <span className="text-[10px] opacity-60">
                    {counts.byNb.get(nb.id) ?? 0}
                  </span>
                  <span className="hidden shrink-0 gap-0.5 group-hover:flex">
                    <button
                      onClick={() => {
                        setRenamingNb(nb.id);
                        setRenameTitle(nb.title);
                      }}
                      title="إعادة تسمية"
                      className="rounded px-0.5 opacity-60 hover:opacity-100"
                    >
                      ✒️
                    </button>
                    <button
                      onClick={() => void deleteNb(nb)}
                      title="حذف الدفتر"
                      className="rounded px-0.5 opacity-60 hover:opacity-100"
                    >
                      🗑️
                    </button>
                  </span>
                </div>
              ),
            )}

            {newNbOpen ? (
              <div className="flex items-center gap-1 px-1 py-1">
                <input
                  autoFocus
                  dir="auto"
                  value={newNbTitle}
                  onChange={(e) => setNewNbTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void addNotebook();
                    if (e.key === "Escape") setNewNbOpen(false);
                  }}
                  placeholder="اسم الدفتر..."
                  className="w-full rounded-md border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  onClick={() => void addNotebook()}
                  className="shrink-0 text-xs text-primary"
                  title="إنشاء"
                >
                  ✓
                </button>
              </div>
            ) : (
              <button
                onClick={() => setNewNbOpen(true)}
                className="mt-1 w-full rounded-lg border border-dashed px-2.5 py-1.5 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
              >
                + دفتر جديد
              </button>
            )}

            {/* استكشاف قاعدة mylibrary */}
            <details className="mt-3 rounded-lg border bg-muted/40 p-2">
              <summary className="cursor-pointer text-[10px] font-bold text-muted-foreground">
                🔎 مجموعات قاعدة mylibrary
              </summary>
              <ul className="mt-1.5 space-y-0.5 text-[10px] text-muted-foreground">
                {initialData.collections.map((c) => (
                  <li key={c.name} className="flex justify-between gap-2">
                    <span dir="ltr" className="truncate">
                      {c.name}
                    </span>
                    <span>{c.count}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[9px] leading-relaxed text-muted-foreground">
                إن كانت ملاحظاتك القديمة في مجموعة باسم مختلف، أضف
                MYNOTES_NOTES_COLLECTION في .env باسم تلك المجموعة.
              </p>
            </details>
          </div>
        </aside>

        {/* ===== اللوح 2: قائمة الملاحظات ===== */}
        <section
          className={`rounded-xl border bg-card p-2 ${selNoteId ? "hidden lg:block" : ""}`}
        >
          <input
            dir="auto"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 بحث في العناوين والمحتوى..."
            className="mb-2 w-full rounded-lg border bg-background px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="max-h-[66vh] space-y-1 overflow-y-auto p-0.5">
            {filtered.length === 0 && (
              <div className="py-10 text-center text-xs text-muted-foreground">
                {query
                  ? "لا نتائج لهذا البحث"
                  : "لا توجد ملاحظات هنا بعد — أنشئ أول ملاحظة ✨"}
              </div>
            )}
            {filtered.map((n) => {
              const nb = n.notebookId
                ? notebooks.find((b) => b.id === n.notebookId)
                : null;
              return (
                <button
                  key={`${n.col}:${n.id}`}
                  onClick={() => openNote(n.id)}
                  className={`block w-full rounded-lg border px-3 py-2 text-start transition ${
                    selNoteId === n.id
                      ? "border-primary/40 bg-primary/5"
                      : "border-transparent hover:border-border hover:bg-secondary/50"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {n.pinned && <span className="text-[10px]">📌</span>}
                    <span dir="auto" className="truncate text-xs font-bold">
                      {n.title}
                    </span>
                  </div>
                  <p
                    dir="auto"
                    className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground"
                  >
                    {excerpt(n.content) || "ملاحظة فارغة"}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    {nb ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                        style={{
                          backgroundColor: `${nbColor(nb.id)}1a`,
                          color: nbColor(nb.id),
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: nbColor(nb.id) }}
                        />
                        <span dir="auto">{nb.title}</span>
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="text-[9px] text-muted-foreground">
                      {fmtDate(n.updatedAt)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ===== اللوح 3: القراءة / التحرير ===== */}
        <section
          className={`min-w-0 rounded-xl border bg-card ${selNoteId ? "" : "hidden lg:block"}`}
        >
          {!current ? (
            <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-2 p-6 text-center">
              <div className="text-4xl">📖</div>
              <p className="text-sm font-bold">اختر ملاحظة للقراءة</p>
              <p className="text-xs text-muted-foreground">
                أو أنشئ ملاحظة جديدة للبدء في المراجعة — يدعم المحرر Markdown
                ومعادلات LaTeX
              </p>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              {/* شريط الأدوات */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelNoteId(null);
                      setMode("read");
                    }}
                    className="rounded-lg border px-2 py-1 text-xs lg:hidden"
                  >
                    → رجوع
                  </button>
                  {currentNb && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{
                        backgroundColor: `${nbColor(currentNb.id)}1a`,
                        color: nbColor(currentNb.id),
                      }}
                    >
                      <span dir="auto">{currentNb.title}</span>
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {fmtDate(current.updatedAt)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {mode === "read" && (
                    <>
                      <button
                        onClick={() => setScale((s) => Math.max(0.85, s - 0.1))}
                        title="تصغير الخط"
                        className="rounded-lg border px-2 py-1 text-[10px] transition hover:bg-secondary"
                      >
                        A-
                      </button>
                      <button
                        onClick={() => setScale((s) => Math.min(1.6, s + 0.1))}
                        title="تكبير الخط"
                        className="rounded-lg border px-2 py-1 text-[10px] transition hover:bg-secondary"
                      >
                        A+
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => patchNote(current.id, { pinned: !current.pinned })}
                    title={current.pinned ? "إلغاء التثبيت" : "تثبيت"}
                    className={`rounded-lg border px-2 py-1 text-[10px] transition hover:bg-secondary ${
                      current.pinned ? "border-primary/40 bg-primary/10" : ""
                    }`}
                  >
                    📌
                  </button>
                  {mode === "read" ? (
                    <button
                      onClick={() => setMode("edit")}
                      className="rounded-lg bg-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground transition hover:opacity-90"
                    >
                      ✒️ تحرير
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (timerRef.current) clearTimeout(timerRef.current);
                        void flushSaves();
                        setMode("read");
                      }}
                      className="rounded-lg bg-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground transition hover:opacity-90"
                    >
                      ✓ إنهاء التحرير
                    </button>
                  )}
                  <button
                    onClick={() => void deleteNote(current)}
                    title="حذف الملاحظة"
                    className="rounded-lg border px-2 py-1 text-[10px] text-destructive transition hover:bg-destructive/10"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* المحتوى */}
              {mode === "read" ? (
                <div className="max-h-[70vh] overflow-y-auto px-5 py-4 md:px-8 md:py-6">
                  <h1
                    dir="auto"
                    className="mb-4 border-b pb-3 text-xl font-extrabold leading-snug md:text-2xl"
                  >
                    {current.title}
                  </h1>
                  <div className="mx-auto max-w-3xl">
                    <NoteBody content={current.content} scale={scale} />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      dir="auto"
                      value={current.title}
                      onChange={(e) =>
                        patchNote(current.id, { title: e.target.value })
                      }
                      placeholder="عنوان الملاحظة..."
                      className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm font-bold outline-none focus:ring-1 focus:ring-ring"
                    />
                    <select
                      value={current.notebookId ?? ""}
                      onChange={(e) =>
                        patchNote(current.id, {
                          notebookId: e.target.value || null,
                        })
                      }
                      className="rounded-lg border bg-background px-2 py-2 text-xs outline-none"
                      title="نقل إلى دفتر"
                    >
                      <option value="">📋 غير مصنّفة</option>
                      {notebooks.map((nb) => (
                        <option key={nb.id} value={nb.id}>
                          {nb.title}
                        </option>
                      ))}
                    </select>
                    <label className="flex cursor-pointer items-center gap-1 text-[10px] text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={showPreview}
                        onChange={(e) => setShowPreview(e.target.checked)}
                      />
                      معاينة فورية
                    </label>
                  </div>

                  <div
                    className={`grid gap-3 ${showPreview ? "xl:grid-cols-2" : ""}`}
                  >
                    <div>
                      <LatexEditor
                        value={current.content}
                        onChange={(v) => patchNote(current.id, { content: v })}
                        rows={16}
                        placeholder="اكتب ملاحظاتك هنا... يدعم Markdown ومعادلات LaTeX مثل $x^2$"
                      />
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        💡 حفظ تلقائي أثناء الكتابة — أو Ctrl+S للحفظ الفوري
                      </p>
                    </div>
                    {showPreview && (
                      <div className="max-h-[60vh] overflow-y-auto rounded-lg border bg-background p-4">
                        <NoteBody content={current.content} scale={1} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
