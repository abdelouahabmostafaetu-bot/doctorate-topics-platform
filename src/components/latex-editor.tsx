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
      label: "$x$",
      title: "معادلة داخل السطر",
      before: "$",
      after: "$",
      sample: "x^2+1",
    },
    {
      label: "$$",
      title: "معادلة في سطر مستقل",
      before: "\n$$\n",
      after: "\n$$\n",
      sample: "\\int_0^1 x^2\\,dx",
    },
  ],
  [
    { label: "a/b", title: "كسر", before: "\\frac{", after: "}{b}", sample: "a" },
    { label: "\u221ax", title: "جذر", before: "\\sqrt{", after: "}", sample: "x" },
    { label: "x^n", title: "قوة / أس", before: "", after: "^{n}", sample: "x" },
    { label: "x_n", title: "دليل سفلي", before: "", after: "_{n}", sample: "x" },
  ],
  [
    {
      label: "\u03a3",
      title: "مجموع",
      before: "\\sum_{n=1}^{+\\infty} ",
      after: "",
      sample: "",
    },
    {
      label: "\u222b",
      title: "تكامل",
      before: "\\int_{0}^{1} ",
      after: " \\,dx",
      sample: "f(x)",
    },
    {
      label: "lim",
      title: "نهاية",
      before: "\\lim_{n \\to +\\infty} ",
      after: "",
      sample: "",
    },
    { label: "\u211d", title: "\\mathbb{R}", before: "\\mathbb{R}", after: "", sample: "" },
  ],
  [
    { label: "\u2264", title: "أصغر أو يساوي", before: "\\leq ", after: "", sample: "" },
    { label: "\u2260", title: "لا يساوي", before: "\\neq ", after: "", sample: "" },
    { label: "\u2208", title: "ينتمي إلى", before: "\\in ", after: "", sample: "" },
    { label: "\u2192", title: "سهم", before: "\\to ", after: "", sample: "" },
  ],
  [
    { label: "1.", title: "قائمة مرقمة", before: "\n1. ", after: "", sample: "" },
    { label: "\u2022", title: "قائمة نقطية", before: "\n- ", after: "", sample: "" },
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
