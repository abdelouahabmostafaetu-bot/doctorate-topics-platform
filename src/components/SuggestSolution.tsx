"use client"

// زر "💡 اقترح حلاً" + عرض حلول الطلبة الموافق عليها
// مصمم بألوان النظام (يتأقلم مع الوضع الفاتح والداكن)

import { useState } from "react"

type Props = {
	topicId: string
	problemNumber: number
	hasSolution?: boolean
}

type Solution = {
	id: string
	authorName: string | null
	contentText: string
	createdAt: string
}

export default function SuggestSolution({ topicId, problemNumber, hasSolution }: Props) {
	const [formOpen, setFormOpen] = useState(false)
	const [listOpen, setListOpen] = useState(false)
	const [solutions, setSolutions] = useState<Solution[] | null>(null)
	const [text, setText] = useState("")
	const [author, setAuthor] = useState("")
	const [sending, setSending] = useState(false)
	const [message, setMessage] = useState<string | null>(null)

	// إذا كان للتمرين حل رسمي، لا نعرض شيئاً
	if (hasSolution) return null

	async function toggleList() {
		const next = !listOpen
		setListOpen(next)
		if (next && solutions === null) {
			try {
				const res = await fetch(
					`/api/solutions?topicId=${encodeURIComponent(topicId)}&problemIndex=${problemNumber}`,
				)
				const data = await res.json()
				setSolutions(data.ok ? data.solutions : [])
			} catch {
				setSolutions([])
			}
		}
	}

	async function submit() {
		if (text.trim().length < 20) {
			setMessage("❗ الحل قصير جداً — اكتب 20 حرفاً على الأقل")
			return
		}
		setSending(true)
		setMessage(null)
		try {
			const res = await fetch("/api/solutions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					topicId,
					problemIndex: problemNumber,
					authorName: author.trim() || null,
					contentText: text.trim(),
				}),
			})
			const data = await res.json()
			if (data.ok) {
				setMessage("✅ شكراً! تم إرسال حلك وسيُنشر بعد المراجعة")
				setText("")
				setAuthor("")
				setFormOpen(false)
			} else {
				setMessage("❌ " + (data.error || "حدث خطأ، حاول مجدداً"))
			}
		} catch {
			setMessage("❌ تعذّر الاتصال — تحقق من الإنترنت")
		} finally {
			setSending(false)
		}
	}

	return (
		<div className="mt-4 rounded-xl border bg-muted/30 p-3">
			<div className="flex flex-wrap items-center gap-2">
				<span className="text-xs text-muted-foreground">لا يوجد حل لهذا التمرين بعد</span>
				<button
					type="button"
					onClick={() => setFormOpen(!formOpen)}
					className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
				>
					💡 اقترح حلاً
				</button>
				<button
					type="button"
					onClick={toggleList}
					className="rounded-lg border px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-muted"
				>
					{listOpen ? "إخفاء حلول الطلبة" : "👥 حلول الطلبة"}
				</button>
			</div>

			{formOpen && (
				<div className="mt-3 space-y-2">
					<textarea
						value={text}
						onChange={(e) => setText(e.target.value)}
						rows={6}
						placeholder="اكتب حلك هنا... (يمكنك استخدام LaTeX مثل $\\int_0^1 f(x)dx$)"
						className="w-full rounded-lg border bg-background p-3 text-sm placeholder:text-muted-foreground"
					/>
					<input
						value={author}
						onChange={(e) => setAuthor(e.target.value)}
						placeholder="اسمك (اختياري — سيُعرض مع الحل)"
						className="w-full rounded-lg border bg-background p-2 text-sm placeholder:text-muted-foreground"
					/>
					<button
						type="button"
						onClick={submit}
						disabled={sending}
						className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
					>
						{sending ? "جارٍ الإرسال..." : "إرسال الحل للمراجعة"}
					</button>
				</div>
			)}

			{message && <p className="mt-2 text-xs">{message}</p>}

			{listOpen && (
				<div className="mt-3 space-y-3">
					{solutions === null && (
						<p className="text-xs text-muted-foreground">جارٍ التحميل...</p>
					)}
					{solutions !== null && solutions.length === 0 && (
						<p className="text-xs text-muted-foreground">
							لا توجد حلول منشورة بعد — كن أول من يقترح حلاً! 🌟
						</p>
					)}
					{solutions?.map((s) => (
						<div key={s.id} className="rounded-lg border bg-background p-3">
							<p className="whitespace-pre-wrap text-sm leading-relaxed">{s.contentText}</p>
							<p className="mt-2 text-[11px] text-muted-foreground">
								✓ حل مقترح من {s.authorName || "طالب"} •{" "}
								{new Date(s.createdAt).toLocaleDateString("fr-DZ")}
							</p>
						</div>
					))}
				</div>
			)}
		</div>
	)
}
