"use client";

// "My Notes" v2 — three pages:
// 1) Home: small colored notebook cards + add button + delete under each
// 2) Notebook: all content organized for reading + download
// 3) Writer: Markdown + LaTeX editor with a one-click toolbar
//    (colored study boxes, highlight, images by paste/drag/pick)
import {
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import type { MyNote, MyNotebook, MyNotesData } from "@/lib/mylibrary";
import {
  createNotebookAction,
  renameNotebookAction,
  deleteNotebookAction,
  createNoteAction,
  updateNoteAction,
  deleteNoteAction,
} from "./actions";

// ===== Markdown rendering =====

/** GitLab-style math fences + ==highlight== support */
function prep(src: string): string {
  return src
    .replace(/```math\r?\n([\s\S]*?)```/g, (_m, body) => `\n$$\n${body}\n$$\n`)
    .replace(/\$`([\s\S]*?)`\$/g, (_m, body) => `$${body}$`)
    .replace(/==([^=\n][^=\n]*?)==/g, "<mark>$1</mark>");
}

function MD({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeRaw, rehypeKatex]}
    >
      {prep(text)}
    </ReactMarkdown>
  );
}

// ===== Colored study boxes (:::def / :::imp / :::idea / :::ex / :::sum) =====

const CALLOUTS: Record<string, { icon: string; label: string; cls: string }> = {
  def: { icon: "📘", label: "Definition", cls: "callout-def" },
  imp: { icon: "📌", label: "Important", cls: "callout-imp" },
  idea: { icon: "💡", label: "Idea", cls: "callout-idea" },
  ex: { icon: "✏️", label: "Exercise", cls: "callout-ex" },
  sum: { icon: "📝", label: "Summary", cls: "callout-sum" },
};

type Segment =
  | { kind: "md"; text: string }
  | { kind: "callout"; type: string; title: string; body: string };

function parseSegments(src: string): Segment[] {
  const lines = src.split("\n");
  const segs: Segment[] = [];
  let buf: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(/^:::(def|imp|idea|ex|sum)\s*(.*)$/);
    if (m) {
      if (buf.length) {
        segs.push({ kind: "md", text: buf.join("\n") });
        buf = [];
      }
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^:::\s*$/.test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      i++; // skip closing :::
      segs.push({
        kind: "callout",
        type: m[1],
        title: m[2].trim(),
        body: body.join("\n"),
      });
    } else {
      buf.push(lines[i]);
      i++;
    }
  }
  if (buf.length) segs.push({ kind: "md", text: buf.join("\n") });
  return segs;
}

function ExerciseBox({ title, body }: { title: string; body: string }) {
  const parts = body.split(/^@@solution\s*$/m);
  const statement = parts[0] ?? "";
  const solution = parts.slice(1).join("\n").trim();
  return (
    <div className="callout callout-ex">
      <div className="callout-title">
        {CALLOUTS.ex.icon} {title || CALLOUTS.ex.label}
      </div>
      <MD text={statement.trim()} />
      {solution && (
        <details>
          <summary>💡 Show solution</summary>
          <MD text={solution} />
        </details>
      )}
    </div>
  );
}

function NoteBody({ content, scale }: { content: string; scale: number }) {
  if (!content.trim()) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        This note is empty — click “✏️ Edit” to start writing
      </p>
    );
  }
  const segs = parseSegments(content);
  return (
    <div dir="auto" className="note-reading" style={{ fontSize: `${scale}rem` }}>
      {segs.map((s, i) => {
        if (s.kind === "md") return <MD key={i} text={s.text} />;
        if (s.type === "ex")
          return <ExerciseBox key={i} title={s.title} body={s.body} />;
        const meta = CALLOUTS[s.type];
        return (
          <div key={i} className={`callout ${meta.cls}`}>
            <div className="callout-title">
              {meta.icon} {s.title || meta.label}
            </div>
            <MD text={s.body} />
          </div>
        );
      })}
    </div>
  );
}

// ===== Small helpers =====

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
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

/** Templates inserted by the toolbar — you never memorize syntax */
const TPL = {
  def: "\n:::def Term\nDefinition to remember...\n:::\n",
  imp: "\n:::imp Warning\nCritical point — do not forget this...\n:::\n",
  idea: "\n:::idea Idea\nMy idea...\n:::\n",
  ex: "\n:::ex Exercise\nStatement...\n\n@@solution\nSolution steps...\n:::\n",
  sum: "\n:::sum Summary\n- Key point 1\n- Key point 2\n:::\n",
  table: "\n| A | B |\n|---|---|\n|   |   |\n",
};

