"use client";

import { useRef } from "react";

type ToolbarButton = {
  label: string;
  title: string;
  before: string;
  after: string;
  sample: string;
};

const groups: ToolbarButton[][] = [
  [
    { label: "B", title: "نص غليظ", before: "**", after: "**", sample: "texte" },
    { label: "I", title: "نص مائل", before: "*", after: "*", sample: "texte" },
  ],
  [
    {
      label: "\u229e",
      title: "جدول",
      before: "\n| A | B |\n| --- | --- |\n|  |  |\n",
      after: "",
      sample: "",
    },
    { label: "1.", title: "قائمة مرقمة", before: "\n1. ", after: "", sample: "" },
  ],
];

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

  function apply(btn: ToolbarButton) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || btn.sample;
    const next =
      value.slice(0, start) + btn.before + selected + btn.after + value.slice(end);
    onChange(next);
    const selStart = start + btn.before.length;
    const selEnd = selStart + selected.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(selStart, selEnd);
    });
  }

  return (
    <div className="mt-1 overflow-hidden rounded-md border bg-background">
      <div
        dir="ltr"
        className="flex flex-wrap items-center gap-0.5 border-b bg-secondary/50 px-2 py-1.5"
      >
        {groups.map((group, gi) => (
          <span key={gi} className="flex items-center gap-0.5">
            {gi > 0 && <span aria-hidden className="mx-1 h-4 w-px bg-border" />}
            {group.map((btn) => (
              <button
                key={btn.label}
                type="button"
                title={btn.title}
                onClick={() => apply(btn)}
                className="min-w-7 rounded px-1.5 py-1 font-mono text-xs font-medium transition hover:bg-primary/10 hover:text-primary"
              >
                {btn.label}
              </button>
            ))}
          </span>
        ))}
      </div>
      <textarea
        ref={ref}
        rows={rows}
        dir="ltr"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-background px-3 py-2 text-left font-mono text-sm font-normal outline-none"
      />
    </div>
  );
}
