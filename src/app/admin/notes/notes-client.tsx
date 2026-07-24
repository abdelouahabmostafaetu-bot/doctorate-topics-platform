"use client";

// ==========================================================================
//  MY NOTES — Study Workspace
//  Three-pane shell: notebooks rail | note list | reader / editor
//  Command palette (Ctrl+K), focus mode, autosave, LaTeX, images.
// ==========================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MyNote, MyNotebook, MyNotesData } from "@/lib/mylibrary";
import {
  createNotebookAction,
  renameNotebookAction,
  deleteNotebookAction,
  createNoteAction,
  updateNoteAction,
  deleteNoteAction,
} from "./actions";
import { NoteBody, excerpt, BOX_ORDER, BOXES, TPL } from "./markdown";

// ---------------------------- utilities ----------------------------

const ACCENTS = [
  "#3b6fd4",
  "#0f9488",
  "#c2703c",
  "#7c56d6",
  "#cc4f5c",
  "#2c8bb5",
  "#a8558f",
  "#6d8a2e",
];

function accentOf(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 9973;
  return ACCENTS[h % ACCENTS.length];
}

function relTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "now";
  if (min < 60) return min + "m";
  const hr = Math.round(min / 60);
  if (hr < 24) return hr + "h";
  const day = Math.round(hr / 24);
  if (day < 7) return day + "d";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function fullDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function countWords(s: string): number {
  const t = String(s ?? "").trim();
  return t ? t.split(/\s+/).length : 0;
}

