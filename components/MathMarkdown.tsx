// components/ai/MathMarkdown.tsx
// مُصيّر خفيف لنصوص AI: يدعم $...$ و $$...$$ (KaTeX) + تنسيق Markdown بسيط (عريض، قوائم، عناوين، كود)
// يتطلب: npm i katex  (غالباً مثبت عندك مسبقاً لعرض التمارين)
// وتأكد من استيراد "katex/dist/katex.min.css" في مكان عام (layout أو صفحة وضع القراءة)
"use client"

import { useMemo } from "react"
import katex from "katex"

function renderMathHtml(tex: string, displayMode: boolean): string {
	try {
		return katex.renderToString(tex, { displayMode, throwOnError: false, strict: false })
	} catch {
		return `<code>${escapeHtml(tex)}</code>`
	}
}

function escapeHtml(s: string): string {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

// تنسيق سطر واحد: رياضيات داخلية $...$ + **عريض** + `كود`
function renderInline(text: string): string {
	let html = ""
	let rest = text
	while (rest.length > 0) {
		const m = rest.match(/\$([^$\n]+?)\$/)
		if (!m || m.index === undefined) {
			html += formatInlineText(rest)
			break
		}
		html += formatInlineText(rest.slice(0, m.index))
		html += renderMathHtml(m[1], false)
		rest = rest.slice(m.index + m[0].length)
	}
	return html
}

function formatInlineText(s: string): string {
	let t = escapeHtml(s)
	t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
	t = t.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-gray-100 rounded text-[0.9em]">$1</code>')
	return t
}

type Block =
	| { type: "math"; tex: string }
	| { type: "heading"; level: number; text: string }
	| { type: "li"; ordered: boolean; text: string }
	| { type: "p"; text: string }

function parseBlocks(content: string): Block[] {
	const blocks: Block[] = []
	// أولاً: فصل كتل $$...$$ (سواء في أسطر مستقلة أو مدمجة)
	const parts = content.split(/\$\$/)
	for (let i = 0; i < parts.length; i++) {
		if (i % 2 === 1) {
			// داخل $$...$$
			const tex = parts[i].trim()
			if (tex) blocks.push({ type: "math", tex })
			continue
		}
		for (const rawLine of parts[i].split("\n")) {
			const line = rawLine.trimEnd()
			if (!line.trim()) continue
			const h = line.match(/^(#{1,4})\s+(.*)$/)
			if (h) {
				blocks.push({ type: "heading", level: h[1].length, text: h[2] })
				continue
			}
			const ul = line.match(/^\s*[-*]\s+(.*)$/)
			if (ul) {
				blocks.push({ type: "li", ordered: false, text: ul[1] })
				continue
			}
			const ol = line.match(/^\s*(\d+)[.)]\s+(.*)$/)
			if (ol) {
				blocks.push({ type: "li", ordered: true, text: `${ol[1]}. ${ol[2]}` })
				continue
			}
			blocks.push({ type: "p", text: line })
		}
	}
	return blocks
}

export default function MathMarkdown({ content }: { content: string }) {
	const blocks = useMemo(() => parseBlocks(content), [content])
	return (
		<div className="space-y-2 leading-relaxed break-words [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:py-1">
			{blocks.map((b, i) => {
				if (b.type === "math") {
					return <div key={i} dir="ltr" dangerouslySetInnerHTML={{ __html: renderMathHtml(b.tex, true) }} />
				}
				if (b.type === "heading") {
					return (
						<div key={i} className={`font-bold ${b.level <= 2 ? "text-base" : "text-sm"} mt-2`} dangerouslySetInnerHTML={{ __html: renderInline(b.text) }} />
					)
				}
				if (b.type === "li") {
					return (
						<div key={i} className="flex gap-2">
							{!b.ordered && <span className="select-none mt-[2px]">•</span>}
							<span dangerouslySetInnerHTML={{ __html: renderInline(b.text) }} />
						</div>
					)
				}
				return <p key={i} dangerouslySetInnerHTML={{ __html: renderInline(b.text) }} />
			})}
		</div>
	)
}
