"use client";

// واجهة «ملاحظاتي» — ثلاث صفحات:
// 1) الرئيسية: كراريس صغيرة (الدفاتر) + زر إضافة + حذف تحت كل دفتر
// 2) صفحة الدفتر: كل محتوياته منظمة للقراءة + زر تحميل
// 3) صفحة الكتابة: محرر LaTeX/Markdown بملء الشاشة مع حفظ تلقائي سريع
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
    return d.toLocaleDateString("ar-DZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
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
      <p className="py-6 text-center text-sm text-muted-foreground">
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
type View = "home" | "notebook" | "editor";

// ===== المكوّن الرئيسي =====

export function NotesClient({ initialData }: { initialData: MyNotesData }) {
  const [notebooks, setNotebooks] = useState<MyNotebook[]>(initialData.notebooks);
  const [notes, setNotes] = useState<MyNote[]>(initialData.notes);
  const [view, setView] = useState<View>("home");
  const [activeNb, setActiveNb] = useState<string>("none"); // "none" | <notebookId>
  const [editId, setEditId] = useState<string | null>(null);
  const [scale, setScale] = useState(1.05);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showPreview, setShowPreview] = useState(true);
  const [busy, setBusy] = useState(false);

  // نماذج صغيرة: دفتر جديد / إعادة تسمية
  const [newNbOpen, setNewNbOpen] = useState(false);
  const [newNbTitle, setNewNbTitle] = useState("");
  const [renamingNb, setRenamingNb] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");

  // مرآة للحالة + تتبع غير المحفوظ (للحفظ التلقائي)
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

  const noteCols = useMemo(() => {
    const set = new Set<string>(notes.map((n) => n.col));
    set.add(initialData.noteWriteCollection);
    return Array.from(set);
  }, [notes, initialData.noteWriteCollection]);

  /** ملاحظات الدفتر المفتوح — المثبّتة أولًا ثم الأحدث */
  const nbNotes = useMemo(() => {
    const list =
      activeNb === "none"
        ? notes.filter((n) => !n.notebookId)
        : notes.filter((n) => n.notebookId === activeNb);
    return [...list].sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
    );
  }, [notes, activeNb]);

  const activeNbObj = notebooks.find((b) => b.id === activeNb) ?? null;
  const activeNbTitle =
    activeNb === "none" ? "🗂️ غير مصنّفة" : (activeNbObj?.title ?? "دفتر");
  const editNote = notes.find((n) => n.id === editId) ?? null;

  // ===== تنقل =====
  function goHome() {
    if (timerRef.current) clearTimeout(timerRef.current);
    void flushSaves();
    setView("home");
    setEditId(null);
  }

  function openNotebook(id: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    void flushSaves();
    setActiveNb(id);
    setView("notebook");
    setEditId(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }

  function openEditor(note: MyNote) {
    setActiveNb(note.notebookId ?? "none");
    setEditId(note.id);
    setView("editor");
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }

  /** إنهاء الكتابة ← العودة إلى صفحة الدفتر */
  function closeEditor() {
    if (timerRef.current) clearTimeout(timerRef.current);
    void flushSaves();
    setActiveNb(editNote?.notebookId ?? activeNb ?? "none");
    setEditId(null);
    setView("notebook");
  }

  // ===== تحميل الدفتر كملف Markdown =====
  function downloadNotebook() {
    const md =
      `# ${activeNbTitle.replace(/^[^\p{L}\p{N}]+\s*/u, "")}\n\n` +
      nbNotes
        .map((n) => `## ${n.title}\n\n${n.content.trim()}`)
        .join("\n\n---\n\n");
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${activeNbTitle.replace(/[\\/:*?"<>|]/g, "-").trim()}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }

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
      if (activeNb === nb.id) {
        setActiveNb("none");
        setView("home");
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "تعذّر حذف الدفتر");
    } finally {
      setBusy(false);
    }
  }

  // ===== إجراءات الملاحظات =====
  /** زر الإضافة: ينشئ ملاحظة ثم يفتح صفحة الكتابة مباشرة */
  async function addNote(notebookId: string | null) {
    if (busy) return;
    setBusy(true);
    try {
      const note = await createNoteAction({
        col: initialData.noteWriteCollection,
        notebookId,
        title: "ملاحظة جديدة",
        content: "",
      });
      setNotes((prev) => [note, ...prev]);
      openEditor(note);
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
      if (editId === n.id) {
        setEditId(null);
        setView("notebook");
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "تعذّر حذف الملاحظة");
    } finally {
      setBusy(false);
    }
  }

  // ===== المساحة اليومية والأفكار =====
  async function ensureNotebook(title: string): Promise<MyNotebook> {
    const found = notebooks.find((b) => b.title.trim() === title);
    if (found) return found;
    const nb = await createNotebookAction({
      title,
      col: initialData.notebookWriteCollection,
    });
    setNotebooks((prev) => [...prev, nb]);
    return nb;
  }

  async function openDaily() {
    if (busy) return;
    setBusy(true);
    try {
      const nb = await ensureNotebook("📅 يومياتي");
      const todayTitle = `📅 ${new Intl.DateTimeFormat("ar-DZ", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date())}`;
      const existing = notes.find(
        (n) => n.notebookId === nb.id && n.title === todayTitle,
      );
      if (existing) {
        openEditor(existing);
        return;
      }
      const note = await createNoteAction({
        col: initialData.noteWriteCollection,
        notebookId: nb.id,
        title: todayTitle,
        content: [
          "## 🎯 أهداف اليوم",
          "",
          "- [ ] ",
          "",
          "## 📖 ما درسته اليوم",
          "",
          "",
          "## 💡 أفكار وملاحظات",
          "",
          "",
          "## ❓ أسئلة للمراجعة لاحقًا",
          "",
        ].join("\n"),
      });
      setNotes((prev) => [note, ...prev]);
      openEditor(note);
    } catch (e) {
      alert(e instanceof Error ? e.message : "تعذّر فتح مذكرة اليوم");
    } finally {
      setBusy(false);
    }
  }

  async function quickIdea() {
    if (busy) return;
    setBusy(true);
    try {
      const nb = await ensureNotebook("💡 أفكاري");
      const note = await createNoteAction({
        col: initialData.noteWriteCollection,
        notebookId: nb.id,
        title: "💡 فكرة جديدة",
        content: "",
      });
      setNotes((prev) => [note, ...prev]);
      openEditor(note);
    } catch (e) {
      alert(e instanceof Error ? e.message : "تعذّر إنشاء الفكرة");
    } finally {
      setBusy(false);
    }
  }

  const saveLabel: Record<SaveStatus, { text: string; cls: string }> = {
    idle: { text: "", cls: "" },
    saving: { text: "⏳ جارٍ الحفظ...", cls: "text-muted-foreground" },
    saved: { text: "✓ تم الحفظ", cls: "text-emerald-600" },
    error: { text: "⚠️ تعذّر الحفظ — أعد المحاولة", cls: "text-destructive" },
  };

  // ============================================================
  // الصفحة 3: الكتابة (LaTeX / Markdown)
  // ============================================================
  if (view === "editor" && editNote) {
    return (
      <div className="space-y-3" onKeyDown={onKeyDown}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={closeEditor}
            className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            ✓ إنهاء ورجوع
          </button>
          <span className={`text-xs font-medium ${saveLabel[saveStatus].cls}`}>
            {saveLabel[saveStatus].text}
          </span>
          <span className="mr-auto text-[10px] text-muted-foreground">
            حفظ تلقائي أثناء الكتابة · Ctrl+S للحفظ الفوري
          </span>
          <button
            onClick={() => setShowPreview((v) => !v)}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:bg-secondary"
          >
            {showPreview ? "👁️ إخفاء المعاينة" : "👁️ إظهار المعاينة"}
          </button>
          <button
            onClick={() => void deleteNote(editNote)}
            disabled={busy}
            className="rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
          >
            🗑️ حذف
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            dir="auto"
            value={editNote.title}
            onChange={(e) => patchNote(editNote.id, { title: e.target.value })}
            placeholder="عنوان الملاحظة..."
            className="min-w-[220px] flex-1 rounded-lg border bg-card px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/40"
          />
          <select
            value={editNote.notebookId ?? ""}
            onChange={(e) =>
              patchNote(editNote.id, { notebookId: e.target.value || null })
            }
            className="rounded-lg border bg-card px-2 py-2 text-xs outline-none"
          >
            <option value="">🗂️ غير مصنّفة</option>
            {notebooks.map((b) => (
              <option key={b.id} value={b.id}>
                📒 {b.title}
              </option>
            ))}
          </select>
        </div>

        <div className={`grid gap-3 ${showPreview ? "xl:grid-cols-2" : ""}`}>
          <LatexEditor
            value={editNote.content}
            onChange={(v) => patchNote(editNote.id, { content: v })}
            rows={22}
            placeholder="اكتب هنا بـ Markdown ومعادلات LaTeX — $…$ للمعادلات داخل السطر و $$…$$ للمعادلات المعروضة"
          />
          {showPreview && (
            <div className="max-h-[75vh] overflow-y-auto rounded-xl border bg-card p-4">
              <p className="mb-2 border-b pb-2 text-[10px] font-bold text-muted-foreground">
                👁️ معاينة فورية
              </p>
              <NoteBody content={editNote.content} scale={1} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // الصفحة 2: محتوى الدفتر — قراءة منظمة + تحميل
  // ============================================================
  if (view === "notebook") {
    const color = activeNb === "none" ? "#8a8a8a" : nbColor(activeNb);
    return (
      <div className="space-y-4" onKeyDown={onKeyDown}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={goHome}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:bg-secondary"
          >
            → كل الدفاتر
          </button>
          <h2 className="flex items-center gap-2 text-base font-bold sm:text-lg">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ background: color }}
            />
            {activeNbTitle}
            <span className="text-xs font-normal text-muted-foreground">
              · {nbNotes.length} ملاحظة
            </span>
          </h2>
          <span className={`text-xs font-medium ${saveLabel[saveStatus].cls}`}>
            {saveLabel[saveStatus].text}
          </span>
          <div className="mr-auto flex items-center gap-1.5">
            <button
              onClick={() => setScale((s) => Math.max(0.85, +(s - 0.1).toFixed(2)))}
              className="rounded-lg border px-2 py-1.5 text-xs transition hover:bg-secondary"
              title="تصغير الخط"
            >
              A-
            </button>
            <button
              onClick={() => setScale((s) => Math.min(1.6, +(s + 0.1).toFixed(2)))}
              className="rounded-lg border px-2 py-1.5 text-xs transition hover:bg-secondary"
              title="تكبير الخط"
            >
              A+
            </button>
            <button
              onClick={downloadNotebook}
              disabled={nbNotes.length === 0}
              className="rounded-lg border border-emerald-500/50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-500/10 disabled:opacity-40 dark:text-emerald-400"
              title="تحميل كل محتوى الدفتر كملف Markdown"
            >
              ⬇️ تحميل
            </button>
            <button
              onClick={() => void addNote(activeNb === "none" ? null : activeNb)}
              disabled={busy}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
            >
              + إضافة
            </button>
          </div>
        </div>

        {/* فهرس المحتويات */}
        {nbNotes.length > 1 && (
          <nav className="rounded-xl border bg-card p-3">
            <p className="mb-1.5 text-[10px] font-bold text-muted-foreground">
              📑 المحتويات
            </p>
            <ol className="grid gap-1 text-xs sm:grid-cols-2 lg:grid-cols-3">
              {nbNotes.map((n, i) => (
                <li key={n.id} className="min-w-0">
                  <a
                    href={`#note-${n.id}`}
                    dir="auto"
                    className="block truncate rounded px-1.5 py-0.5 text-foreground/80 transition hover:bg-secondary hover:text-primary"
                  >
                    {i + 1}. {n.pinned ? "📌 " : ""}
                    {n.title || "(بدون عنوان)"}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* المحتوى كاملًا — ملاحظة تلو الأخرى */}
        {nbNotes.length === 0 ? (
          <div className="rounded-xl border bg-card py-16 text-center">
            <div className="text-4xl">📖</div>
            <p className="mt-3 text-sm font-medium">الدفتر فارغ</p>
            <p className="mt-1 text-xs text-muted-foreground">
              اضغط «+ إضافة» لكتابة أول ملاحظة بـ Markdown ومعادلات LaTeX
            </p>
          </div>
        ) : (
          nbNotes.map((n) => (
            <section
              key={n.id}
              id={`note-${n.id}`}
              className="scroll-mt-4 rounded-xl border bg-card p-4 sm:p-6"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2 border-b pb-3">
                <h3 dir="auto" className="text-base font-bold sm:text-lg">
                  {n.pinned ? "📌 " : ""}
                  {n.title || "(بدون عنوان)"}
                </h3>
                <span className="text-[10px] text-muted-foreground">
                  {fmtDate(n.updatedAt)}
                </span>
                <div className="mr-auto flex items-center gap-1.5">
                  <button
                    onClick={() => patchNote(n.id, { pinned: !n.pinned })}
                    className="rounded-lg border px-2 py-1 text-xs transition hover:bg-secondary"
                    title={n.pinned ? "إلغاء التثبيت" : "تثبيت في الأعلى"}
                  >
                    📌
                  </button>
                  <button
                    onClick={() => openEditor(n)}
                    className="rounded-lg border border-primary/40 px-3 py-1 text-xs font-bold text-primary transition hover:bg-primary/10"
                  >
                    ✒️ تحرير
                  </button>
                  <button
                    onClick={() => void deleteNote(n)}
                    disabled={busy}
                    className="rounded-lg border border-destructive/40 px-2 py-1 text-xs text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
                    title="حذف الملاحظة"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <NoteBody content={n.content} scale={scale} />
            </section>
          ))
        )}
      </div>
    );
  }

  // ============================================================
  // الصفحة 1: الرئيسية — كراريس صغيرة (الدفاتر)
  // ============================================================
  return (
    <div className="space-y-5" onKeyDown={onKeyDown}>
      {/* الرأس */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">📝 ملاحظاتي</h2>
          <p className="text-xs text-muted-foreground">
            {counts.all} ملاحظة في {notebooks.length} دفتر — اختر دفترًا
            للقراءة، أو أضف ملاحظة جديدة
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs font-medium ${saveLabel[saveStatus].cls}`}>
            {saveLabel[saveStatus].text}
          </span>
          <button
            onClick={() => void openDaily()}
            disabled={busy}
            className="rounded-lg border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary shadow-sm transition hover:bg-primary/10 disabled:opacity-50"
            title="يفتح مذكرة اليوم — تُنشأ تلقائيًا بقالب جاهز في دفتر «📅 يومياتي»"
          >
            📅 مذكرة اليوم
          </button>
          <button
            onClick={() => void quickIdea()}
            disabled={busy}
            className="rounded-lg border border-amber-400/50 bg-amber-500/5 px-3 py-1.5 text-xs font-bold text-amber-600 shadow-sm transition hover:bg-amber-500/10 disabled:opacity-50 dark:text-amber-400"
            title="التقط فكرة سريعة في دفتر «💡 أفكاري»"
          >
            💡 فكرة
          </button>
          <button
            onClick={() => void addNote(null)}
            disabled={busy}
            className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
            title="يفتح صفحة كتابة جديدة بـ Markdown ومعادلات LaTeX"
          >
            ＋ إضافة
          </button>
        </div>
      </div>

      {/* شبكة الكراريس */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {notebooks.map((nb) => {
          const color = nbColor(nb.id);
          const count = counts.byNb.get(nb.id) ?? 0;
          return (
            <div key={nb.id} className="group flex flex-col">
              <button
                onClick={() => openNotebook(nb.id)}
                className="relative flex flex-1 flex-col items-center gap-2 overflow-hidden rounded-xl border bg-card p-5 pt-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                style={{ borderInlineStartWidth: 5, borderInlineStartColor: color }}
              >
                {/* خطوط الكراس */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-6 top-14 h-16 opacity-[0.07]"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(to bottom, transparent, transparent 9px, currentColor 10px)",
                  }}
                />
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                  style={{ background: `${color}1a` }}
                >
                  📒
                </span>
                <span dir="auto" className="line-clamp-2 text-sm font-bold">
                  {nb.title || "(دفتر بدون اسم)"}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: `${color}1a`, color }}
                >
                  {count} ملاحظة
                </span>
              </button>

              {/* أزرار صغيرة تحت الكراس */}
              {renamingNb === nb.id ? (
                <div className="mt-1.5 flex items-center gap-1">
                  <input
                    dir="auto"
                    autoFocus
                    value={renameTitle}
                    onChange={(e) => setRenameTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void renameNb(nb);
                      if (e.key === "Escape") setRenamingNb(null);
                    }}
                    className="w-full min-w-0 flex-1 rounded-lg border bg-card px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    onClick={() => void renameNb(nb)}
                    disabled={busy}
                    className="rounded-lg bg-primary px-2 py-1 text-xs font-bold text-primary-foreground disabled:opacity-50"
                  >
                    ✓
                  </button>
                </div>
              ) : (
                <div className="mt-1.5 flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => {
                      setRenamingNb(nb.id);
                      setRenameTitle(nb.title);
                    }}
                    className="rounded-lg border px-2 py-1 text-[10px] text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                    title="إعادة تسمية"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => void deleteNb(nb)}
                    disabled={busy}
                    className="rounded-lg border border-destructive/30 px-2 py-1 text-[10px] text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
                    title="حذف الدفتر"
                  >
                    🗑️ حذف
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* كراس «غير مصنّفة» */}
        {counts.none > 0 && (
          <div className="flex flex-col">
            <button
              onClick={() => openNotebook("none")}
              className="flex flex-1 flex-col items-center gap-2 rounded-xl border border-dashed bg-card p-5 pt-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-2xl">
                🗂️
              </span>
              <span className="text-sm font-bold">غير مصنّفة</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                {counts.none} ملاحظة
              </span>
            </button>
            <div className="mt-1.5 h-[26px]" />
          </div>
        )}

        {/* إضافة دفتر جديد */}
        <div className="flex flex-col">
          {newNbOpen ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-5">
              <input
                dir="auto"
                autoFocus
                value={newNbTitle}
                onChange={(e) => setNewNbTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void addNotebook();
                  if (e.key === "Escape") setNewNbOpen(false);
                }}
                placeholder="اسم الدفتر..."
                className="w-full rounded-lg border bg-card px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="flex gap-1.5">
                <button
                  onClick={() => void addNotebook()}
                  disabled={busy || !newNbTitle.trim()}
                  className="rounded-lg bg-primary px-3 py-1 text-xs font-bold text-primary-foreground disabled:opacity-50"
                >
                  إنشاء
                </button>
                <button
                  onClick={() => setNewNbOpen(false)}
                  className="rounded-lg border px-3 py-1 text-xs"
                >
                  إلغاء
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setNewNbOpen(true)}
              className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 text-muted-foreground transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:text-primary hover:shadow-lg"
            >
              <span className="text-3xl">＋</span>
              <span className="text-xs font-bold">دفتر جديد</span>
            </button>
          )}
          <div className="mt-1.5 h-[26px]" />
        </div>
      </div>

      {/* لوحة استكشاف قاعدة mylibrary */}
      <details className="rounded-xl border bg-card p-3 text-xs">
        <summary className="cursor-pointer font-bold text-muted-foreground">
          🔎 مجموعات قاعدة mylibrary ({initialData.collections.length})
        </summary>
        <ul className="mt-2 grid gap-1 sm:grid-cols-3">
          {initialData.collections.map((c) => (
            <li
              key={c.name}
              className="flex items-center justify-between rounded border px-2 py-1"
            >
              <span dir="ltr">{c.name}</span>
              <span className="text-muted-foreground">{c.count}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
