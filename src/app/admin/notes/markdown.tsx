"use client";

// ============================================================
//  My Notes — content engine
//  Markdown + LaTeX + study boxes + highlight + images
// ============================================================

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";

// ---------- study boxes ----------

export type BoxKind = "def" | "imp" | "idea" | "ex" | "sum" | "warn";

export const BOXES: Record<BoxKind, { mark: string; label: string; cls: string }> = {
  def: { mark: "\u25C6", label: "Definition", cls: "ws-box-def" },
  imp: { mark: "\u25B2", label: "Key point", cls: "ws-box-imp" },
  idea: { mark: "\u2726", label: "Idea", cls: "ws-box-idea" },
  ex: { mark: "\u276F", label: "Exercise", cls: "ws-box-ex" },
  sum: { mark: "\u2261", label: "Summary", cls: "ws-box-sum" },
  warn: { mark: "\u26A0", label: "Caution", cls: "ws-box-warn" },
};

export const BOX_ORDER: BoxKind[] = ["def", "imp", "idea", "ex", "sum", "warn"];

/** Snippets inserted by the editor toolbar. */
export const TPL: Record<BoxKind, string> = {
  def: "\n:::def Term\nWrite the definition you want to remember.\n:::\n",
  imp: "\n:::imp Key point\nThe part you must not forget.\n:::\n",
  idea: "\n:::idea Idea\nA personal remark or an intuition.\n:::\n",
  ex: "\n:::ex Exercise\nStatement of the exercise.\n\n@@solution\nYour solution, hidden until you click.\n:::\n",
  sum: "\n:::sum Summary\n- First result\n- Second result\n:::\n",
  warn: "\n:::warn Caution\nA classic mistake to avoid.\n:::\n",
};

// ---------- parsing ----------

export type Segment =
  | { kind: "md"; text: string }
  | { kind: "box"; type: BoxKind; title: string; body: string };

const OPEN_RE = /^:::(def|imp|idea|ex|sum|warn)[ \t]*(.*)$/;
const CLOSE_RE = /^:::[ \t]*$/;

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

// ---------- text preparation ----------

/** Accepts several math notations and turns highlights into <mark>. */
export function prep(raw: string): string {
  let s = String(raw ?? "");
  s = s.replace(/```math\n([\s\S]*?)```/g, (_m, body) => "\n$$\n" + String(body).trim() + "\n$$\n");
  s = s.replace(/\$`([^`]+)`\$/g, (_m, body) => "$" + String(body) + "$");
  s = s.replace(/==([^=\n][^=\n]*?)==/g, "<mark>$1</mark>");
  return s;
}

// ---------- renderers ----------

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
  const parts = body.split(/^@@solution[ \t]*$/m);
  const statement = parts[0] ?? "";
  const solution = parts.slice(1).join("\n").trim();

  return (
    <div className={"ws-box " + meta.cls}>
      <div className="ws-box-head">
        <span className="ws-box-mark">{meta.mark}</span>
        <span>{title || meta.label}</span>
      </div>
      <div className="ws-box-body">
        <MD text={statement} />
        {solution.length > 0 && (
          <details className="ws-solution">
            <summary>Show solution</summary>
            <div className="ws-solution-body">
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
    <div className={"ws-box " + meta.cls}>
      <div className="ws-box-head">
        <span className="ws-box-mark">{meta.mark}</span>
        <span>{title || meta.label}</span>
      </div>
      <div className="ws-box-body">
        <MD text={body} />
      </div>
    </div>
  );
}

/** Full note body: markdown, math, images and study boxes. */
export function NoteBody({ content, scale = 1 }: { content: string; scale?: number }) {
  const segments = React.useMemo(() => parseSegments(content), [content]);

  if (!content || content.trim().length === 0) {
    return <p className="ws-empty-line">This note is still empty.</p>;
  }

  return (
    <div className="ws-prose" style={{ fontSize: scale + "rem" }}>
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

/** Plain-text preview used in the note list. */
export function excerpt(src: string, max = 150): string {
  const s = String(src ?? "")
    .replace(/^:::.*$/gm, " ")
    .replace(/@@solution/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~$=|-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s.length > max ? s.slice(0, max).trimEnd() + "\u2026" : s;
}
