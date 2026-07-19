// components/ai/AiAssistant.tsx
// لوحة دردشة مساعد AI داخل وضع القراءة — تدعم المعادلات والنصوص الطويلة والبث المباشر
"use client"

import { useEffect, useRef, useState } from "react"
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

const SUGGESTIONS = ["اشرح لي التمرين الأول خطوة بخطوة", "ما هي المفاهيم المطلوبة لحل هذا الموضوع؟", "أعطني تلميحاً للسؤال الأول دون الحل الكامل"]

export default function AiAssistant({ topicTitle, problems, messages, setMessages, onClose, className = "" }: Props) {
	const [input, setInput] = useState("")
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const scrollRef = useRef<HTMLDivElement>(null)
	const abortRef = useRef<AbortController | null>(null)

	// تمرير تلقائي للأسفل مع كل تحديث
	useEffect(() => {
		scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
	}, [messages, loading])

	// إيقاف أي طلب جارٍ عند إغلاق المكون (الخروج من وضع القراءة)
	useEffect(() => () => abortRef.current?.abort(), [])

	async function send(text?: string) {
		const q = (text ?? input).trim()
		if (!q || loading) return
		setError(null)
		setInput("")
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
				throw new Error(j?.error || `خطأ HTTP ${res.status}`)
			}
			const reader = res.body.getReader()
			const decoder = new TextDecoder()
			let acc = ""
			for (;;) {
				const { done, value } = await reader.read()
				if (done) break
				acc += decoder.decode(value, { stream: true })
				const current = acc
				setMessages([...nextMessages, { role: "assistant", content: current }])
			}
			if (!acc.trim()) throw new Error("لم يصل أي رد من الموديل")
		} catch (e: unknown) {
			if ((e as Error)?.name !== "AbortError") {
				setError(e instanceof Error ? e.message : "حدث خطأ غير متوقع")
				// نحذف فقاعة المساعد الفارغة إذا فشل الطلب قبل أي محتوى
				setMessages((prev) => (prev.length && prev[prev.length - 1].role === "assistant" && !prev[prev.length - 1].content ? prev.slice(0, -1) : prev))
			}
		} finally {
			setLoading(false)
			abortRef.current = null
		}
	}

	return (
		<aside
			dir="rtl"
			className={`flex flex-col bg-white border-e shadow-sm h-full min-h-0 ${className}`}
			aria-label="مساعد الذكاء الاصطناعي"
		>
			{/* الرأس */}
			<div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-l from-emerald-50 to-white shrink-0">
				<div className="flex items-center gap-2">
					<span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white text-sm">✦</span>
					<div>
						<div className="font-bold text-sm">مساعد القراءة</div>
						<div className="text-[11px] text-gray-500">يشرح التمارين ويجيب عن أسئلتك</div>
					</div>
				</div>
				<button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="إغلاق">
					✕
				</button>
			</div>

			{/* الرسائل */}
			<div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-3">
				{messages.length === 0 && (
					<div className="space-y-3">
						<p className="text-sm text-gray-500 text-center mt-4">اسألني أي شيء عن هذا الموضوع 👋</p>
						<div className="space-y-2">
							{SUGGESTIONS.map((sg) => (
								<button
									key={sg}
									onClick={() => send(sg)}
									className="block w-full text-right text-sm px-3 py-2 rounded-xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-900"
								>
									{sg}
								</button>
							))}
						</div>
					</div>
				)}

				{messages.map((m, i) => (
					<div key={i} className={m.role === "user" ? "flex justify-start" : ""}>
						{m.role === "user" ? (
							<div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-emerald-600 text-white px-3.5 py-2 text-sm whitespace-pre-wrap break-words">{m.content}</div>
						) : (
							<div className="rounded-2xl bg-gray-50 border px-3.5 py-2.5 text-sm text-gray-800">
								{m.content ? (
									<MathMarkdown content={m.content} />
								) : (
									<span className="inline-flex gap-1 items-center text-gray-400">
										<span className="animate-bounce">●</span>
										<span className="animate-bounce [animation-delay:150ms]">●</span>
										<span className="animate-bounce [animation-delay:300ms]">●</span>
									</span>
								)}
							</div>
						)}
					</div>
				))}

				{error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</div>}
			</div>

			{/* الإدخال */}
			<div className="border-t p-3 shrink-0">
				<form
					onSubmit={(e) => {
						e.preventDefault()
						send()
					}}
					className="flex items-end gap-2"
				>
					<textarea
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault()
								send()
							}
						}}
						rows={1}
						placeholder="اكتب سؤالك هنا... (Enter للإرسال)"
						className="flex-1 resize-none border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 max-h-32"
						style={{ minHeight: 40 }}
					/>
					<button
						type="submit"
						disabled={loading || !input.trim()}
						className="px-4 h-10 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 shrink-0"
					>
						إرسال
					</button>
				</form>
			</div>
		</aside>
	)
}
