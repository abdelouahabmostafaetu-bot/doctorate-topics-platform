"use client";

// محرر LaTeX احترافي مشترك — يُستخدم في صفحة المساهمة، لوحة الإدارة، ونموذج «اقترح حلاً»:
// شريط أدوات رياضي + لوحة رموز + قوالب جاهزة + معاينة مباشرة
// (أسفل أو جنبًا إلى جنب) + وضع ملء الشاشة + اختصارات لوحة المفاتيح

import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { MathContent } from "@/components/math-content";

type Snippet = {
  label: string;
  title: string;
  before: string;
  after?: string;
  sample?: string;
  extraClass?: string;
};

const textSnippets: Snippet[] = [
  {
    label: "B",
    title: "غليظ (Ctrl+B)",
    before: "**",
    after: "**",
    sample: "texte",
    extraClass: "font-bold",
  },
  {
    label: "I",
    title: "مائل (Ctrl+I)",
    before: "*",
    after: "*",
    sample: "texte",
    extraClass: "italic",
  },
  { label: "1.", title: "قائمة مرقمة", before: "\n1. " },
  { label: "•", title: "قائمة نقطية", before: "\n- " },
  {
    label: "🖼️",
    title: "إدراج صورة (شكل توضيحي)",
    before: "\n![شكل توضيحي](",
    after: ")\n",
    sample: "/figures/nom-image.png",
  },
];

const mathSnippets: Snippet[] = [
  {
    label: "$x$",
    title: "معادلة داخل السطر (Ctrl+M)",
    before: "$",
    after: "$",
    sample: "x",
  },
  {
    label: "$$",
    title: "معادلة في سطر مستقل",
    before: "\n$$\n",
    after: "\n$$\n",
    sample: "f(x) = x^2",
  },
  { label: "a⁄b", title: "كسر", before: "\\frac{", after: "}{b}", sample: "a" },
  { label: "xⁿ", title: "أس", before: "^{", after: "}", sample: "n" },
  { label: "xₙ", title: "دليل سفلي", before: "_{", after: "}", sample: "n" },
  { label: "√", title: "جذر", before: "\\sqrt{", after: "}", sample: "x" },
  { label: "∑", title: "مجموع", before: "\\sum_{n=1}^{\\infty} " },
  { label: "∫", title: "تكامل", before: "\\int_{a}^{b} " },
  { label: "lim", title: "نهاية", before: "\\lim_{x \\to 0} " },
];

const TABLE_TEMPLATE = `
| العمود 1 | العمود 2 | العمود 3 |
| --- | --- | --- |
|  |  |  |
|  |  |  |
`;

const ENUM_TEMPLATE = `
1. 
2. 
3. 
`;

const TEMPLATES: Array<{ label: string; content: string }> = [
  {
    label: "جملة معادلات (cases)",
    content:
      "\n$$\n\\begin{cases}\nx + y = 1 \\\\\nx - y = 3\n\\end{cases}\n$$\n",
  },
  {
    label: "مصفوفة",
    content: "\n$$\n\\begin{pmatrix}\na & b \\\\\nc & d\n\\end{pmatrix}\n$$\n",
  },
  {
    label: "محاذاة خطوات الحل (align)",
    content:
      "\n$$\n\\begin{aligned}\nf(x) &= (x+1)^2 \\\\\n&= x^2 + 2x + 1\n\\end{aligned}\n$$\n",
  },
  { label: "جدول", content: TABLE_TEMPLATE },
  {
    label: "شكل / صورة",
    content: "\n![شكل توضيحي](/figures/nom-image.png)\n",
  },
  { label: "أسئلة مرقمة", content: ENUM_TEMPLATE },
];

