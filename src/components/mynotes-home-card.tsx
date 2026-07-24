"use client";

// "My Notes" home page card — rendered ONLY for the super admin.
// Fetches a tiny summary from /api/mynotes/summary; other visitors see nothing.
import { useEffect, useState } from "react";
import Link from "next/link";

type Summary = {
  isSuper: boolean;
  notebooks: number | null;
  notes: number | null;
  recent: Array<{ title: string; updatedAt: string | null }>;
};

export function MyNotesHomeCard() {
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/mynotes/summary", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Summary | null) => {
        if (alive && d?.isSuper) setData(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!data) return null;

  return (
    <section className="container mx-auto px-4 pb-10">
      <Link
        href="/admin/notes"
        className="group relative block overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-l from-primary/10 via-card to-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg sm:p-6"
      >
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -left-10 -top-10 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -right-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />

        <div className="relative flex flex-wrap items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
            📝
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold sm:text-lg">My Notes</h2>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                🛡️ Super admin only
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              Your private study space — notebooks, definitions, remarks and
              exercises with Markdown &amp; LaTeX
            </p>

            {data.notes !== null && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                  📒 {data.notebooks} notebooks
                </span>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                  📄 {data.notes} notes
                </span>
              </div>
            )}
          </div>

          {data.recent.length > 0 && (
            <div className="hidden min-w-0 max-w-[16rem] md:block">
              <p className="mb-1 text-[10px] font-bold text-muted-foreground">
                Recently edited
              </p>
              <ul className="space-y-0.5">
                {data.recent.map((n, i) => (
                  <li
                    key={i}
                    dir="auto"
                    className="truncate text-xs text-foreground/80"
                  >
                    • {n.title || "(untitled)"}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <span className="shrink-0 text-sm font-bold text-primary transition-transform duration-300 group-hover:-translate-x-1">
            Open my notes ←
          </span>
        </div>
      </Link>
    </section>
  );
}
