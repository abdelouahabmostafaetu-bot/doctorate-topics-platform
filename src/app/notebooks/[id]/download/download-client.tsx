"use client";

import React from "react";
import Link from "next/link";

type P = { number: number; title: string | null; chars: number };

const STAGES = [
  "\u062a\u062d\u0636\u064a\u0631 \u0627\u0644\u0645\u062d\u062a\u0648\u0649",
  "\u062a\u0631\u062a\u064a\u0628 \u0627\u0644\u0635\u0641\u062d\u0627\u062a \u0648\u0627\u0644\u0641\u0647\u0631\u0633",
  "\u0631\u0633\u0645 \u0627\u0644\u0645\u0639\u0627\u062f\u0644\u0627\u062a \u0648\u0627\u0644\u0635\u0648\u0631",
  "\u0625\u0646\u062a\u0627\u062c \u0645\u0644\u0641 PDF",
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
      if (!res.ok) throw new Error("\u062a\u0639\u0630\u0651\u0631 \u0625\u0646\u062a\u0627\u062c \u0627\u0644\u0645\u0644\u0641");

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
      setError(e instanceof Error ? e.message : "\u062e\u0637\u0623 \u063a\u064a\u0631 \u0645\u062a\u0648\u0642\u0639");
    } finally {
      setRunning(false);
      setStage(STAGES.length - 1);
    }
  }

  return (
    <main className="nb-dl" dir="rtl" style={{ ["--nb-accent" as string]: color }}>
      <div className="nb-dl-card">
        <Link href={"/notebooks/" + id} className="nb-back">→ العودة إلى الكرّاس</Link>

        <div className="nb-dl-head">
          <span className="nb-dl-badge">تحميل PDF</span>
          <h1 className="nb-dl-title">{title}</h1>
          {subtitle && <p className="nb-dl-sub">{subtitle}</p>}
        </div>

        <div className="nb-dl-opts">
          <div className="nb-dl-row">
            <button className="nb-btn" onClick={() => setSelected(pages.map((p) => p.number))}>
              اختيار الكل
            </button>
            <button className="nb-btn" onClick={() => setSelected([])}>إلغاء الكل</button>
            <label className="nb-check">
              <input type="checkbox" checked={toc} onChange={(e) => setToc(e.target.checked)} />
              إضافة صفحة الفهرس والشكر
            </label>
            <span className="nb-dl-count">{selected.length} / {pages.length} صفحة</span>
          </div>

          <div className="nb-dl-pages">
            {pages.map((p) => (
              <button
                key={p.number}
                className={"nb-dl-page" + (selected.includes(p.number) ? " is-on" : "")}
                onClick={() => toggle(p.number)}
              >
                <span className="nb-dl-num">{p.number}</span>
                <span className="nb-dl-name">{p.title || "صفحة " + p.number}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          className="nb-dl-go"
          onClick={run}
          disabled={running || selected.length === 0}
        >
          {running ? "جارٍ التحضير…" : "⤓ تحميل الملف"}
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
            {running && <p className="nb-dl-timer">{seconds} ثانية… الملفات الكبيرة تأخذ وقتاً أطول</p>}
            {done && <p className="nb-dl-ok">✓ تم إنشاء الملف وتحميله</p>}
            {error && <p className="nb-dl-err">{error}</p>}
          </div>
        )}

        <p className="nb-dl-note">
          يُطبع الملف بنفس قالب مواضيع المنصة: غلاف أمامي، بسملة وشكر، فهرس، ثم الصفحات مرقّمة وغلاف خلفي.
        </p>
      </div>
    </main>
  );
}
