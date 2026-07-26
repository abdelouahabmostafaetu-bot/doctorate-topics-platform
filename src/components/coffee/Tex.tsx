"use client"

import { useMemo } from "react"
import katex from "katex"
import "katex/dist/katex.min.css"

/**
 * ∑ Tex — render a KaTeX string safely.
 *   <Tex>{"\\|T\\| \\le \\liminf_n \\|T_n\\|"}</Tex>        // display
 *   <Tex inline>{"L^2(\\Omega)"}</Tex>                        // inline
 *
 * Requires:  npm i katex && npm i -D @types/katex
 */
export function Tex({
  children,
  inline = false,
}: {
  children: string
  inline?: boolean
}) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(children, {
        displayMode: !inline,
        throwOnError: false,
        strict: "ignore",
        trust: false,
        macros: { "\\R": "\\mathbb{R}", "\\N": "\\mathbb{N}", "\\L": "\\mathcal{L}" },
      })
    } catch {
      return `<code>${children}</code>`
    }
  }, [children, inline])

  return (
    <span
      dir="ltr"
      className={inline ? "dm-tex dm-tex--inline" : "dm-tex dm-tex--block"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

/**
 * 📝 TexBlock — render mixed text + math written by the admin.
 * Supports  $...$  (inline)  and  $$...$$  (display).
 * This is what the "statement of the day" field uses, so the admin can type:
 *   "Let $E$ be a Banach space. Show that $$\\|T\\|\\le\\liminf\\|T_n\\|$$"
 */
export function TexBlock({ source, dir = "ltr" }: { source: string; dir?: "ltr" | "rtl" }) {
  const html = useMemo(() => renderMixed(source), [source])
  return (
    <div
      dir={dir}
      className="dm-texblock"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

export function renderMixed(source: string): string {
  if (!source) return ""
  const out: string[] = []
  // split on $$...$$ first, then $...$
  const parts = source.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)/g)

  for (const part of parts) {
    if (!part) continue
    const display = part.startsWith("$$") && part.endsWith("$$") && part.length > 4
    const inline = !display && part.startsWith("$") && part.endsWith("$") && part.length > 2

    if (display || inline) {
      const tex = display ? part.slice(2, -2) : part.slice(1, -1)
      try {
        out.push(
          katex.renderToString(tex, {
            displayMode: display,
            throwOnError: false,
            strict: "ignore",
            trust: false,
          }),
        )
      } catch {
        out.push(`<code>${escapeHtml(tex)}</code>`)
      }
    } else {
      // keep paragraphs + **bold** + line breaks
      const safe = escapeHtml(part)
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n{2,}/g, "</p><p>")
        .replace(/\n/g, "<br/>")
      out.push(`<p>${safe}</p>`)
    }
  }
  return out.join("")
}