const SYMBOL_GROUPS: Array<{ name: string; symbols: Array<[string, string]> }> =
  [
    {
      name: "حروف يونانية",
      symbols: [
        ["α", "\\alpha"],
        ["β", "\\beta"],
        ["γ", "\\gamma"],
        ["δ", "\\delta"],
        ["ε", "\\varepsilon"],
        ["θ", "\\theta"],
        ["λ", "\\lambda"],
        ["μ", "\\mu"],
        ["π", "\\pi"],
        ["σ", "\\sigma"],
        ["φ", "\\varphi"],
        ["ω", "\\omega"],
        ["Δ", "\\Delta"],
        ["Ω", "\\Omega"],
      ],
    },
    {
      name: "مجموعات",
      symbols: [
        ["ℕ", "\\mathbb{N}"],
        ["ℤ", "\\mathbb{Z}"],
        ["ℚ", "\\mathbb{Q}"],
        ["ℝ", "\\mathbb{R}"],
        ["ℂ", "\\mathbb{C}"],
        ["∈", "\\in"],
        ["∉", "\\notin"],
        ["⊂", "\\subset"],
        ["⊆", "\\subseteq"],
        ["∪", "\\cup"],
        ["∩", "\\cap"],
        ["∅", "\\emptyset"],
      ],
    },
    {
      name: "علاقات وأسهم",
      symbols: [
        ["≤", "\\leq"],
        ["≥", "\\geq"],
        ["≠", "\\neq"],
        ["≈", "\\approx"],
        ["≡", "\\equiv"],
        ["→", "\\to"],
        ["⇒", "\\Rightarrow"],
        ["⇔", "\\Leftrightarrow"],
        ["∀", "\\forall"],
        ["∃", "\\exists"],
        ["∞", "\\infty"],
        ["±", "\\pm"],
        ["×", "\\times"],
        ["∂", "\\partial"],
      ],
    },
  ];

const toolBtn =
  "min-w-7 rounded border px-1.5 py-1 font-mono text-xs transition hover:border-primary hover:bg-primary/5 hover:text-primary";

