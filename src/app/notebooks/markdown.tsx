"use client";

// ==========================================================================
//  Rendering engine - Markdown + LaTeX + colored study boxes + images
// ==========================================================================

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";

// ---------------- box kinds ----------------

export type BoxKind =
  | "def"
  | "thm"
  | "proof"
  | "imp"
  | "idea"
  | "ex"
  | "exemple"
  | "sum"
  | "warn";

export const BOXES: Record<BoxKind, { mark: string; label: string; cls: string }> = {
  def: { mark: "\u25C6", label: "Definition", cls: "nb-box-def" },
  thm: { mark: "\u25C7", label: "Theorem", cls: "nb-box-thm" },
  proof: { mark: "\u220E", label: "Proof", cls: "nb-box-proof" },
  imp: { mark: "\u25B2", label: "Key point", cls: "nb-box-imp" },
  idea: { mark: "\u2726", label: "Idea", cls: "nb-box-idea" },
  ex: { mark: "\u276F", label: "Exercise", cls: "nb-box-ex" },
  exemple: { mark: "\u25CE", label: "Example", cls: "nb-box-exemple" },
  sum: { mark: "\u2261", label: "Summary", cls: "nb-box-sum" },
  warn: { mark: "\u26A0", label: "Warning", cls: "nb-box-warn" },
};

export const BOX_ORDER: BoxKind[] = [
  "def",
  "thm",
  "proof",
  "imp",
  "idea",
  "ex",
  "exemple",
  "sum",
  "warn",
];

/** Snippets inserted by the toolbar. */
export const TPL: Record<BoxKind, string> = {
  def: "\n:::def Term\nWrite the definition you want to remember here.\n:::\n",
  thm: "\n:::thm Theorem\nStatement of the theorem.\n:::\n",
  proof: "\n:::proof Proof\nProof steps...\n:::\n",
  imp: "\n:::imp Key point\nWhat you must never forget.\n:::\n",
  idea: "\n:::idea Idea\nA personal remark or useful intuition.\n:::\n",
  ex: "\n:::ex Exercise\nStatement of the exercise.\n\n@@solution\nThe solution appears only when clicked.\n:::\n",
  exemple: "\n:::exemple Example\nA short worked example.\n:::\n",
  sum: "\n:::sum Summary\n- First result\n- Second result\n:::\n",
  warn: "\n:::warn Warning\nA common mistake to avoid.\n:::\n",
};

// ---------------- parsing ----------------

export type Segment =
  | { kind: "md"; text: string }
  | { kind: "box"; type: BoxKind; title: string; body: string };

const OPEN_RE = /^:::(def|thm|proof|imp|idea|ex|exemple|sum|warn)[ \t]*(.*)$/;
const CLOSE_RE = /^:::[ \t]*$/;
export const SOLUTION_RE = /^@@(?:solution|\u062d\u0644)[ \t]*$/m;

export function parseSegments(src: string): Segment[] {
  const lines = String(src ?? "").split("\n");
  const out: Segment[] = [];
  let buf: string[] = [];

  const flush = () => {
    const text = buf.join("\n");
    if (text.trim().length > 0) out.push({ kind: "md", text });
    buf = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const m = OPEN_RE.exec(lines[i]);
    if (!m) {
      buf.push(lines[i]);
      continue;
    }
    flush();
    const type = m[1] as BoxKind;
    const title = (m[2] || "").trim();
    const body: string[] = [];
    i++;
    while (i < lines.length && !CLOSE_RE.test(lines[i])) {
      body.push(lines[i]);
      i++;
    }
    out.push({ kind: "box", type, title, body: body.join("\n") });
  }
  flush();
  return out;
}

/** Accepts several math syntaxes and turns ==text== into <mark>. */
export function prep(raw: string): string {
  let s = String(raw ?? "");
  s = s.replace(/```math\n([\s\S]*?)```/g, (_m, b) => "\n$$\n" + String(b).trim() + "\n$$\n");
  s = s.replace(/\$`([^`]+)`\$/g, (_m, b) => "$" + String(b) + "$");
  s = s.replace(/==([^=\n][^=\n]*?)==/g, "<mark>$1</mark>");
  return s;
}

// ---------------- rendering ----------------

export function MD({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeRaw, rehypeKatex]}
    >
      {prep(text)}
    </ReactMarkdown>
  );
}

function ExerciseBox({ title, body }: { title: string; body: string }) {
  const meta = BOXES.ex;
  const parts = body.split(SOLUTION_RE);
  const statement = parts[0] ?? "";
  const solution = parts.slice(1).join("\n").trim();

  return (
    <div className={"nb-box " + meta.cls}>
      <div className="nb-box-head">
        <span className="nb-box-mark">{meta.mark}</span>
        <span>{title || meta.label}</span>
      </div>
      <div className="nb-box-body">
        <MD text={statement} />
        {solution.length > 0 && (
          <details className="nb-solution">
            <summary>Show solution</summary>
            <div className="nb-solution-body">
              <MD text={solution} />
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function StudyBox({ type, title, body }: { type: BoxKind; title: string; body: string }) {
  if (type === "ex") return <ExerciseBox title={title} body={body} />;
  const meta = BOXES[type];
  return (
    <div className={"nb-box " + meta.cls}>
      <div className="nb-box-head">
        <span className="nb-box-mark">{meta.mark}</span>
        <span>{title || meta.label}</span>
      </div>
      <div className="nb-box-body">
        <MD text={body} />
      </div>
    </div>
  );
}

/** Full page content. */
export function PageBody({ content, scale = 1 }: { content: string; scale?: number }) {
  const segments = React.useMemo(() => parseSegments(content), [content]);

  if (!content || content.trim().length === 0) {
    return <p className="nb-empty-line">This page is empty - click "Edit" to start writing.</p>;
  }

  return (
    <div className="nb-prose" style={{ fontSize: scale + "rem" }}>
      {segments.map((seg, i) =>
        seg.kind === "md" ? (
          <MD key={i} text={seg.text} />
        ) : (
          <StudyBox key={i} type={seg.type} title={seg.title} body={seg.body} />
        )
      )}
    </div>
  );
}

/** Short text preview. */
export function excerpt(src: string, max = 140): string {
  const s = String(src ?? "")
    .replace(/^:::.*$/gm, " ")
    .replace(/@@(?:solution|\u062d\u0644)/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~$=|-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s.length > max ? s.slice(0, max).trimEnd() + "\u2026" : s;
}
