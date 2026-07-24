"use client";

import React from "react";
import Link from "next/link";

type P = { number: number; title: string | null; chars: number };

const STAGES = [
  "Preparing content",
  "Ordering pages and contents",
  "Rendering math and images",
  "Producing PDF file",
];

export default function DownloadClient({
  id,
  title,
  subtitle,
  color,
  pages,
}: {
  id: string;
  title: string;
  subtitle: string | null;
  color: string;
  pages: P[];
}) {
  const [selected, setSelected] = React.useState<number[]>(pages.map((p) => p.number));
  const [toc, setToc] = React.useState(true);
  const [running, setRunning] = React.useState(false);
  const [stage, setStage] = React.useState(0);
  const [seconds, setSeconds] = React.useState(0);
  const [error, setError] = React.useState("");
  const [done, setDone] = React.useState(false);

  const all = selected.length === pages.length;

  React.useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    const st = setInterval(
      () => setStage((s) => (s < STAGES.length - 1 ? s + 1 : s)),
      4000
    );
    return () => {
      clearInterval(t);
      clearInterval(st);
    };
  }, [running]);

  function toggle(n: number) {
    setSelected((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n].sort((a, b) => a - b)
    );
  }

  async function run() {
    if (selected.length === 0) return;
    setRunning(true);
    setDone(false);
    setError("");
    setStage(0);
    setSeconds(0);

    try {
      const qs = new URLSearchParams();
      if (!all) qs.set("pages", selected.join(","));
      qs.set("toc", toc ? "1" : "0");

      const res = await fetch("/api/notebooks/" + id + "/pdf?" + qs.toString());
      if (!res.ok) throw new Error("Could not generate the file");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = title.replace(/[\\/:*?"<>|]+/g, " ").trim() + ".pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setRunning(false);
      setStage(STAGES.length - 1);
    }
  }

  return (
    <main className="nb-dl" dir="ltr" style={{ ["--nb-accent" as string]: color }}>
      <div className="nb-dl-card">
        <Link href={"/notebooks/" + id} className="nb-back">&larr; Back to notebook</Link>

        <div className="nb-dl-head">
          <span className="nb-dl-badge">PDF export</span>
          <h1 className="nb-dl-title">{title}</h1>
          {subtitle && <p className="nb-dl-sub">{subtitle}</p>}
        </div>

        <div className="nb-dl-opts">
          <div className="nb-dl-row">
            <button className="nb-btn" onClick={() => setSelected(pages.map((p) => p.number))}>
              Select all
            </button>
            <button className="nb-btn" onClick={() => setSelected([])}>Clear</button>
            <label className="nb-check">
              <input type="checkbox" checked={toc} onChange={(e) => setToc(e.target.checked)} />
              Include acknowledgements and table of contents
            </label>
            <span className="nb-dl-count">
              {selected.length} / {pages.length} pages
            </span>
          </div>

          <div className="nb-dl-pages">
            {pages.map((p) => (
              <button
                key={p.number}
                className={"nb-dl-page" + (selected.includes(p.number) ? " is-on" : "")}
                onClick={() => toggle(p.number)}
              >
                <span className="nb-dl-num">{p.number}</span>
                <span className="nb-dl-name">{p.title || "Page " + p.number}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          className="nb-dl-go"
          onClick={run}
          disabled={running || selected.length === 0}
        >
          {running ? "Preparing..." : "Download PDF"}
        </button>

        {(running || done || error) && (
          <div className="nb-dl-progress">
            {STAGES.map((s, i) => (
              <div
                key={s}
                className={
                  "nb-dl-stage" +
                  (i < stage || done ? " is-done" : "") +
                  (i === stage && running ? " is-live" : "")
                }
              >
                <span className="nb-dl-dot" />
                {s}
              </div>
            ))}
            {running && (
              <p className="nb-dl-timer">{seconds}s ... larger notebooks take longer</p>
            )}
            {done && <p className="nb-dl-ok">File generated and downloaded</p>}
            {error && <p className="nb-dl-err">{error}</p>}
          </div>
        )}

        <p className="nb-dl-note">
          The file uses the same template as the platform exam PDFs: front cover, acknowledgements,
          table of contents, numbered pages and a back cover.
        </p>
      </div>
    </main>
  );
}
