"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createNotebookAction,
  updateNotebookAction,
  deleteNotebookAction,
} from "./actions";

type Card = {
  id: string;
  title: string;
  subtitle: string | null;
  color: string;
  coverId: string | null;
  order: number;
  pageCount: number;
  updatedAt: string;
};

const COLORS = [
  "#163a70",
  "#0f766e",
  "#b45309",
  "#6d28d9",
  "#be123c",
  "#1d4ed8",
  "#a21caf",
  "#4d7c0f",
];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("read error"));
    r.readAsDataURL(file);
  });
}

export default function NotebooksClient({ initial }: { initial: Card[] }) {
  const router = useRouter();
  const [items, setItems] = React.useState<Card[]>(initial);
  const [query, setQuery] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [subtitle, setSubtitle] = React.useState("");
  const [color, setColor] = React.useState(COLORS[0]);
  const [busy, setBusy] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        (n.subtitle || "").toLowerCase().includes(q)
    );
  }, [items, query]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy("new");
    try {
      const res = await createNotebookAction({ title, subtitle, color });
      setItems((prev) => [
        ...prev,
        {
          id: res.id,
          title: title.trim(),
          subtitle: subtitle.trim() || null,
          color,
          coverId: null,
          order: prev.length,
          pageCount: 0,
          updatedAt: new Date().toISOString(),
        },
      ]);
      setTitle("");
      setSubtitle("");
      setCreating(false);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm('Delete the notebook "' + name + '" and all its pages? This cannot be undone.'))
      return;
    setBusy(id);
    try {
      await deleteNotebookAction({ id });
      setItems((prev) => prev.filter((n) => n.id !== id));
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function handleCover(id: string, file: File) {
    setBusy(id);
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await fetch("/api/notebooks/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      if (!res.ok) throw new Error("upload failed");
      const { id: imageId } = (await res.json()) as { id: string };
      await updateNotebookAction({ id, coverId: imageId });
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, coverId: imageId } : n))
      );
    } catch {
      window.alert("Could not upload the image (max 4 MB).");
    } finally {
      setBusy(null);
    }
  }

  async function handleColor(id: string, value: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, color: value } : n)));
    await updateNotebookAction({ id, color: value });
  }

  const totalPages = items.reduce((s, n) => s + n.pageCount, 0);

  return (
    <main className="nb-shell" dir="ltr">
      <header className="nb-top">
        <div className="nb-top-right">
          <Link href="/" className="nb-back">&larr; Home</Link>
          <h1 className="nb-h1">Study Notebooks</h1>
          <p className="nb-lede">
            Private space for writing and revision &middot; {items.length} notebooks &middot;{" "}
            {totalPages} pages
          </p>
        </div>
        <div className="nb-top-left">
          <input
            className="nb-search"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="nb-btn nb-btn-primary" onClick={() => setCreating((v) => !v)}>
            {creating ? "Cancel" : "+ New notebook"}
          </button>
        </div>
      </header>

      {creating && (
        <form className="nb-newform" onSubmit={handleCreate}>
          <input
            className="nb-input"
            placeholder="Notebook name (e.g. Fourier series)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <input
            className="nb-input"
            placeholder="Short description (optional)"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
          />
          <div className="nb-swatches">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={"nb-swatch" + (c === color ? " is-on" : "")}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={c}
              />
            ))}
          </div>
          <button className="nb-btn nb-btn-primary" disabled={busy === "new"}>
            {busy === "new" ? "Working..." : "Create"}
          </button>
        </form>
      )}

      {filtered.length === 0 ? (
        <div className="nb-empty">
          <div className="nb-empty-mark">&#9671;</div>
          <p>No notebooks yet. Start by creating your first study notebook.</p>
        </div>
      ) : (
        <section className="nb-grid">
          {filtered.map((n) => (
            <article key={n.id} className="nb-card" style={{ ["--nb-accent" as string]: n.color }}>
              <Link href={"/notebooks/" + n.id} className="nb-card-cover">
                {n.coverId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={"/api/notebooks/image/" + n.coverId} alt="" />
                ) : (
                  <span className="nb-card-initial">{n.title.slice(0, 1)}</span>
                )}
                <span className="nb-card-spine" />
              </Link>

              <div className="nb-card-body">
                <Link href={"/notebooks/" + n.id} className="nb-card-title">
                  {n.title}
                </Link>
                {n.subtitle && <p className="nb-card-sub">{n.subtitle}</p>}
                <p className="nb-card-meta">
                  {n.pageCount} {n.pageCount === 1 ? "page" : "pages"}
                </p>
              </div>

              <div className="nb-card-tools">
                <label className="nb-mini" title="Cover image">
                  &#9729;
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleCover(n.id, f);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>

                <label className="nb-mini" title="Color">
                  &#9673;
                  <input
                    type="color"
                    hidden
                    value={n.color}
                    onChange={(e) => handleColor(n.id, e.target.value)}
                  />
                </label>

                <Link
                  className="nb-mini"
                  href={"/notebooks/" + n.id + "/download"}
                  title="Download PDF"
                >
                  &#8659;
                </Link>

                <button
                  className="nb-mini nb-mini-danger"
                  title="Delete"
                  disabled={busy === n.id}
                  onClick={() => handleDelete(n.id, n.title)}
                >
                  &#10005;
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