export function LatexEditorPane({
  id,
  value,
  rows = 8,
  placeholder,
  autoFocus = false,
  onChange,
}: {
  id?: string;
  value: string;
  rows?: number;
  placeholder?: string;
  autoFocus?: boolean;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [split, setSplit] = useState(false);
  const [full, setFull] = useState(false);
  const [panel, setPanel] = useState<"none" | "symbols" | "templates">("none");
  const deferred = useDeferredValue(value);

  // قفل تمرير الصفحة في وضع ملء الشاشة
  useEffect(() => {
    if (!full) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [full]);

  function insert(before: string, after = "", sample = "") {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || sample;
    const next =
      value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const s = start + before.length;
      el.setSelectionRange(s, s + selected.length);
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape" && full) {
      e.preventDefault();
      setFull(false);
      return;
    }
    // اختصارات: Ctrl+B غليظ · Ctrl+I مائل · Ctrl+M معادلة
    if (e.ctrlKey || e.metaKey) {
      const k = e.key.toLowerCase();
      if (k === "b") {
        e.preventDefault();
        insert("**", "**", "texte");
        return;
      }
      if (k === "i") {
        e.preventDefault();
        insert("*", "*", "texte");
        return;
      }
      if (k === "m") {
        e.preventDefault();
        insert("$", "$", "x");
        return;
      }
    }
    // متابعة القوائم تلقائيًا عند Enter
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
    const move = (next: string, pos: number) => {
      onChange(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(pos, pos);
      });
    };
    if (num) {
      e.preventDefault();
      if (!num[3].trim()) {
        move(value.slice(0, lineStart) + value.slice(start), lineStart);
      } else {
        const ins = "\n" + num[1] + (parseInt(num[2], 10) + 1) + ". ";
        move(
          value.slice(0, start) + ins + value.slice(end),
          start + ins.length,
        );
      }
    } else if (bullet) {
      e.preventDefault();
      if (!bullet[2].trim()) {
        move(value.slice(0, lineStart) + value.slice(start), lineStart);
      } else {
        const ins = "\n" + bullet[1] + "- ";
        move(
          value.slice(0, start) + ins + value.slice(end),
          start + ins.length,
        );
      }
    }
  }

  const chars = value.length;
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  const lines = value ? value.split("\n").length : 1;

  const preview = (
    <div>
      <p className="mb-1 text-[11px] font-medium text-muted-foreground">
        معاينة مباشرة
      </p>
      <div
        className={
          "rounded-md border border-dashed bg-secondary/20 p-3 " +
          (split ? "h-full min-h-[160px] overflow-auto" : "min-h-[100px]")
        }
      >
        {deferred.trim() ? (
          <MathContent content={deferred} className="text-sm" />
        ) : (
          <p className="text-xs text-muted-foreground">
            ستظهر المعاينة هنا أثناء الكتابة — تمامًا كما سيظهر النص للقرّاء.
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div
      className={
        full
          ? "fixed inset-0 z-50 flex flex-col gap-3 overflow-y-auto bg-background p-4 sm:px-10 sm:py-6"
          : "space-y-2"
      }
    >
      {full && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">🖋️ وضع التركيز — تحرير LaTeX</p>
          <button
            type="button"
            onClick={() => setFull(false)}
            className="rounded-md border px-3 py-1 text-xs transition hover:border-primary"
          >
            ✕ خروج (Esc)
          </button>
        </div>
      )}

      {/* شريط الأدوات */}
      <div
        dir="ltr"
        className="flex flex-wrap items-center gap-0.5 rounded-md border bg-secondary/40 px-1.5 py-1"
      >
        {textSnippets.map((b) => (
          <button
            key={b.label}
            type="button"
            title={b.title}
            onClick={() => insert(b.before, b.after ?? "", b.sample ?? "")}
            className={`${toolBtn} border-transparent ${b.extraClass ?? ""}`}
          >
            {b.label}
          </button>
        ))}
        <span aria-hidden className="mx-1 h-4 w-px bg-border" />
        {mathSnippets.map((b) => (
          <button
            key={b.label}
            type="button"
            title={b.title}
            onClick={() => insert(b.before, b.after ?? "", b.sample ?? "")}
            className={`${toolBtn} border-transparent`}
          >
            {b.label}
          </button>
        ))}
        <span aria-hidden className="mx-1 h-4 w-px bg-border" />
        <button
          type="button"
          title="لوحة الرموز الرياضية"
          onClick={() => setPanel(panel === "symbols" ? "none" : "symbols")}
          className={
            toolBtn +
            (panel === "symbols"
              ? " border-primary bg-primary/10 text-primary"
              : " border-transparent")
          }
        >
          Ω
        </button>
        <button
          type="button"
          title="قوالب جاهزة: مصفوفات، جمل معادلات، جداول..."
          onClick={() => setPanel(panel === "templates" ? "none" : "templates")}
          className={
            toolBtn +
            (panel === "templates"
              ? " border-primary bg-primary/10 text-primary"
              : " border-transparent")
          }
        >
          ▤
        </button>
        <span className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            title={
              split ? "المعاينة أسفل المحرر" : "المحرر والمعاينة جنبًا إلى جنب"
            }
            onClick={() => setSplit((s) => !s)}
            className={
              toolBtn +
              (split
                ? " border-primary bg-primary/10 text-primary"
                : " border-transparent")
            }
          >
            ⿲
          </button>
          <button
            type="button"
            title="ملء الشاشة (وضع التركيز)"
            onClick={() => setFull((f) => !f)}
            className={`${toolBtn} border-transparent`}
          >
            ⛶
          </button>
        </span>
      </div>

      {/* لوحة الرموز */}
      {panel === "symbols" && (
        <div className="space-y-2 rounded-md border bg-secondary/20 p-2.5">
          {SYMBOL_GROUPS.map((g) => (
            <div key={g.name} className="flex flex-wrap items-center gap-1">
              <span className="ml-1 w-24 shrink-0 text-[11px] text-muted-foreground">
                {g.name}
              </span>
              <span dir="ltr" className="flex flex-wrap gap-1">
                {g.symbols.map(([sym, cmd]) => (
                  <button
                    key={cmd}
                    type="button"
                    title={cmd}
                    onClick={() => insert(cmd + " ")}
                    className="min-w-7 rounded border bg-background px-1.5 py-0.5 text-sm transition hover:border-primary hover:text-primary"
                  >
                    {sym}
                  </button>
                ))}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* القوالب الجاهزة */}
      {panel === "templates" && (
        <div className="flex flex-wrap gap-1.5 rounded-md border bg-secondary/20 p-2.5">
          {TEMPLATES.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => {
                insert(t.content);
                setPanel("none");
              }}
              className="rounded-md border bg-background px-2.5 py-1 text-xs transition hover:border-primary hover:text-primary"
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* المحرر + المعاينة */}
      <div
        className={
          split
            ? "grid gap-3 lg:grid-cols-2"
            : "space-y-2 " + (full ? "flex-1" : "")
        }
      >
        <textarea
          id={id}
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={full ? 22 : rows}
          dir="ltr"
          autoFocus={autoFocus}
          className="w-full resize-y rounded-md border bg-secondary/40 p-3 font-mono text-xs leading-6 focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder={placeholder}
        />
        {preview}
      </div>

      {/* شريط الحالة */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>
          {lines} سطر · {words} كلمة · {chars} حرف
        </span>
        <span dir="ltr" className="font-mono">
          Ctrl+B / Ctrl+I / Ctrl+M
        </span>
      </div>
    </div>
  );
}
