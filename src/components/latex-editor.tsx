"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";

type ToolbarButton = {
  label: string;
  title: string;
  before: string;
  after: string;
  sample: string;
};

const textButtons: ToolbarButton[] = [
  { label: "B", title: "نص غليظ", before: "**", after: "**", sample: "texte" },
  { label: "I", title: "نص مائل", before: "*", after: "*", sample: "texte" },
];

const listButtons: ToolbarButton[] = [
  { label: "1.", title: "قائمة مرقمة (تتواصل تلقائيًا مع Enter)", before: "\n1. ", after: "", sample: "" },
  { label: "-", title: "قائمة نقطية (تتواصل تلقائيًا مع Enter)", before: "\n- ", after: "", sample: "" },
];

function makeGrid(r: number, c: number, prev?: string[][]): string[][] {
  return Array.from({ length: r }, (_, i) =>
    Array.from({ length: c }, (_, j) => prev?.[i]?.[j] ?? "")
  );
}

export function LatexEditor({
  value,
  onChange,
  rows = 6,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [showTable, setShowTable] = useState(false);
  const [tRows, setTRows] = useState(3);
  const [tCols, setTCols] = useState(3);
  const [cells, setCells] = useState<string[][]>(() => makeGrid(3, 3));

  function setValueAndCursor(next: string, selStart: number, selEnd: number) {
    onChange(next);
    const el = ref.current;
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(selStart, selEnd);
    });
  }

  function apply(btn: ToolbarButton) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || btn.sample;
    const next =
      value.slice(0, start) + btn.before + selected + btn.after + value.slice(end);
    const selStart = start + btn.before.length;
    setValueAndCursor(next, selStart, selStart + selected.length);
  }

  function resizeGrid(r: number, c: number) {
    const rr = Math.min(12, Math.max(2, Math.floor(r) || 2));
    const cc = Math.min(8, Math.max(1, Math.floor(c) || 1));
    setTRows(rr);
    setTCols(cc);
    setCells((prev) => makeGrid(rr, cc, prev));
  }

  function setCell(ri: number, ci: number, v: string) {
    setCells((prev) =>
      prev.map((row, i) =>
        i === ri ? row.map((cell, j) => (j === ci ? v : cell)) : row
      )
    );
  }

  function insertTable() {
    const clean = (v: string) => v.trim().replace(/\|/g, "\\|") || " ";
    const line = (arr: string[]) => "| " + arr.map(clean).join(" | ") + " |";
    const sep = "| " + cells[0].map(() => "---").join(" | ") + " |";
    const parts = [line(cells[0]), sep, ...cells.slice(1).map((row) => line(row))];
    const table = "\n" + parts.join("\n") + "\n";
    const el = ref.current;
    const pos = el?.selectionStart ?? value.length;
    const next = value.slice(0, pos) + table + value.slice(pos);
    setValueAndCursor(next, pos + table.length, pos + table.length);
    setShowTable(false);
    setCells(makeGrid(tRows, tCols));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.shiftKey) return;
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start !== end) return;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const line = value.slice(lineStart, start);
    const num = /^(\s*)(\d+)\.\s(.*)$/.exec(line);
    const bullet = /^(\s*)-\s(.*)$/.exec(line);
    if (num) {
      e.preventDefault();
      if (!num[3].trim()) {
        const next = value.slice(0, lineStart) + value.slice(start);
        setValueAndCursor(next, lineStart, lineStart);
      } else {
        const ins = "\n" + num[1] + (parseInt(num[2], 10) + 1) + ". ";
        const next = value.slice(0, start) + ins + value.slice(end);
        setValueAndCursor(next, start + ins.length, start + ins.length);
      }
    } else if (bullet) {
      e.preventDefault();
      if (!bullet[2].trim()) {
        const next = value.slice(0, lineStart) + value.slice(start);
        setValueAndCursor(next, lineStart, lineStart);
      } else {
        const ins = "\n" + bullet[1] + "- ";
        const next = value.slice(0, start) + ins + value.slice(end);
        setValueAndCursor(next, start + ins.length, start + ins.length);
      }
    }
  }

  const toolBtnClass =
    "min-w-7 rounded px-1.5 py-1 font-mono text-xs font-medium transition hover:bg-primary/10 hover:text-primary";

  return (
    <div className="mt-1 overflow-hidden rounded-md border bg-background">
      <div
        dir="ltr"
        className="flex flex-wrap items-center gap-0.5 border-b bg-secondary/50 px-2 py-1.5"
      >
        {textButtons.map((btn) => (
          <button
            key={btn.label}
            type="button"
            title={btn.title}
            onClick={() => apply(btn)}
            className={toolBtnClass}
          >
            {btn.label}
          </button>
        ))}
        <span aria-hidden className="mx-1 h-4 w-px bg-border" />
        {listButtons.map((btn) => (
          <button
            key={btn.label}
            type="button"
            title={btn.title}
            onClick={() => apply(btn)}
            className={toolBtnClass}
          >
            {btn.label}
          </button>
        ))}
        <span aria-hidden className="mx-1 h-4 w-px bg-border" />
        <button
          type="button"
          title="إدراج جدول"
          onClick={() => setShowTable((s) => !s)}
          className={
            toolBtnClass + (showTable ? " bg-primary/10 text-primary" : "")
          }
        >
          {"\u229e"} table
        </button>
      </div>

      {showTable && (
        <div className="space-y-2 border-b bg-secondary/30 p-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold">📊 إنشاء جدول</span>
            <label className="flex items-center gap-1">
              الأسطر
              <input
                type="number"
                min={2}
                max={12}
                value={tRows}
                onChange={(e) => resizeGrid(Number(e.target.value), tCols)}
                className="w-14 rounded border bg-background px-1 py-0.5 text-center"
              />
            </label>
            <label className="flex items-center gap-1">
              الأعمدة
              <input
                type="number"
                min={1}
                max={8}
                value={tCols}
                onChange={(e) => resizeGrid(tRows, Number(e.target.value))}
                className="w-14 rounded border bg-background px-1 py-0.5 text-center"
              />
            </label>
            <span className="text-muted-foreground">
              السطر الأول = رؤوس الأعمدة — املأ الخلايا مثل Excel
            </span>
          </div>
          <div dir="ltr" className="overflow-x-auto">
            <div
              className="inline-grid gap-1"
              style={{ gridTemplateColumns: "repeat(" + tCols + ", minmax(70px, 1fr))" }}
              
            >
              {cells.map((row, ri) =>
                row.map((cell, ci) => (
                  <input
                    key={ri + "-" + ci}
                    value={cell}
                    onChange={(e) => setCell(ri, ci, e.target.value)}
                    placeholder={ri === 0 ? "عنوان" : ""}
                    className={
                      "rounded border bg-background px-2 py-1 text-xs " +
                      (ri === 0 ? "font-semibold" : "font-normal")
                    }
                  />
                ))
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={insertTable}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90"
            >
              حفظ وإدراج الجدول ✓
            </button>
            <button
              type="button"
              onClick={() => setShowTable(false)}
              className="rounded-md border px-3 py-1.5 text-xs transition hover:border-primary hover:text-primary"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      <textarea
        ref={ref}
        rows={rows}
        dir="ltr"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full bg-background px-3 py-2 text-left font-mono text-sm font-normal outline-none"
      />
    </div>
  );
}
