// src/components/ai/ReadingAiOverlay.tsx
// طبقة مساعد AI فوق وضع القراءة — لا تحتاج أي تغيير في تخطيط وضع القراءة:
// - زر ✦ عائم أسفل اليسار (يظهر فقط إذا كان API مفعّلاً في الإعدادات)
// - عند الضغط: لوحة دردشة ثابتة على اليسار والموضوع يبقى على اليمين
// - الدردشة تُحذف تلقائياً عند الخروج من وضع القراءة (يُفكّك المكون معه)
"use client"

import { useEffect, useState } from "react"
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
	// الرسائل في الذاكرة فقط — تختفي نهائياً عند إغلاق وضع القراءة
	const [messages, setMessages] = useState<AiChatMessage[]>([])

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

	if (!available) return null

	return (
		<>
			{/* زر عائم أسفل اليسار */}
			{!open && (
				<button
					onClick={() => setOpen(true)}
					className="fixed bottom-5 left-5 z-[120] inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium shadow-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all"
					aria-label="فتح مساعد الذكاء الاصطناعي"
				>
					<span>✦</span>
					مساعد AI
				</button>
			)}

			{open && (
				<>
					{/* خلفية معتمة في الهاتف فقط */}
					<div className="fixed inset-0 z-[110] bg-black/30 lg:hidden" onClick={() => setOpen(false)} />
					{/* لوحة الدردشة على اليسار */}
					<div className="fixed inset-y-0 left-0 z-[115] w-[94%] max-w-[400px] xl:max-w-[430px] shadow-2xl">
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
