// src/components/ai/AiAssistant.tsx
// Minimal, professional AI chat panel for reading mode.
// - English UI, LTR
// - No message boxes: clean labeled text blocks
// - Auto-growing input (grows with text)
// - Keyboard events are isolated so reading-mode shortcuts (Space, arrows, D...)
//   never steal keystrokes while typing
"use client"

import { memo, useEffect, useRef, useState } from "react"
import MathMarkdown from "./MathMarkdown"

export type AiChatMessage = { role: "user" | "assistant"; content: string }
export type AiProblemCtx = { problemNumber?: number; title?: string; statement?: string }

type Props = {
	topicTitle?: string
	problems?: AiProblemCtx[]
	messages: AiChatMessage[]
	setMessages: React.Dispatch<React.SetStateAction<AiChatMessage[]>>
	onClose: () => void
	className?: string
}

const SUGGESTIONS = [
	"Explain exercise 1 step by step",
	"What concepts do I need to solve this topic?",
	"Give me a hint for question 1 without the full solution",
]

// Memoized so old messages never re-render while you type or while streaming
const MessageView = memo(function MessageView({ m }: { m: AiChatMessage }) {
	if (m.role === "user") {
		return (
			<div className="py-3">
				<div className="text-[10px] font-semibold tracking-widest uppercase text-zinc-400 mb-1">You</div>
				<div className="text-sm text-zinc-900 whitespace-pre-wrap">{m.content}</div>
			</div>
		)
	}
	return (
		<div className="py-3 border-t border-zinc-100">
			<div className="text-[10px] font-semibold tracking-widest uppercase text-emerald-600 mb-1">AI</div>
			<div className="text-sm leading-7 text-zinc-800">
				<MathMarkdown content={m.content} />
			</div>
		</div>
	)
})

export default function AiAssistant({ topicTitle, problems, messages, setMessages, onClose, className = "" }: Props) {
	const [input, setInput] = useState("")
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const scrollRef = useRef<HTMLDivElement>(null)
	const taRef = useRef<HTMLTextAreaElement>(null)
	const abortRef = useRef<AbortController | null>(null)

	useEffect(() => {
		scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
	}, [messages, loading])

	// Abort any in-flight request when the panel unmounts (leaving reading mode)
	useEffect(() => () => abortRef.current?.abort(), [])

	// Auto-grow the textarea with its content (up to a max height)
	function autoGrow() {
		const el = taRef.current
		if (!el) return
		el.style.height = "0px"
		el.style.height = Math.min(el.scrollHeight, 180) + "px"
	}

	async function send(text?: string) {
		const q = (text ?? input).trim()
		if (!q || loading) return
		setError(null)
		setInput("")
		requestAnimationFrame(autoGrow)
		const nextMessages: AiChatMessage[] = [...messages, { role: "user", content: q }]
		setMessages([...nextMessages, { role: "assistant", content: "" }])
		setLoading(true)

		const controller = new AbortController()
		abortRef.current = controller
		try {
			const res = await fetch("/api/ai/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				signal: controller.signal,
				body: JSON.stringify({
					messages: nextMessages,
					context: { title: topicTitle, problems },
				}),
			})
			if (!res.ok || !res.body) {
				const j = await res.json().catch(() => null)
				throw new Error(j?.error || `HTTP error ${res.status}`)
			}
			const reader = res.body.getReader()
			const decoder = new TextDecoder()
			let acc = ""
			while (true) {
				const { done, value } = await reader.read()
				if (done) break
				acc += decoder.decode(value, { stream: true })
				const content = acc
				setMessages((prev) => {
					const copy = [...prev]
					copy[copy.length - 1] = { role: "assistant", content }
					return copy
				})
			}
		} catch (e) {
			if ((e as Error).name !== "AbortError") {
				setError((e as Error).message || "Something went wrong")
				setMessages((prev) => (prev.length > 0 && prev[prev.length - 1].content === "" ? prev.slice(0, -1) : prev))
			}
		} finally {
			setLoading(false)
		}
	}

	return (
		<div
			dir="ltr"
			className={`flex flex-col bg-white ${className}`}
			// Isolate ALL keyboard events from reading-mode global shortcuts.
			// Fixes: Space not typing, slow/blocked keys while writing.
			onKeyDownCapture={(e) => e.stopPropagation()}
			onKeyUpCapture={(e) => e.stopPropagation()}
		>
			{/* Header */}
			<div className="flex items-center justify-between px-4 h-12 border-b border-zinc-100 shrink-0">
				<div className="flex items-center gap-2">
					<span className="text-emerald-600">✦</span>
					<span className="text-sm font-semibold text-zinc-900">AI Assistant</span>
				</div>
				<div className="flex items-center gap-1">
					{messages.length > 0 && (
						<button
							onClick={() => setMessages([])}
							className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-900 rounded transition-colors"
							title="Clear chat"
						>
							Clear
						</button>
					)}
					<button
						onClick={onClose}
						className="w-7 h-7 grid place-items-center text-zinc-400 hover:text-zinc-900 rounded transition-colors"
						aria-label="Close"
					>
						×
					</button>
				</div>
			</div>

			{/* Messages */}
			<div ref={scrollRef} className="flex-1 overflow-y-auto px-4">
				{messages.length === 0 ? (
					<div className="pt-8 space-y-5">
						<p className="text-sm text-zinc-500">
							Ask anything about this topic — explanations, hints, or step-by-step solutions.
						</p>
						<div className="space-y-1">
							{SUGGESTIONS.map((sug) => (
								<button
									key={sug}
									onClick={() => send(sug)}
									className="block w-full text-left text-sm text-zinc-600 hover:text-emerald-700 py-1.5 transition-colors"
								>
									→ {sug}
								</button>
							))}
						</div>
					</div>
				) : (
					<div className="pb-2">
						{messages.map((m, i) => (
							<MessageView key={i} m={m} />
						))}
						{loading && messages[messages.length - 1]?.content === "" && (
							<div className="py-2 text-xs text-zinc-400 animate-pulse">Thinking…</div>
						)}
					</div>
				)}
				{error && <div className="py-2 text-xs text-red-600">{error}</div>}
			</div>

			{/* Input */}
			<div className="border-t border-zinc-100 px-4 py-3 shrink-0">
				<div className="flex items-end gap-2">
					<textarea
						ref={taRef}
						value={input}
						rows={1}
						onChange={(e) => {
							setInput(e.target.value)
							autoGrow()
						}}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault()
								send()
							}
						}}
						placeholder="Ask about this topic…"
						className="flex-1 resize-none bg-transparent outline-none text-sm text-zinc-900 placeholder-zinc-400 leading-6 max-h-[180px]"
					/>
					<button
						onClick={() => send()}
						disabled={loading || input.trim().length === 0}
						className="w-8 h-8 grid place-items-center rounded-full bg-zinc-900 text-white disabled:opacity-25 hover:bg-zinc-700 transition-colors shrink-0"
						aria-label="Send"
					>
						↑
					</button>
				</div>
				<div className="mt-1.5 text-[10px] text-zinc-400">Enter to send · Shift+Enter for a new line</div>
			</div>
		</div>
	)
}
