"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageBody, BOXES, BOX_ORDER, TPL, excerpt, type BoxKind } from "../markdown";
import {
  createPageAction,
  updatePageAction,
  deletePageAction,
  movePageAction,
} from "../actions";

type Pg = {
  id: string;
  number: number;
  title: string | null;
  content: string;
  updatedAt: string;
};

type Nb = {
  id: string;
  title: string;
  subtitle: string | null;
  color: string;
  coverId: string | null;
  pageCount: number;
  updatedAt: string;
  pages: Pg[];
};

const FONT_STEPS = [0.82, 0.9, 0.98, 1.08, 1.2];
const WIDTH_STEPS = ["680px", "800px", "960px"];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("read error"));
    r.readAsDataURL(file);
  });
}

export default function BookClient({ notebook }: { notebook: Nb }) {
  const router = useRouter();

  const [pages, setPages] = React.useState<Pg[]>(notebook.pages);
  const [activeId, setActiveId] = React.useState<string | null>(
    notebook.pages[0]?.id ?? null
  );
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [draftTitle, setDraftTitle] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [fontIdx, setFontIdx] = React.useState(1);
  const [widthIdx, setWidthIdx] = React.useState(1);
  const [zen, setZen] = React.useState(false);
  const [showIndex, setShowIndex] = React.useState(true);
  const [split, setSplit] = React.useState(true);

  const taRef = React.useRef<HTMLTextAreaElement | null>(null);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = pages.find((p) => p.id === activeId) ?? null;
  const activeIdx = active ? pages.findIndex((p) => p.id === active.id) : -1;

  // ---------- load a page into the editor ----------
  React.useEffect(() => {
    if (!active) return;
    setDraft(active.content);
    setDraftTitle(active.title ?? "");
    setEditing(false);
    setStatus("");
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- autosave ----------
  const scheduleSave = React.useCallback(
    (content: string, title: string) => {
      if (!activeId) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setStatus("Saving...");
      saveTimer.current = setTimeout(async () => {
        try {
          await updatePageAction({ id: activeId, content, title });
          setPages((prev) =>
            prev.map((p) =>
              p.id === activeId ? { ...p, content, title: title.trim() || null } : p
            )
          );
          setStatus("Saved");
        } catch {
          setStatus("Save failed");
        }
      }, 700);
    },
    [activeId]
  );

  function onDraftChange(v: string) {
    setDraft(v);
    scheduleSave(v, draftTitle);
  }

  function onTitleChange(v: string) {
    setDraftTitle(v);
    scheduleSave(draft, v);
  }

  async function saveNow() {
    if (!activeId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await updatePageAction({ id: activeId, content: draft, title: draftTitle });
    setPages((prev) =>
      prev.map((p) =>
        p.id === activeId
          ? { ...p, content: draft, title: draftTitle.trim() || null }
          : p
      )
    );
    setStatus("Saved");
  }

  // ---------- toolbar helpers ----------
  function surround(before: string, after = before, placeholder = "") {
    const ta = taRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const sel = draft.slice(s, e) || placeholder;
    const next = draft.slice(0, s) + before + sel + after + draft.slice(e);
    onDraftChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = s + before.length;
      ta.selectionEnd = s + before.length + sel.length;
    });
  }

  function insertBlock(text: string) {
    const ta = taRef.current;
    if (!ta) {
      onDraftChange(draft + text);
      return;
    }
    const s = ta.selectionStart;
    const next = draft.slice(0, s) + text + draft.slice(s);
    onDraftChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = s + text.length;
    });
  }

  function linePrefix(prefix: string) {
    const ta = taRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const start = draft.lastIndexOf("\n", s - 1) + 1;
    const end = draft.indexOf("\n", e) === -1 ? draft.length : draft.indexOf("\n", e);
    const block = draft.slice(start, end);
    const next =
      draft.slice(0, start) +
      block
        .split("\n")
        .map((l) => (l.startsWith(prefix) ? l.slice(prefix.length) : prefix + l))
        .join("\n") +
      draft.slice(end);
    onDraftChange(next);
    requestAnimationFrame(() => ta.focus());
  }

  async function insertImage(file: File) {
    try {
      setStatus("Uploading image...");
      const dataUrl = await fileToDataUrl(file);
      const res = await fetch("/api/notebooks/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      if (!res.ok) throw new Error("upload");
      const { url } = (await res.json()) as { url: string };
      insertBlock("\n![image](" + url + ")\n");
      setStatus("Image added");
    } catch {
      setStatus("Image upload failed");
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const item = Array.from(e.clipboardData.items).find((i) =>
      i.type.startsWith("image/")
    );
    if (!item) return;
    const file = item.getAsFile();
    if (!file) return;
    e.preventDefault();
    insertImage(file);
  }

  // ---------- page operations ----------
  async function addPage() {
    const res = await createPageAction({
      notebookId: notebook.id,
      title: "",
      content: "",
    });
    const pg: Pg = {
      id: res.id,
      number: res.number,
      title: res.title,
      content: res.content,
      updatedAt: res.updatedAt,
    };
    setPages((prev) => [...prev, pg]);
    setActiveId(pg.id);
    setEditing(true);
    router.refresh();
  }

  async function removePage(id: string, number: number) {
    if (!window.confirm("Delete page " + number + "?")) return;
    await deletePageAction({ id });
    setPages((prev) =>
      prev
        .filter((p) => p.id !== id)
        .map((p) => (p.number > number ? { ...p, number: p.number - 1 } : p))
    );
    setActiveId((cur) => (cur === id ? null : cur));
    router.refresh();
  }

  async function movePage(id: string, direction: "up" | "down") {
    await movePageAction({ id, direction });
    setPages((prev) => {
      const i = prev.findIndex((p) => p.id === id);
      const j = direction === "up" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      const a = copy[i];
      const b = copy[j];
      copy[i] = { ...b, number: a.number };
      copy[j] = { ...a, number: b.number };
      return copy.sort((x, y) => x.number - y.number);
    });
    router.refresh();
  }

  function goto(delta: number) {
    if (activeIdx < 0) return;
    const next = pages[activeIdx + delta];
    if (next) setActiveId(next.id);
  }

  // ---------- keyboard shortcuts ----------
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveNow();
      } else if (meta && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setEditing((v) => !v);
      } else if (meta && e.key.toLowerCase() === "b") {
        e.preventDefault();
        surround("**");
      } else if (meta && e.key.toLowerCase() === "i") {
        e.preventDefault();
        surround("*");
      } else if (e.key === "Escape" && zen) {
        setZen(false);
      } else if (!editing && e.key === "ArrowRight") {
        goto(1);
      } else if (!editing && e.key === "ArrowLeft") {
        goto(-1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // re-bind each render so handlers see fresh state

  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0;

  return (
    <main className={"nb-book" + (zen ? " is-zen" : "")} dir="ltr">
      {/* ================= header ================= */}
      <header className="nb-book-top" style={{ ["--nb-accent" as string]: notebook.color }}>
        <div className="nb-book-id">
          <Link href="/notebooks" className="nb-back">&larr; Notebooks</Link>
          <h1 className="nb-book-title">{notebook.title}</h1>
          {notebook.subtitle && <p className="nb-book-sub">{notebook.subtitle}</p>}
        </div>

        <div className="nb-book-tools">
          <span className="nb-status">{status}</span>

          <div className="nb-seg">
            <button className="nb-mini" title="Smaller text" onClick={() => setFontIdx((i) => Math.max(0, i - 1))}>A-</button>
            <button className="nb-mini" title="Larger text" onClick={() => setFontIdx((i) => Math.min(FONT_STEPS.length - 1, i + 1))}>A+</button>
            <button className="nb-mini" title="Page width" onClick={() => setWidthIdx((i) => (i + 1) % WIDTH_STEPS.length)}>&harr;</button>
            <button className="nb-mini" title="Table of contents" onClick={() => setShowIndex((v) => !v)}>&#9776;</button>
            <button className="nb-mini" title="Focus mode" onClick={() => setZen((v) => !v)}>&#9633;</button>
          </div>

          <Link className="nb-btn" href={"/notebooks/" + notebook.id + "/download"}>&#8659; PDF</Link>
          <button className="nb-btn nb-btn-primary" onClick={addPage}>+ New page</button>
        </div>
      </header>

      <div className="nb-book-grid">
        {/* ================= index ================= */}
        {showIndex && (
          <aside className="nb-index">
            <div className="nb-index-head">Contents ({pages.length})</div>
            <ol className="nb-index-list">
              {pages.map((p) => (
                <li key={p.id}>
                  <button
                    className={"nb-index-item" + (p.id === activeId ? " is-on" : "")}
                    onClick={() => setActiveId(p.id)}
                  >
                    <span className="nb-index-num">{p.number}</span>
                    <span className="nb-index-text">
                      <strong>{p.title || "Page " + p.number}</strong>
                      <em>{excerpt(p.content, 60) || "Empty"}</em>
                    </span>
                  </button>
                  <span className="nb-index-ops">
                    <button className="nb-mini" title="Move up" onClick={() => movePage(p.id, "up")}>&uarr;</button>
                    <button className="nb-mini" title="Move down" onClick={() => movePage(p.id, "down")}>&darr;</button>
                    <button className="nb-mini nb-mini-danger" title="Delete" onClick={() => removePage(p.id, p.number)}>&#10005;</button>
                  </span>
                </li>
              ))}
            </ol>
            <button className="nb-index-add" onClick={addPage}>+ New page</button>
          </aside>
        )}

        {/* ================= sheet ================= */}
        <section className="nb-stage">
          {!active ? (
            <div className="nb-empty">
              <div className="nb-empty-mark">&#9671;</div>
              <p>No pages yet.</p>
              <button className="nb-btn nb-btn-primary" onClick={addPage}>+ First page</button>
            </div>
          ) : (
            <>
              <div className="nb-sheet-bar">
                <button className="nb-mini" onClick={() => goto(-1)} disabled={activeIdx <= 0}>&larr;</button>
                <span className="nb-sheet-count">
                  Page {active.number} of {pages.length}
                </span>
                <button className="nb-mini" onClick={() => goto(1)} disabled={activeIdx >= pages.length - 1}>&rarr;</button>
                <span className="nb-sheet-gap" />
                <span className="nb-sheet-count">{wordCount} words</span>
                <button className="nb-mini" onClick={() => setSplit((v) => !v)} title="Split view">&#9707;</button>
                <button
                  className={"nb-btn" + (editing ? " nb-btn-primary" : "")}
                  onClick={() => (editing ? (saveNow(), setEditing(false)) : setEditing(true))}
                >
                  {editing ? "Save & close" : "Edit"}
                </button>
              </div>

              {editing && (
                <div className="nb-toolbar">
                  <button className="nb-tool" title="Bold" onClick={() => surround("**", "**", "text")}><b>B</b></button>
                  <button className="nb-tool" title="Italic" onClick={() => surround("*", "*", "text")}><i>I</i></button>
                  <button className="nb-tool" title="Highlight" onClick={() => surround("==", "==", "important")}>&#9617;</button>
                  <button className="nb-tool" title="Strikethrough" onClick={() => surround("~~", "~~", "text")}>S</button>
                  <span className="nb-tool-sep" />
                  <button className="nb-tool" title="Heading 1" onClick={() => linePrefix("# ")}>H1</button>
                  <button className="nb-tool" title="Heading 2" onClick={() => linePrefix("## ")}>H2</button>
                  <button className="nb-tool" title="Heading 3" onClick={() => linePrefix("### ")}>H3</button>
                  <button className="nb-tool" title="Bullet list" onClick={() => linePrefix("- ")}>&bull;</button>
                  <button className="nb-tool" title="Numbered list" onClick={() => linePrefix("1. ")}>1.</button>
                  <button className="nb-tool" title="Checklist" onClick={() => linePrefix("- [ ] ")}>&#9745;</button>
                  <button className="nb-tool" title="Quote" onClick={() => linePrefix("> ")}>&#8221;</button>
                  <span className="nb-tool-sep" />
                  <button className="nb-tool" title="Inline math" onClick={() => surround("$", "$", "x^2")}>$x$</button>
                  <button className="nb-tool" title="Display math" onClick={() => insertBlock("\n$$\n\\int_0^1 f(x)\\,dx\n$$\n")}>$$</button>
                  <button className="nb-tool" title="Table" onClick={() => insertBlock("\n| Column 1 | Column 2 |\n| --- | --- |\n| value | value |\n")}>&#9638;</button>
                  <button className="nb-tool" title="Code block" onClick={() => insertBlock("\n```\ncode\n```\n")}>{"</>"}</button>
                  <button className="nb-tool" title="Divider" onClick={() => insertBlock("\n---\n")}>&mdash;</button>
                  <label className="nb-tool" title="Image">
                    &#9729;
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) insertImage(f);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <span className="nb-tool-sep" />
                  {BOX_ORDER.map((k: BoxKind) => (
                    <button
                      key={k}
                      className={"nb-tool nb-tool-box " + BOXES[k].cls}
                      title={BOXES[k].label}
                      onClick={() => insertBlock(TPL[k])}
                    >
                      <span aria-hidden="true">{BOXES[k].mark}</span>
                      <span className="nb-tool-label">{BOXES[k].label}</span>
                    </button>
                  ))}
                </div>
              )}

              <div
                className={"nb-sheet" + (editing && split ? " is-split" : "")}
                style={{ ["--nb-width" as string]: WIDTH_STEPS[widthIdx] }}
              >
                {editing && (
                  <div className="nb-pane nb-pane-edit">
                    <input
                      className="nb-sheet-title"
                      placeholder="Page title (optional)"
                      value={draftTitle}
                      onChange={(e) => onTitleChange(e.target.value)}
                    />
                    <textarea
                      ref={taRef}
                      className="nb-textarea"
                      value={draft}
                      onChange={(e) => onDraftChange(e.target.value)}
                      onPaste={onPaste}
                      spellCheck={false}
                      placeholder="Write here... Markdown, LaTeX and colored study boxes are supported."
                    />
                  </div>
                )}

                {(!editing || split) && (
                  <article className="nb-pane nb-pane-read">
                    <div className="nb-paper">
                      <div className="nb-paper-head">
                        <span className="nb-paper-num">Page {active.number}</span>
                        {(editing ? draftTitle : active.title) && (
                          <h2 className="nb-paper-title">{editing ? draftTitle : active.title}</h2>
                        )}
                      </div>
                      <PageBody
                        content={editing ? draft : active.content}
                        scale={FONT_STEPS[fontIdx]}
                      />
                      <div className="nb-paper-foot">{active.number}</div>
                    </div>
                  </article>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
