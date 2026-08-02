"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import "katex/dist/katex.min.css"

/**
 * ✍️ Markdown + LaTeX renderer used everywhere on /coffee
 * (problem statements, proofs and user comments).
 *
 * - Markdown: GFM (tables, lists, task lists, strikethrough, autolinks)
 * - Math: $inline$ and $$display$$ via KaTeX
 * - Raw HTML is intentionally NOT enabled → user comments cannot inject markup.
 */
export default function Markdown({
	children,
	dir = "ltr",
	className = "",
}: {
	children: string
	dir?: "ltr" | "rtl" | "auto"
	className?: string
}) {
	return (
		<div dir={dir} className={`ip-md ${className}`}>
			<ReactMarkdown
				remarkPlugins={[remarkGfm, remarkMath]}
				rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: "ignore", output: "html" }]]}
				components={{
					a: ({ href, children: c }) => (
						<a href={href} target="_blank" rel="noopener noreferrer nofollow">
							{c}
						</a>
					),
				}}
			>
				{children}
			</ReactMarkdown>
		</div>
	)
}