function slug(s: string): string {
  return (
    String(s ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "note"
  );
}

function saveTextFile(name: string, body: string) {
  const blob = new Blob([body], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Shrinks an image in the browser before it is stored in MongoDB. */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image"));
      img.onload = () => {
        const max = 1600;
        const ratio = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * ratio));
        const h = Math.max(1, Math.round(img.height * ratio));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas is not available"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/webp", 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

// ---------------------------- types ----------------------------

type Scope =
  | { kind: "all" }
  | { kind: "pinned" }
  | { kind: "loose" }
  | { kind: "nb"; id: string };

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

type Pane = "rail" | "list" | "main";

const SAVE_LABEL: Record<SaveState, { text: string; tone: string }> = {
  idle: { text: "", tone: "idle" },
  dirty: { text: "Unsaved", tone: "dirty" },
  saving: { text: "Saving…", tone: "saving" },
  saved: { text: "Saved", tone: "saved" },
  error: { text: "Save failed", tone: "error" },
};

// ==========================================================================
//  Main component
// ==========================================================================

export function NotesClient({ initialData }: { initialData: MyNotesData }) {
  const noteCol = initialData.noteWriteCollection;
  const nbCol = initialData.notebookWriteCollection;
  const noteCols = useMemo(
    () => Array.from(new Set([noteCol, ...initialData.notes.map((n) => n.col)])),
    [noteCol, initialData.notes]
  );

  const [notebooks, setNotebooks] = useState<MyNotebook[]>(initialData.notebooks);
  const [notes, setNotes] = useState<MyNote[]>(initialData.notes);

  const [scope, setScope] = useState<Scope>({ kind: "all" });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<"read" | "write">("read");
  const [zen, setZen] = useState(false);
  const [pane, setPane] = useState<Pane>("list");
  const [query, setQuery] = useState("");
  const [scale, setScale] = useState(1);
  const [preview, setPreview] = useState(true);

  const [save, setSave] = useState<SaveState>("idle");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [nbDraft, setNbDraft] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

  const [paletteOpen, setPaletteOpen] = useState(false);

  const notesRef = useRef<MyNote[]>(notes);
  const dirtyRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  // ------------------------- saving -------------------------

  const flushSaves = useCallback(async () => {
    const ids = Array.from(dirtyRef.current);
    if (ids.length === 0) return;
    dirtyRef.current.clear();
    setSave("saving");
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
      setSave("saved");
      setTimeout(() => setSave((s) => (s === "saved" ? "idle" : s)), 1800);
    } catch {
      setSave("error");
    }
  }, []);

  const patchNote = useCallback(
    (id: string, patch: Partial<MyNote>) => {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n
        )
      );
      dirtyRef.current.add(id);
      setSave("dirty");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void flushSaves(), 800);
    },
    [flushSaves]
  );

  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current.size > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, []);

  // ------------------------- derived data -------------------------

  const counts = useMemo(() => {
    const byNb = new Map<string, number>();
    let loose = 0;
    let pinned = 0;
    for (const n of notes) {
      if (n.pinned) pinned++;
      if (n.notebookId) byNb.set(n.notebookId, (byNb.get(n.notebookId) ?? 0) + 1);
      else loose++;
    }
    return { byNb, loose, pinned, total: notes.length };
  }, [notes]);

  const scoped = useMemo(() => {
    let list = notes;
    if (scope.kind === "pinned") list = list.filter((n) => n.pinned);
    else if (scope.kind === "loose") list = list.filter((n) => !n.notebookId);
    else if (scope.kind === "nb") list = list.filter((n) => n.notebookId === scope.id);

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""));
    });
  }, [notes, scope, query]);

  const active = useMemo(
    () => notes.find((n) => n.id === activeId) ?? null,
    [notes, activeId]
  );

  const activeNb = useMemo(
    () => (active?.notebookId ? notebooks.find((b) => b.id === active.notebookId) ?? null : null),
    [active, notebooks]
  );

  const scopeTitle = useMemo(() => {
    if (scope.kind === "all") return "All notes";
    if (scope.kind === "pinned") return "Pinned";
    if (scope.kind === "loose") return "Unfiled";
    return notebooks.find((b) => b.id === scope.id)?.title ?? "Notebook";
  }, [scope, notebooks]);

  const accent = activeNb ? accentOf(activeNb.id) : "hsl(var(--primary))";

  // ------------------------- note actions -------------------------

  const openNote = useCallback((id: string, writing = false) => {
    setActiveId(id);
    setMode(writing ? "write" : "read");
    setPane("main");
  }, []);

  const newNote = useCallback(async () => {
    setBusy(true);
    try {
      const target = scope.kind === "nb" ? scope.id : null;
      const created = await createNoteAction({
        col: noteCol,
        notebookId: target,
        title: "Untitled note",
        content: "",
      });
      setNotes((prev) => [created, ...prev]);
      openNote(created.id, true);
      setTimeout(() => taRef.current?.focus(), 60);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not create the note");
    } finally {
      setBusy(false);
    }
  }, [scope, noteCol, openNote]);

  const removeNote = useCallback(
    async (n: MyNote) => {
      if (!confirm("Delete \u201c" + n.title + "\u201d? This cannot be undone.")) return;
      setBusy(true);
      try {
        dirtyRef.current.delete(n.id);
        await deleteNoteAction({ id: n.id, col: n.col });
        setNotes((prev) => prev.filter((x) => x.id !== n.id));
        setActiveId((cur) => (cur === n.id ? null : cur));
      } catch (e) {
        alert(e instanceof Error ? e.message : "Could not delete the note");
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const downloadNote = useCallback((n: MyNote) => {
    saveTextFile(slug(n.title) + ".md", "# " + n.title + "\n\n" + n.content + "\n");
  }, []);

  const downloadScope = useCallback(() => {
    const body = scoped
      .map((n) => "# " + n.title + "\n\n" + n.content)
      .join("\n\n---\n\n");
    saveTextFile(slug(scopeTitle) + ".md", body + "\n");
  }, [scoped, scopeTitle]);

  // ------------------------- notebook actions -------------------------

  const addNotebook = useCallback(async () => {
    const title = (nbDraft ?? "").trim();
    if (!title) {
      setNbDraft(null);
      return;
    }
    setBusy(true);
    try {
      const created = await createNotebookAction({ title, col: nbCol });
      setNotebooks((prev) => [...prev, created]);
      setScope({ kind: "nb", id: created.id });
      setNbDraft(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not create the notebook");
    } finally {
      setBusy(false);
    }
  }, [nbDraft, nbCol]);

  const commitRename = useCallback(async () => {
    const id = renameId;
    const title = renameText.trim();
    setRenameId(null);
    if (!id || !title) return;
    const nb = notebooks.find((b) => b.id === id);
    if (!nb || nb.title === title) return;
    setNotebooks((prev) => prev.map((b) => (b.id === id ? { ...b, title } : b)));
    try {
      await renameNotebookAction({ id, col: nb.col, title });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not rename the notebook");
    }
  }, [renameId, renameText, notebooks]);

  const removeNotebook = useCallback(
    async (nb: MyNotebook) => {
      const n = counts.byNb.get(nb.id) ?? 0;
      const msg =
        n > 0
          ? "Delete \u201c" + nb.title + "\u201d?\n\nOK = delete the notebook and its " + n + " note(s).\nCancel = keep the notes and move them to Unfiled."
          : "Delete the notebook \u201c" + nb.title + "\u201d?";
      const deleteNotes = n > 0 ? confirm(msg) : confirm(msg);
      if (n === 0 && !deleteNotes) return;
      setBusy(true);
      try {
        await deleteNotebookAction({
          id: nb.id,
          col: nb.col,
          deleteNotes: n > 0 ? deleteNotes : false,
          noteCols,
        });
        setNotebooks((prev) => prev.filter((b) => b.id !== nb.id));
        setNotes((prev) =>
          n > 0 && deleteNotes
            ? prev.filter((x) => x.notebookId !== nb.id)
            : prev.map((x) => (x.notebookId === nb.id ? { ...x, notebookId: null } : x))
        );
        setScope({ kind: "all" });
      } catch (e) {
        alert(e instanceof Error ? e.message : "Could not delete the notebook");
      } finally {
        setBusy(false);
      }
    },
    [counts, noteCols]
  );

  // ------------------------- editor helpers -------------------------

  const applyToTextarea = useCallback(
    (transform: (value: string, start: number, end: number) => { value: string; caret: number }) => {
      const ta = taRef.current;
      const note = active;
      if (!ta || !note) return;
      const { value, caret } = transform(ta.value, ta.selectionStart, ta.selectionEnd);
      patchNote(note.id, { content: value });
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(caret, caret);
      });
    },
    [active, patchNote]
  );

  const wrap = useCallback(
    (before: string, after: string, placeholder: string) => {
      applyToTextarea((value, start, end) => {
        const selected = value.slice(start, end) || placeholder;
        const next = value.slice(0, start) + before + selected + after + value.slice(end);
        return { value: next, caret: start + before.length + selected.length + after.length };
      });
    },
    [applyToTextarea]
  );

  const insert = useCallback(
    (snippet: string) => {
      applyToTextarea((value, start, end) => {
        const next = value.slice(0, start) + snippet + value.slice(end);
        return { value: next, caret: start + snippet.length };
      });
    },
    [applyToTextarea]
  );

  const uploadImage = useCallback(
    async (file: File) => {
      if (!active) return;
      setUploading(true);
      try {
        const dataUrl = await compressImage(file);
        const res = await fetch("/api/mynotes/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl }),
        });
        if (!res.ok) throw new Error("Upload failed (" + res.status + ")");
        const json = (await res.json()) as { id?: string };
        if (!json.id) throw new Error("Upload failed");
        insert("\n![image](/api/mynotes/image/" + json.id + ")\n");
      } catch (e) {
        alert(e instanceof Error ? e.message : "Could not upload the image");
      } finally {
        setUploading(false);
      }
    },
    [active, insert]
  );

  // ------------------------- keyboard -------------------------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (meta && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void flushSaves();
        return;
      }
      if (meta && e.key.toLowerCase() === "e") {
        e.preventDefault();
        if (activeId) setMode((m) => (m === "read" ? "write" : "read"));
        return;
      }
      if (e.key === "Escape") {
        if (paletteOpen) setPaletteOpen(false);
        else if (zen) setZen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flushSaves, activeId, paletteOpen, zen]);

  // ==================== render ====================

  return (
    <div
      className="ws-root"
      data-zen={zen ? "true" : "false"}
      data-pane={pane}
      style={{ ["--ws-accent" as string]: accent }}
    >
      {/* ------------------ RAIL: notebooks ------------------ */}
      <aside className="ws-rail">
        <div className="ws-pane-head">
          <div className="ws-brand">
            <span className="ws-brand-mark">◧</span>
            <span style={{ minWidth: 0 }}>
              <span className="ws-brand-title" style={{ display: "block" }}>
                My Notes
              </span>
              <span className="ws-brand-sub">Study workspace</span>
            </span>
          </div>
        </div>

        <div className="ws-rail-section">
          <button
            type="button"
            className="ws-btn"
            data-variant="solid"
            style={{ width: "100%", height: 34 }}
            onClick={() => void newNote()}
            disabled={busy}
          >
            <span style={{ fontSize: "1rem", lineHeight: 1 }}>+</span> New note
          </button>
          <button
            type="button"
            className="ws-btn"
            data-variant="outline"
            style={{ width: "100%", marginTop: 6, justifyContent: "space-between" }}
            onClick={() => setPaletteOpen(true)}
          >
            <span>Search…</span>
            <span className="ws-kbd">Ctrl K</span>
          </button>
        </div>

        <nav className="ws-rail-section">
          <div className="ws-rail-label">Library</div>
          <button
            type="button"
            className="ws-nav"
            data-active={scope.kind === "all"}
            onClick={() => {
              setScope({ kind: "all" });
              setPane("list");
            }}
          >
            <span className="ws-nav-mark">≡</span>
            <span className="ws-nav-text">All notes</span>
            <span className="ws-count">{counts.total}</span>
          </button>
          <button
            type="button"
            className="ws-nav"
            data-active={scope.kind === "pinned"}
            onClick={() => {
              setScope({ kind: "pinned" });
              setPane("list");
            }}
          >
            <span className="ws-nav-mark">★</span>
            <span className="ws-nav-text">Pinned</span>
            <span className="ws-count">{counts.pinned}</span>
          </button>
          {counts.loose > 0 && (
            <button
              type="button"
              className="ws-nav"
              data-active={scope.kind === "loose"}
              onClick={() => {
                setScope({ kind: "loose" });
                setPane("list");
              }}
            >
              <span className="ws-nav-mark">○</span>
              <span className="ws-nav-text">Unfiled</span>
              <span className="ws-count">{counts.loose}</span>
            </button>
          )}
        </nav>

        <div className="ws-rail-section ws-scroll" style={{ flex: 1, minHeight: 0 }}>
          <div className="ws-rail-label">
            <span>Notebooks</span>
            <button
              type="button"
              className="ws-mini"
              title="New notebook"
              onClick={() => setNbDraft("")}
            >
              +
            </button>
          </div>

          {notebooks.map((nb) => {
            const color = accentOf(nb.id);
            const isRenaming = renameId === nb.id;
            return isRenaming ? (
              <div key={nb.id} style={{ padding: "0.2rem 0.3rem" }}>
                <input
                  className="ws-input"
                  autoFocus
                  value={renameText}
                  onChange={(e) => setRenameText(e.target.value)}
                  onBlur={() => void commitRename()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void commitRename();
                    if (e.key === "Escape") setRenameId(null);
                  }}
                />
              </div>
            ) : (
              <div
                key={nb.id}
                className="ws-nav"
                data-active={scope.kind === "nb" && scope.id === nb.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setScope({ kind: "nb", id: nb.id });
                  setPane("list");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setScope({ kind: "nb", id: nb.id });
                    setPane("list");
                  }
                }}
              >
                <span className="ws-dot" style={{ background: color }} />
                <span className="ws-nav-text">{nb.title}</span>
                <span className="ws-nav-tools">
                  <button
                    type="button"
                    className="ws-mini"
                    title="Rename"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenameId(nb.id);
                      setRenameText(nb.title);
                    }}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="ws-mini"
                    data-danger="true"
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      void removeNotebook(nb);
                    }}
                  >
                    ✕
                  </button>
                </span>
                <span className="ws-count">{counts.byNb.get(nb.id) ?? 0}</span>
              </div>
            );
          })}

          {nbDraft !== null && (
            <div style={{ padding: "0.2rem 0.3rem" }}>
              <input
                className="ws-input"
                autoFocus
                placeholder="Notebook name…"
                value={nbDraft}
                onChange={(e) => setNbDraft(e.target.value)}
                onBlur={() => void addNotebook()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void addNotebook();
                  if (e.key === "Escape") setNbDraft(null);
                }}
              />
            </div>
          )}

          {notebooks.length === 0 && nbDraft === null && (
            <p style={{ padding: "0.4rem 0.5rem", fontSize: "0.72rem", color: "hsl(var(--muted-foreground))" }}>
              No notebooks yet. Use + to create your first one.
            </p>
          )}
        </div>
      </aside>

      {/* ------------------ LIST: notes ------------------ */}
      <section className="ws-list">
        <div className="ws-pane-head">
          <button
            type="button"
            className="ws-btn ws-icon-btn ws-back"
            title="Notebooks"
            onClick={() => setPane("rail")}
          >
            ‹
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ws-eyebrow">{scopeTitle}</div>
            <div style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))" }}>
              {scoped.length} {scoped.length === 1 ? "note" : "notes"}
            </div>
          </div>
          {scoped.length > 0 && (
            <button
              type="button"
              className="ws-btn ws-icon-btn"
              title="Download this list as Markdown"
              onClick={downloadScope}
            >
              ↓
            </button>
          )}
        </div>

        <div style={{ padding: "0.5rem 0.6rem", borderBottom: "1px solid hsl(var(--border))" }}>
          <input
            className="ws-input"
            placeholder="Filter notes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="ws-scroll" style={{ flex: 1 }}>
          {scoped.map((n) => {
            const nb = n.notebookId ? notebooks.find((b) => b.id === n.notebookId) : null;
            return (
              <button
                key={n.id}
                type="button"
                className="ws-item"
                data-active={n.id === activeId}
                style={{ ["--ws-accent" as string]: nb ? accentOf(nb.id) : "hsl(var(--primary))" }}
                onClick={() => openNote(n.id)}
                onDoubleClick={() => openNote(n.id, true)}
              >
                <span className="ws-item-top">
                  <span className="ws-item-title">
                    {n.pinned && <span style={{ color: "hsl(var(--primary))" }}>★ </span>}
                    {n.title}
                  </span>
                  <span className="ws-item-date">{relTime(n.updatedAt)}</span>
                </span>
                <span className="ws-item-ex">{excerpt(n.content) || "Empty note"}</span>
                {nb && (
                  <span className="ws-item-tags">
                    <span className="ws-dot" style={{ background: accentOf(nb.id) }} />
                    <span className="ws-tag">{nb.title}</span>
                  </span>
                )}
              </button>
            );
          })}

          {scoped.length === 0 && (
            <div className="ws-blank">
              <span className="ws-blank-mark">◌</span>
              <p style={{ fontSize: "0.82rem" }}>
                {query ? "Nothing matches your filter." : "No notes here yet."}
              </p>
              {!query && (
                <button type="button" className="ws-btn" data-variant="outline" onClick={() => void newNote()}>
                  Create the first note
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ------------------ MAIN: reader / editor ------------------ */}
      <main className="ws-main">
        {!active ? (
          <div className="ws-blank">
            <span className="ws-blank-mark">◧</span>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "hsl(var(--foreground))" }}>
              Select a note to read
            </h2>
            <p style={{ fontSize: "0.8rem", maxWidth: 380 }}>
              Pick a note from the list, or start a new one. Use
              <span className="ws-kbd" style={{ margin: "0 0.3rem" }}>Ctrl K</span>
              to jump anywhere instantly.
            </p>
            <button type="button" className="ws-btn" data-variant="solid" onClick={() => void newNote()}>
              + New note
            </button>
          </div>
        ) : (
          <>
            {/* toolbar row */}
            <div className="ws-pane-head">
              <button
                type="button"
                className="ws-btn ws-icon-btn ws-back"
                title="Back to list"
                onClick={() => setPane("list")}
              >
                ‹
              </button>
              <div className="ws-crumb" style={{ flex: 1 }}>
                {activeNb && (
                  <>
                    <span className="ws-dot" style={{ background: accent }} />
                    <span>{activeNb.title}</span>
                    <span>/</span>
                  </>
                )}
                <b style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {active.title}
                </b>
              </div>

              <span className="ws-status" data-tone={SAVE_LABEL[save].tone}>
                {SAVE_LABEL[save].text}
              </span>

              <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                <button
                  type="button"
                  className="ws-btn"
                  data-active={mode === "read"}
                  onClick={() => setMode("read")}
                  title="Read mode"
                >
                  Read
                </button>
                <button
                  type="button"
                  className="ws-btn"
                  data-active={mode === "write"}
                  onClick={() => setMode("write")}
                  title="Write mode (Ctrl+E)"
                >
                  Write
                </button>
                <span className="ws-tool-sep" />
                <button
                  type="button"
                  className="ws-btn ws-icon-btn"
                  data-active={active.pinned}
                  title={active.pinned ? "Unpin" : "Pin"}
                  onClick={() => patchNote(active.id, { pinned: !active.pinned })}
                >
                  ★
                </button>
                <button
                  type="button"
                  className="ws-btn ws-icon-btn"
                  title="Focus mode"
                  data-active={zen}
                  onClick={() => setZen((v) => !v)}
                >
                  ⛶
                </button>
                <button
                  type="button"
                  className="ws-btn ws-icon-btn"
                  title="Download as Markdown"
                  onClick={() => downloadNote(active)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="ws-btn ws-icon-btn"
                  data-variant="danger"
                  title="Delete note"
                  onClick={() => void removeNote(active)}
                >
                  ✕
                </button>
              </div>
            </div>

            {mode === "read" ? (
              /* ---------------- READ ---------------- */
              <div className="ws-scroll" style={{ flex: 1 }}>
                <article className="ws-reader">
                  <div style={{ maxWidth: "74ch", marginInline: "auto" }}>
                    <h1 className="ws-doc-title">{active.title}</h1>
                    <div className="ws-doc-meta">
                      {activeNb && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                          <span className="ws-dot" style={{ background: accent }} />
                          {activeNb.title}
                        </span>
                      )}
                      <span>{fullDate(active.updatedAt)}</span>
                      <span>{countWords(active.content)} words</span>
                      <span style={{ flex: 1 }} />
                      <span style={{ display: "inline-flex", gap: 2 }}>
                        <button
                          type="button"
                          className="ws-btn ws-icon-btn"
                          title="Smaller text"
                          onClick={() => setScale((s) => Math.max(0.85, +(s - 0.05).toFixed(2)))}
                        >
                          A−
                        </button>
                        <button
                          type="button"
                          className="ws-btn ws-icon-btn"
                          title="Larger text"
                          onClick={() => setScale((s) => Math.min(1.5, +(s + 0.05).toFixed(2)))}
                        >
                          A+
                        </button>
                        <button
                          type="button"
                          className="ws-btn"
                          data-variant="outline"
                          onClick={() => setMode("write")}
                        >
                          Edit
                        </button>
                      </span>
                    </div>
                  </div>
                  <NoteBody content={active.content} scale={scale} />
                </article>
              </div>
            ) : (
              /* ---------------- WRITE ---------------- */
              <>
                <div style={{ padding: "1rem 1.6rem 0.5rem" }}>
                  <input
                    className="ws-title-input"
                    value={active.title}
                    placeholder="Note title…"
                    onChange={(e) => patchNote(active.id, { title: e.target.value })}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.6rem" }}>
                    <span className="ws-eyebrow">Notebook</span>
                    <select
                      className="ws-input"
                      style={{ width: "auto", minWidth: 180 }}
                      value={active.notebookId ?? ""}
                      onChange={(e) =>
                        patchNote(active.id, { notebookId: e.target.value || null })
                      }
                    >
                      <option value="">Unfiled</option>
                      {notebooks.map((nb) => (
                        <option key={nb.id} value={nb.id}>
                          {nb.title}
                        </option>
                      ))}
                    </select>
                    <span style={{ flex: 1 }} />
                    <button
                      type="button"
                      className="ws-btn"
                      data-active={preview}
                      onClick={() => setPreview((v) => !v)}
                    >
                      Preview
                    </button>
                  </div>
                </div>

                <div className="ws-toolbar">
                  <button type="button" className="ws-tool" title="Bold" onClick={() => wrap("**", "**", "bold")}>
                    <b>B</b>
                  </button>
                  <button type="button" className="ws-tool" title="Italic" onClick={() => wrap("*", "*", "italic")}>
                    <i>I</i>
                  </button>
                  <button type="button" className="ws-tool" title="Highlight" onClick={() => wrap("==", "==", "highlight")}>
                    <span style={{ background: "hsl(48 96% 60% / 0.5)", padding: "0 3px", borderRadius: 3 }}>H</span>
                  </button>
                  <button type="button" className="ws-tool" title="Inline code" onClick={() => wrap("`", "`", "code")}>
                    {"</>"}
                  </button>
                  <span className="ws-tool-sep" />
                  <button type="button" className="ws-tool" title="Heading" onClick={() => insert("\n## Section\n")}>
                    H2
                  </button>
                  <button type="button" className="ws-tool" title="Sub-heading" onClick={() => insert("\n### Sub-section\n")}>
                    H3
                  </button>
                  <button type="button" className="ws-tool" title="Bullet list" onClick={() => insert("\n- ")}>
                    •
                  </button>
                  <button type="button" className="ws-tool" title="Checklist" onClick={() => insert("\n- [ ] ")}>
                    ☐
                  </button>
                  <button
                    type="button"
                    className="ws-tool"
                    title="Table"
                    onClick={() => insert("\n| Column | Column |\n| --- | --- |\n| value | value |\n")}
                  >
                    ⊞
                  </button>
                  <button type="button" className="ws-tool" title="Divider" onClick={() => insert("\n\n---\n\n")}>
                    —
                  </button>
                  <span className="ws-tool-sep" />
                  <button type="button" className="ws-tool" title="Inline formula" onClick={() => wrap("$", "$", "x^2")}>
                    ƒx
                  </button>
                  <button
                    type="button"
                    className="ws-tool"
                    title="Display formula"
                    onClick={() => insert("\n$$\n\\int_a^b f(x)\\,dx\n$$\n")}
                  >
                    ∑
                  </button>
                  <span className="ws-tool-sep" />
                  {BOX_ORDER.map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      className="ws-tool"
                      title={BOXES[kind].label}
                      onClick={() => insert(TPL[kind])}
                    >
                      <span className={"ws-swatch " + BOXES[kind].cls} />
                      <span style={{ fontSize: "0.68rem" }}>{BOXES[kind].label}</span>
                    </button>
                  ))}
                  <span className="ws-tool-sep" />
                  <button
                    type="button"
                    className="ws-tool"
                    title="Insert image (or just paste with Ctrl+V)"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? "…" : "▣ Image"}
                  </button>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: "0.66rem", color: "hsl(var(--muted-foreground))" }}>
                    Autosaves · <span className="ws-kbd">Ctrl S</span>
                  </span>
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadImage(f);
                    e.target.value = "";
                  }}
                />

                <div className="ws-split" data-preview={preview ? "true" : "false"}>
                  <div className="ws-scroll">
                    <textarea
                      ref={taRef}
                      className="ws-editor"
                      value={active.content}
                      placeholder={"Write here…\n\nTry the toolbar: definitions, key points, exercises with a hidden solution.\nMath: $e^{i\\pi}+1=0$\nPaste a screenshot directly with Ctrl+V."}
                      onChange={(e) => patchNote(active.id, { content: e.target.value })}
                      onPaste={(e) => {
                        const items = Array.from(e.clipboardData?.items ?? []);
                        const img = items.find((it) => it.type.startsWith("image/"));
                        if (img) {
                          const file = img.getAsFile();
                          if (file) {
                            e.preventDefault();
                            void uploadImage(file);
                          }
                        }
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        const file = e.dataTransfer?.files?.[0];
                        if (file && file.type.startsWith("image/")) {
                          e.preventDefault();
                          void uploadImage(file);
                        }
                      }}
                    />
                  </div>
                  {preview && (
                    <div className="ws-scroll" style={{ padding: "1.4rem 1.6rem 4rem" }}>
                      <NoteBody content={active.content} scale={1} />
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* ------------------ COMMAND PALETTE ------------------ */}
      {paletteOpen && (
        <Palette
          notes={notes}
          notebooks={notebooks}
          onClose={() => setPaletteOpen(false)}
          onPick={(id) => {
            setPaletteOpen(false);
            openNote(id);
          }}
          onNew={() => {
            setPaletteOpen(false);
            void newNote();
          }}
        />
      )}
    </div>
  );
}

