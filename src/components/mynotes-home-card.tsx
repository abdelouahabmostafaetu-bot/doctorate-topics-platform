"use client";

// =============================================================
//  Home page entry point for the private study workspace.
//  Renders nothing at all unless the visitor is the super admin.
// =============================================================

import { useEffect, useState } from "react";
import Link from "next/link";

type Recent = { id: string; title: string; updatedAt: string | null };

type Summary = {
  isSuper: boolean;
  notebooks: number;
  notes: number;
  recent: Recent[];
};

function relTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return min + " min ago";
  const hr = Math.round(min / 60);
  if (hr < 24) return hr + "h ago";
  const day = Math.round(hr / 24);
  if (day < 7) return day + "d ago";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function MyNotesHomeCard() {
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/mynotes/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((json: Summary | null) => {
        if (alive && json && json.isSuper) setData(json);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (!data) return null;

  return (
    <section className="container mx-auto px-4 py-6">
      <Link
        href="/admin/notes"
        className="group block overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/40 hover:shadow-lg"
      >
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6">
          {/* mark */}
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-primary/10 text-xl text-primary">
            ◧
          </div>

          {/* text */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold tracking-tight">My Notes</h2>
              <span className="rounded-full border border-border px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wider text-muted-foreground">
                Private
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Definitions, remarks and exercises for the doctorate — written in Markdown
              with LaTeX, colour-coded and searchable.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                <b className="text-foreground">{data.notebooks}</b> notebooks
              </span>
              <span>
                <b className="text-foreground">{data.notes}</b> notes
              </span>
            </div>

            {data.recent.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-border pt-3">
                {data.recent.slice(0, 3).map((r) => (
                  <li key={r.id} className="flex items-baseline gap-2 text-xs">
                    <span className="h-1.5 w-1.5 flex-none rounded-full bg-primary/50" />
                    <span className="min-w-0 flex-1 truncate text-foreground/85">{r.title}</span>
                    <span className="flex-none text-[0.66rem] text-muted-foreground">
                      {relTime(r.updatedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* action */}
          <div className="flex flex-none items-center gap-1 text-sm font-semibold text-primary">
            Open
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </div>
        </div>
      </Link>
    </section>
  );
}

export default MyNotesHomeCard;
