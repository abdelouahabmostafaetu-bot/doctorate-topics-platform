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
    const q = query.trim();
    if (!q) return items;
    return items.filter(
      (n) => n.title.includes(q) || (n.subtitle || "").includes(q)
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
    if (!window.confirm("حذف الكرّاس «" + name + "» وكل صفحاته؟ لا يمكن التراجع.")) return;
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
      window.alert("تعذّر رفع الصورة (الحد الأقصى 4 ميغا).");
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
    <main className="nb-shell" dir="rtl">
      <header className="nb-top">
        <div className="nb-top-right">
          <Link href="/" className="nb-back">→ الرئيسية</Link>
          <h1 className="nb-h1">كرّاريسي</h1>
          <p className="nb-lede">
            مساحة خاصة للكتابة والمراجعة · {items.length} كرّاس · {totalPages} صفحة
          </p>
        </div>
        <div className="nb-top-left">
          <input
            className="nb-search"
            placeholder="بحث…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="nb-btn nb-btn-primary" onClick={() => setCreating((v) => !v)}>
            {creating ? "إلغاء" : "+ كرّاس جديد"}
          </button>
        </div>
      </header>

      {creating && (
        <form className="nb-newform" onSubmit={handleCreate}>
          <input
            className="nb-input"
            placeholder="اسم الكرّاس (مثلاً: سلاسل فورييه)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <input
            className="nb-input"
            placeholder="وصف مختصر (اختياري)"
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
            {busy === "new" ? "جارٍ…" : "إنشاء"}
          </button>
        </form>
      )}

      {filtered.length === 0 ? (
        <div className="nb-empty">
          <div className="nb-empty-mark">◇</div>
          <p>لا يوجد أي كرّاس بعد. ابدأ بإنشاء أول كرّاس دراسي.</p>
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
                <p className="nb-card-meta">{n.pageCount} صفحة</p>
              </div>

              <div className="nb-card-tools">
                <label className="nb-mini" title="صورة الغلاف">
                  ☁
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

                <label className="nb-mini" title="اللون">
                  ◉
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
                  title="تحميل PDF"
                >
                  ⤓
                </Link>

                <button
                  className="nb-mini nb-mini-danger"
                  title="حذف"
                  disabled={busy === n.id}
                  onClick={() => handleDelete(n.id, n.title)}
                >
                  ✕
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