// ==========================================================================
//  Command palette
// ==========================================================================

function Palette({
  notes,
  notebooks,
  onClose,
  onPick,
  onNew,
}: {
  notes: MyNote[];
  notebooks: MyNotebook[];
  onClose: () => void;
  onPick: (id: string) => void;
  onNew: () => void;
}) {
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const base = [...notes].sort((a, b) =>
      String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""))
    );
    if (!needle) return base.slice(0, 12);
    return base
      .filter(
        (n) =>
          n.title.toLowerCase().includes(needle) ||
          n.content.toLowerCase().includes(needle)
      )
      .slice(0, 20);
  }, [q, notes]);

  useEffect(() => setCursor(0), [q]);

  return (
    <div className="ws-overlay" onMouseDown={onClose}>
      <div className="ws-palette" onMouseDown={(e) => e.stopPropagation()}>
        <input
          autoFocus
          className="ws-palette-input"
          placeholder="Search notes…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setCursor((c) => Math.min(results.length - 1, c + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setCursor((c) => Math.max(0, c - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const hit = results[cursor];
              if (hit) onPick(hit.id);
              else onNew();
            } else if (e.key === "Escape") {
              onClose();
            }
          }}
        />
        <div className="ws-scroll" style={{ flex: 1 }}>
          {results.map((n, i) => {
            const nb = n.notebookId ? notebooks.find((b) => b.id === n.notebookId) : null;
            return (
              <button
                key={n.id}
                type="button"
                className="ws-palette-row"
                data-active={i === cursor}
                onMouseEnter={() => setCursor(i)}
                onClick={() => onPick(n.id)}
              >
                <span
                  className="ws-dot"
                  style={{ background: nb ? accentOf(nb.id) : "hsl(var(--muted-foreground))" }}
                />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: "0.84rem",
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {n.title}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontSize: "0.7rem",
                      color: "hsl(var(--muted-foreground))",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {nb ? nb.title + " · " : ""}
                    {excerpt(n.content, 70) || "Empty note"}
                  </span>
                </span>
                <span className="ws-item-date">{relTime(n.updatedAt)}</span>
              </button>
            );
          })}

          {results.length === 0 && (
            <button type="button" className="ws-palette-row" data-active="true" onClick={onNew}>
              <span className="ws-dot" style={{ background: "hsl(var(--primary))" }} />
              <span style={{ fontSize: "0.84rem", fontWeight: 600 }}>
                Create a new note{q ? ": \u201c" + q + "\u201d" : ""}
              </span>
            </button>
          )}
        </div>
        <div
          style={{
            display: "flex",
            gap: "0.6rem",
            padding: "0.45rem 0.9rem",
            borderTop: "1px solid hsl(var(--border))",
            fontSize: "0.66rem",
            color: "hsl(var(--muted-foreground))",
          }}
        >
          <span>
            <span className="ws-kbd">↑↓</span> navigate
          </span>
          <span>
            <span className="ws-kbd">↵</span> open
          </span>
          <span>
            <span className="ws-kbd">Esc</span> close
          </span>
        </div>
      </div>
    </div>
  );
}
