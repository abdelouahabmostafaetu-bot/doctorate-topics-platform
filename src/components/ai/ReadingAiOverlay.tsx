// src/components/ai/ReadingAiOverlay.tsx
// AI assistant for reading mode.
// - Floating button (shown only when an API is enabled in admin settings)
// - When open on desktop: real 1/3 (AI) + 2/3 (topic) split, no overlay on content
// - Chat state is destroyed when reading mode closes
"use client"

import { useEffect, useRef, useState } from "react"
import AiAssistant, { AiChatMessage } from "./AiAssistant"

type OverlayProblem = {
	problemNumber: number
	title?: string | null
	statement: string
}

type Props = {
	topicTitle?: string
	problems?: OverlayProblem[]
}

export function ReadingAiOverlay({ topicTitle, problems }: Props) {
	const [available, setAvailable] = useState(false)
	const [open, setOpen] = useState(false)
	const [messages, setMessages] = useState<AiChatMessage[]>([])
	const anchorRef = useRef<HTMLSpanElement>(null)

	useEffect(() => {
		let mounted = true
		fetch("/api/ai/status")
			.then((r) => r.json())
			.then((d) => mounted && setAvailable(Boolean(d.available)))
			.catch(() => {})
		return () => {
			mounted = false
		}
	}, [])

	// Push the reading-mode container to the right so the topic keeps 2/3 of the screen
	useEffect(() => {
		const parent = anchorRef.current?.parentElement as HTMLElement | null
		if (!parent) return
		const apply = () => {
			if (open && window.innerWidth >= 1024) {
				parent.style.transition = "padding-left 0.25s ease"
				parent.style.paddingLeft = "33.4vw"
			} else {
				parent.style.paddingLeft = ""
			}
		}
		apply()
		window.addEventListener("resize", apply)
		return () => {
			window.removeEventListener("resize", apply)
			parent.style.paddingLeft = ""
		}
	}, [open])

	if (!available) return null

	return (
		<>
			<span ref={anchorRef} className="hidden" />

			{!open && (
				<button
					onClick={() => setOpen(true)}
					className="fixed bottom-5 left-5 z-[120] inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-lg bg-zinc-900 text-white hover:bg-zinc-700 transition-colors"
					aria-label="Open AI assistant"
				>
					<span className="text-emerald-400">✦</span>
					AI Assistant
				</button>
			)}

			{open && (
				<>
					{/* Mobile backdrop only */}
					<div className="fixed inset-0 z-[110] bg-black/30 lg:hidden" onClick={() => setOpen(false)} />
					{/* Left panel: exactly 1/3 of the screen on desktop */}
					<div className="fixed inset-y-0 left-0 z-[115] w-full sm:w-[420px] lg:w-[33.4vw] bg-white border-r border-zinc-200">
						<AiAssistant
							topicTitle={topicTitle}
							problems={(problems ?? []).map((p) => ({
								problemNumber: p.problemNumber,
								title: p.title ?? undefined,
								statement: p.statement,
							}))}
							messages={messages}
							setMessages={setMessages}
							onClose={() => setOpen(false)}
							className="h-full"
						/>
					</div>
				</>
			)}
		</>
	)
}

export default ReadingAiOverlay