type SaveStatus = "idle" | "saving" | "saved" | "error";
type View = "home" | "notebook" | "editor";

// ===== Main component =====

export function NotesClient({ initialData }: { initialData: MyNotesData }) {
  const [notebooks, setNotebooks] = useState<MyNotebook[]>(initialData.notebooks);
  const [notes, setNotes] = useState<MyNote[]>(initialData.notes);
  const [view, setView] = useState<View>("home");
  const [activeNb, setActiveNb] = useState<string>("none");
  const [editId, setEditId] = useState<string | null>(null);
  const [scale, setScale] = useState(1.05);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showPreview, setShowPreview] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [newNbOpen, setNewNbOpen] = useState(false);
  const [newNbTitle, setNewNbTitle] = useState("");
  const [renamingNb, setRenamingNb] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");

  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Autosave machinery
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
      setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 2000);
    } catch {
      for (const id of ids) dirtyRef.current.add(id);
      setSaveStatus("error");
    }
  }

  function patchNote(id: string, patch: Partial<MyNote>) {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n,
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

  // ===== Derived =====
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
    activeNb === "none" ? "🗂️ Uncategorized" : (activeNbObj?.title ?? "Notebook");
  const editNote = notes.find((n) => n.id === editId) ?? null;

  // ===== Navigation =====
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

  function closeEditor() {
    if (timerRef.current) clearTimeout(timerRef.current);
    void flushSaves();
    setActiveNb(editNote?.notebookId ?? activeNb ?? "none");
    setEditId(null);
    setView("notebook");
  }

  // ===== Download a whole notebook as Markdown =====
  function downloadNotebook() {
    const md =
      `# ${activeNbTitle.replace(/^[^\p{L}\p{N}]+\s*/u, "")}\n\n` +
      nbNotes.map((n) => `## ${n.title}\n\n${n.content.trim()}`).join("\n\n---\n\n");
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${activeNbTitle.replace(/[\\/:*?"<>|]/g, "-").trim()}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }

  // ===== Notebook actions =====
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
      alert(e instanceof Error ? e.message : "Could not create notebook");
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
      alert(e instanceof Error ? e.message : "Could not rename notebook");
    } finally {
      setBusy(false);
    }
  }

  async function deleteNb(nb: MyNotebook) {
    const count = counts.byNb.get(nb.id) ?? 0;
    if (!confirm(`Delete notebook “${nb.title}”?`)) return;
    let deleteNotes = false;
    if (count > 0) {
      deleteNotes = confirm(
        `This notebook contains ${count} notes.\n\nOK = delete the notes too\nCancel = move them to “Uncategorized”`,
      );
    }
    setBusy(true);
    try {
      await deleteNotebookAction({ id: nb.id, col: nb.col, deleteNotes, noteCols });
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
      alert(e instanceof Error ? e.message : "Could not delete notebook");
    } finally {
      setBusy(false);
    }
  }

  // ===== Note actions =====
  async function addNote(notebookId: string | null) {
    if (busy) return;
    setBusy(true);
    try {
      const note = await createNoteAction({
        col: initialData.noteWriteCollection,
        notebookId,
        title: "New note",
        content: "",
      });
      setNotes((prev) => [note, ...prev]);
      openEditor(note);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not create note");
    } finally {
      setBusy(false);
    }
  }

  async function deleteNote(n: MyNote) {
    if (!confirm(`Delete note “${n.title}” permanently?`)) return;
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
      alert(e instanceof Error ? e.message : "Could not delete note");
    } finally {
      setBusy(false);
    }
  }

  // ===== Toolbar: insert at cursor =====
  function surround(before: string, after = "", placeholder = "") {
    const ta = taRef.current;
    if (!ta || !editNote) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const value = ta.value;
    const sel = value.slice(s, e) || placeholder;
    const next = value.slice(0, s) + before + sel + after + value.slice(e);
    patchNote(editNote.id, { content: next });
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + before.length, s + before.length + sel.length);
    });
  }

  // ===== Images: compress in browser, upload to MongoDB =====
  async function uploadImage(file: File) {
    if (!file.type.startsWith("image/") || !editNote) return;
    setUploading(true);
    try {
      const raw = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = () => rej(new Error("read failed"));
        r.readAsDataURL(file);
      });
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = () => rej(new Error("decode failed"));
        im.src = raw;
      });
      const MAX = 1600;
      const k = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * k));
      canvas.height = Math.max(1, Math.round(img.height * k));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas failed");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/webp", 0.85);

      const res = await fetch("/api/mynotes/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      if (!res.ok) throw new Error("upload failed");
      const { id } = (await res.json()) as { id: string };
      surround(`\n![image](/api/mynotes/image/${id})\n`);
    } catch {
      alert("Image upload failed — try a smaller image");
    } finally {
      setUploading(false);
    }
  }

  function onPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const item = Array.from(e.clipboardData.items).find((it) =>
      it.type.startsWith("image/"),
    );
    if (item) {
      const f = item.getAsFile();
      if (f) {
        e.preventDefault();
        void uploadImage(f);
      }
    }
  }

  function onDrop(e: DragEvent<HTMLTextAreaElement>) {
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("image/")) {
      e.preventDefault();
      void uploadImage(f);
    }
  }

  const saveLabel: Record<SaveStatus, { text: string; cls: string }> = {
    idle: { text: "", cls: "" },
    saving: { text: "⏳ Saving...", cls: "text-muted-foreground" },
    saved: { text: "✓ Saved", cls: "text-emerald-600" },
    error: { text: "⚠️ Save failed — retrying on next edit", cls: "text-destructive" },
  };

  const tbBtn =
    "rounded-md border px-1.5 py-1 text-xs leading-none transition hover:bg-secondary disabled:opacity-40";

  // ============================================================
  // Page 3: Writer
  // ============================================================
  if (view === "editor" && editNote) {
    return (
      <div className="space-y-3" onKeyDown={onKeyDown}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={closeEditor}
            className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            ✓ Done
          </button>
          <span className={`text-xs font-medium ${saveLabel[saveStatus].cls}`}>
            {saveLabel[saveStatus].text}
          </span>
          {uploading && (
            <span className="text-xs text-muted-foreground">🖼️ Uploading image...</span>
          )}
          <span className="mr-auto text-[10px] text-muted-foreground">
            Autosaves while typing · Ctrl+S to save now
          </span>
          <button onClick={() => setShowPreview((v) => !v)} className={tbBtn}>
            {showPreview ? "👁️ Hide preview" : "👁️ Show preview"}
          </button>
          <button
            onClick={() => void deleteNote(editNote)}
            disabled={busy}
            className="rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
          >
            🗑️
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            dir="auto"
            value={editNote.title}
            onChange={(e) => patchNote(editNote.id, { title: e.target.value })}
            placeholder="Note title..."
            className="min-w-[220px] flex-1 rounded-lg border bg-card px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/40"
          />
          <select
            value={editNote.notebookId ?? ""}
            onChange={(e) =>
              patchNote(editNote.id, { notebookId: e.target.value || null })
            }
            className="rounded-lg border bg-card px-2 py-2 text-xs outline-none"
          >
            <option value="">🗂️ Uncategorized</option>
            {notebooks.map((b) => (
              <option key={b.id} value={b.id}>
                📒 {b.title}
              </option>
            ))}
          </select>
        </div>

        {/* Toolbar — one click inserts everything */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl border bg-card p-1.5">
          <button className={tbBtn} title="Bold" onClick={() => surround("**", "**", "bold")}>
            <b>B</b>
          </button>
          <button className={tbBtn} title="Italic" onClick={() => surround("*", "*", "italic")}>
            <i>I</i>
          </button>
          <button className={tbBtn} title="Heading" onClick={() => surround("\n## ", "", "Heading")}>
            H2
          </button>
          <button className={tbBtn} title="Subheading" onClick={() => surround("\n### ", "", "Subheading")}>
            H3
          </button>
          <button className={tbBtn} title="Bullet list" onClick={() => surround("\n- ", "", "item")}>
            •
          </button>
          <button className={tbBtn} title="Checklist" onClick={() => surround("\n- [ ] ", "", "task")}>
            ☑
          </button>
          <button className={tbBtn} title="Table" onClick={() => surround(TPL.table)}>
            ⊞
          </button>
          <button className={tbBtn} title="Inline code" onClick={() => surround("`", "`", "code")}>
            {"</>"}
          </button>
          <span className="mx-0.5 h-5 w-px bg-border" />
          <button className={tbBtn} title="Inline math" onClick={() => surround("$", "$", "x^2")}>
            $x$
          </button>
          <button className={tbBtn} title="Displayed equation" onClick={() => surround("\n$$\n", "\n$$\n", "\\int_a^b f(x)\\,dx")}>
            ∑
          </button>
          <span className="mx-0.5 h-5 w-px bg-border" />
          <button className={`${tbBtn} text-blue-600`} title="Definition box" onClick={() => surround(TPL.def)}>
            📘 Def
          </button>
          <button className={`${tbBtn} text-red-600`} title="Important box" onClick={() => surround(TPL.imp)}>
            📌 Imp
          </button>
          <button className={`${tbBtn} text-amber-600`} title="Idea box" onClick={() => surround(TPL.idea)}>
            💡 Idea
          </button>
          <button className={`${tbBtn} text-violet-600`} title="Exercise with hidden solution" onClick={() => surround(TPL.ex)}>
            ✏️ Ex
          </button>
          <button className={`${tbBtn} text-emerald-600`} title="Summary box" onClick={() => surround(TPL.sum)}>
            📝 Sum
          </button>
          <button className={tbBtn} title="Yellow highlight" onClick={() => surround("==", "==", "highlight")}>
            🖍️
          </button>
          <span className="mx-0.5 h-5 w-px bg-border" />
          <button
            className={tbBtn}
            title="Insert image (or just paste / drag one in)"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            🖼️
          </button>
          <button className={tbBtn} title="Divider" onClick={() => surround("\n\n---\n\n")}>
            ―
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadImage(f);
              e.target.value = "";
            }}
          />
        </div>

        <div className={`grid gap-3 ${showPreview ? "xl:grid-cols-2" : ""}`}>
          <textarea
            ref={taRef}
            dir="auto"
            value={editNote.content}
            onChange={(e) => patchNote(editNote.id, { content: e.target.value })}
            onPaste={onPaste}
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            rows={22}
            spellCheck={false}
            placeholder="Write in Markdown — use the toolbar above. Paste an image directly with Ctrl+V."
            className="w-full resize-y rounded-xl border bg-card p-3 font-mono text-sm leading-6 outline-none focus:ring-2 focus:ring-primary/40"
          />
          {showPreview && (
            <div className="max-h-[75vh] overflow-y-auto rounded-xl border bg-card p-4">
              <p className="mb-2 border-b pb-2 text-[10px] font-bold text-muted-foreground">
                👁️ Live preview
              </p>
              <NoteBody content={editNote.content} scale={1} />
            </div>
          )}
        </div>

        <details className="rounded-xl border bg-card p-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-bold">✍️ Writing guide (quick)</summary>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li><code>**bold**</code>, <code>*italic*</code>, <code>==highlight==</code>, <code>$x^2$</code> inline math, <code>$$...$$</code> displayed equation</li>
            <li>Colored boxes: click 📘 📌 💡 ✏️ 📝 in the toolbar — change the title after <code>:::def</code>, write inside, keep the closing <code>:::</code></li>
            <li>Exercise box: everything after <code>@@solution</code> is hidden behind a “Show solution” click — perfect for self-testing</li>
            <li>Images: paste (Ctrl+V), drag-drop, or click 🖼️ — they are compressed and stored in your database automatically</li>
          </ul>
        </details>
      </div>
    );
  }

  // ============================================================
  // Page 2: Notebook — organized reading + download
  // ============================================================
  if (view === "notebook") {
    const color = activeNb === "none" ? "#8a8a8a" : nbColor(activeNb);
    return (
      <div className="space-y-4" onKeyDown={onKeyDown}>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={goHome} className={tbBtn}>
            ← All notebooks
          </button>
          <h2 className="flex items-center gap-2 text-base font-bold sm:text-lg">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: color }} />
            <span dir="auto">{activeNbTitle}</span>
            <span className="text-xs font-normal text-muted-foreground">
              · {nbNotes.length} notes
            </span>
          </h2>
          <span className={`text-xs font-medium ${saveLabel[saveStatus].cls}`}>
            {saveLabel[saveStatus].text}
          </span>
          <div className="mr-auto flex items-center gap-1.5">
            <button
              onClick={() => setScale((s) => Math.max(0.85, +(s - 0.1).toFixed(2)))}
              className={tbBtn}
              title="Smaller text"
            >
              A-
            </button>
            <button
              onClick={() => setScale((s) => Math.min(1.6, +(s + 0.1).toFixed(2)))}
              className={tbBtn}
              title="Larger text"
            >
              A+
            </button>
            <button
              onClick={downloadNotebook}
              disabled={nbNotes.length === 0}
              className="rounded-md border border-emerald-500/50 px-2.5 py-1 text-xs font-bold text-emerald-700 transition hover:bg-emerald-500/10 disabled:opacity-40 dark:text-emerald-400"
              title="Download the whole notebook as a Markdown file"
            >
              ⬇️ Download
            </button>
            <button
              onClick={() => void addNote(activeNb === "none" ? null : activeNb)}
              disabled={busy}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
            >
              + Add
            </button>
          </div>
        </div>

        {nbNotes.length > 1 && (
          <nav className="rounded-xl border bg-card p-3">
            <p className="mb-1.5 text-[10px] font-bold text-muted-foreground">📑 Contents</p>
            <ol className="grid gap-1 text-xs sm:grid-cols-2 lg:grid-cols-3">
              {nbNotes.map((n, i) => (
                <li key={n.id} className="min-w-0">
                  <a
                    href={`#note-${n.id}`}
                    dir="auto"
                    className="block truncate rounded px-1.5 py-0.5 text-foreground/80 transition hover:bg-secondary hover:text-primary"
                  >
                    {i + 1}. {n.pinned ? "📌 " : ""}
                    {n.title || "(untitled)"}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {nbNotes.length === 0 ? (
          <div className="rounded-xl border bg-card py-16 text-center">
            <div className="text-4xl">📖</div>
            <p className="mt-3 text-sm font-medium">This notebook is empty</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Click “+ Add” to write your first note with Markdown and LaTeX
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
                  {n.title || "(untitled)"}
                </h3>
                <span className="text-[10px] text-muted-foreground">{fmtDate(n.updatedAt)}</span>
                <div className="mr-auto flex items-center gap-1.5">
                  <button
                    onClick={() => patchNote(n.id, { pinned: !n.pinned })}
                    className={tbBtn}
                    title={n.pinned ? "Unpin" : "Pin to top"}
                  >
                    📌
                  </button>
                  <button
                    onClick={() => openEditor(n)}
                    className="rounded-md border border-primary/40 px-2.5 py-1 text-xs font-bold text-primary transition hover:bg-primary/10"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => void deleteNote(n)}
                    disabled={busy}
                    className="rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
                    title="Delete note"
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
  // Page 1: Home — small notebook cards
  // ============================================================
  return (
    <div className="space-y-5" onKeyDown={onKeyDown}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">📝 My Notes</h2>
          <p className="text-xs text-muted-foreground">
            {counts.all} notes in {notebooks.length} notebooks — open one to read, or add a new note
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs font-medium ${saveLabel[saveStatus].cls}`}>
            {saveLabel[saveStatus].text}
          </span>
          <button
            onClick={() => void addNote(null)}
            disabled={busy}
            className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
            title="Opens the writing page immediately"
          >
            ＋ Add note
          </button>
        </div>
      </div>

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
                  {nb.title || "(unnamed notebook)"}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: `${color}1a`, color }}
                >
                  {count} notes
                </span>
              </button>

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
                    title="Rename"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => void deleteNb(nb)}
                    disabled={busy}
                    className="rounded-lg border border-destructive/30 px-2 py-1 text-[10px] text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
                    title="Delete notebook"
                  >
                    🗑️ Delete
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {counts.none > 0 && (
          <div className="flex flex-col">
            <button
              onClick={() => openNotebook("none")}
              className="flex flex-1 flex-col items-center gap-2 rounded-xl border border-dashed bg-card p-5 pt-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-2xl">
                🗂️
              </span>
              <span className="text-sm font-bold">Uncategorized</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                {counts.none} notes
              </span>
            </button>
            <div className="mt-1.5 h-[26px]" />
          </div>
        )}

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
                placeholder="Notebook name..."
                className="w-full rounded-lg border bg-card px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="flex gap-1.5">
                <button
                  onClick={() => void addNotebook()}
                  disabled={busy || !newNbTitle.trim()}
                  className="rounded-lg bg-primary px-3 py-1 text-xs font-bold text-primary-foreground disabled:opacity-50"
                >
                  Create
                </button>
                <button onClick={() => setNewNbOpen(false)} className="rounded-lg border px-3 py-1 text-xs">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setNewNbOpen(true)}
              className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 text-muted-foreground transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:text-primary hover:shadow-lg"
            >
              <span className="text-3xl">＋</span>
              <span className="text-xs font-bold">New notebook</span>
            </button>
          )}
          <div className="mt-1.5 h-[26px]" />
        </div>
      </div>

      <details className="rounded-xl border bg-card p-3 text-xs">
        <summary className="cursor-pointer font-bold text-muted-foreground">
          🔎 mylibrary collections ({initialData.collections.length})
        </summary>
        <ul className="mt-2 grid gap-1 sm:grid-cols-3">
          {initialData.collections.map((c) => (
            <li key={c.name} className="flex items-center justify-between rounded border px-2 py-1">
              <span dir="ltr">{c.name}</span>
              <span className="text-muted-foreground">{c.count}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
