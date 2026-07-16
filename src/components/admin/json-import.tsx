"use client";

import { useRef, useState } from "react";
import {
  importExamsJsonAction,
  type ImportFileOutcome,
} from "@/app/admin/import-json/actions";

export function JsonImportForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [outcomes, setOutcomes] = useState<ImportFileOutcome[]>([]);

  function handleSelect() {
    const files = inputRef.current?.files;
    setFileNames(files ? Array.from(files).map((f) => f.name) : []);
    setOutcomes([]);
  }

  async function handleImport() {
    const files = inputRef.current?.files;
    if (!files || files.length === 0 || busy) return;
    setBusy(true);
    setOutcomes([]);
    const all: ImportFileOutcome[] = [];
    for (const file of Array.from(files)) {
      try {
        const text = await file.text();
        const res = await importExamsJsonAction({ fileName: file.name, text });
        all.push(res);
      } catch (e) {
        all.push({
          fileName: file.name,
          results: [{
            index: 0,
            ok: false,
            error: e instanceof Error ? e.message : "فشل الرفع — أعد المحاولة",
          }],
        });
      }
      setOutcomes([...all]);
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    setFileNames([]);
  }

  const totalOk = outcomes.reduce(
    (n, f) => n + f.results.filter((r) => r.ok).length,
    0,
  );
  const totalFail = outcomes.reduce(
    (n, f) => n + f.results.filter((r) => !r.ok).length,
    0,
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed p-4">
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          multiple
          onChange={handleSelect}
          className="block w-full cursor-pointer text-xs file:ml-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-primary-foreground"
        />
        {fileNames.length > 0 ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            المحدد: {fileNames.join(" ، ")}
          </p>
        ) : null}
        <button
          type="button"
          onClick={handleImport}
          disabled={busy || fileNames.length === 0}
          className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "⏳ جارٍ الاستيراد والنشر..." : "🚀 استيراد ونشر مباشرة"}
        </button>
      </div>

      {outcomes.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 text-[11px] font-bold">
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-emerald-700">
              ✅ نُشر: {totalOk}
            </span>
            {totalFail > 0 ? (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-red-700">
                ⚠️ رُفض: {totalFail}
              </span>
            ) : null}
          </div>

          {outcomes.map((f) => (
            <div key={f.fileName} className="rounded-xl border p-3">
              <p className="text-xs font-bold">📄 {f.fileName}</p>
              <ul className="mt-2 space-y-1.5">
                {f.results.map((r) => (
                  <li
                    key={r.index}
                    className={
                      "rounded-lg px-2.5 py-1.5 text-[11px] " +
                      (r.ok
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-red-50 text-red-700")
                    }
                  >
                    {r.ok ? (
                      <>
                        ✅ <b>{r.title}</b> — {r.problems} تمرين —{" "}
                        {r.status === "published" ? "منشور" : "مسودة"} —{" "}
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold underline"
                        >
                          فتح الموضوع ↗
                        </a>
                      </>
                    ) : (
                      <>
                        ⚠️ {r.title ? <b>{r.title}: </b> : null}
                        {r.error}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* بعض المتصفحات تمنع الحافظة — يبقى التحديد اليدوي متاحًا */
    }
  }

  return (
    <div className="rounded-xl border">
      <div className="flex items-center justify-between gap-2 border-b bg-secondary/40 px-3 py-2">
        <span className="text-xs font-bold">{label}</span>
        <button
          type="button"
          onClick={copy}
          className="rounded-lg border px-2.5 py-1 text-[11px] font-bold hover:bg-secondary"
        >
          {copied ? "✅ نُسخ" : "📋 نسخ"}
        </button>
      </div>
      <pre
        dir="ltr"
        className="max-h-72 overflow-auto whitespace-pre-wrap p-3 text-left text-[11px] leading-relaxed"
      >
        {text}
      </pre>
    </div>
  );
}
