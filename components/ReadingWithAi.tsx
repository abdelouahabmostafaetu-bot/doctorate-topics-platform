// components/ai/ReadingWithAi.tsx
// غلاف وضع القراءة: زر ✦ في الأعلى + تقسيم الشاشة (AI يسار / الموضوع يمين)
// الدردشة تُحذف تلقائياً عند الخروج من وضع القراءة (لأن هذا المكون يُفكّك فتُمسح الحالة)
"use client"

import { useEffect, useState } from "react"
import AiAssistant, { AiChatMessage, AiProblemCtx } from "./AiAssistant"

type Props = {
	topicTitle?: string
	problems?: AiProblemCtx[]
	children: React.ReactNode
}

export default function ReadingWithAi({ topicTitle, problems, children }: Props) {
	const [available, setAvailable] = useState(false)
	const [open, setOpen] = useState(false)
	// الرسائل محفوظة هنا فقط في الذاكرة — تختفي نهائياً عند مغادرة وضع القراءة
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

	return (
		<div className="relative h-full min-h-0 flex flex-col">
			{/* زر التفعيل — يظهر فقط إذا كان هناك API متاح */}
			{available && (
				<div className="absolute top-3 left-3 z-20">
					<button
						onClick={() => setOpen((o) => !o)}
						className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-md transition-all ${
							open ? "bg-gray-800 text-white hover:bg-gray-700" : "bg-emerald-600 text-white hover:bg-emerald-700"
						}`}
						aria-pressed={open}
					>
						<span>✦</span>
						{open ? "إخفاء المساعد" : "مساعد AI"}
					</button>
				</div>
			)}

			{/* التقسيم: AI على اليسار (في RTL: آخر عنصر بصرياً على اليسار) والموضوع على اليمين */}
			<div className="flex-1 min-h-0 flex flex-row-reverse" dir="rtl">
				{/* لوحة AI — ثابتة على اليسار في الشاشات الكبيرة، وتغطي كامل الشاشة في الهاتف */}
				{open && available && (
					<>
						{/* هاتف: طبقة كاملة */}
						<div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />
						<div className="fixed inset-y-0 left-0 z-40 w-[92%] max-w-md lg:static lg:z-auto lg:w-[380px] xl:w-[420px] shrink-0">
							<AiAssistant
								topicTitle={topicTitle}
								problems={problems}
								messages={messages}
								setMessages={setMessages}
								onClose={() => setOpen(false)}
								className="h-full"
							/>
						</div>
					</>
				)}

				{/* محتوى الموضوع — على اليمين */}
				<div className="flex-1 min-w-0 overflow-y-auto">{children}</div>
			</div>
		</div>
	)
}
