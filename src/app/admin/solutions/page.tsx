"use client"

// لوحة مراجعة الحلول المقترحة (للمشرف فقط)
// افتح: https://www.docmathdz.dev/admin/solutions
// تحتاج المفتاح السري (ADMIN_SECRET أو MCP_SECRET)

import { useState } from "react"

type Pending = {
	id: string
	topicId: string
	topicTitle: string
	problemIndex: number
	authorName: string | null
	contentText: string
	createdAt: string
}

export default function AdminSolutionsPage() {
	const [key, setKey] = useState("")
	const [items, setItems] = useState<Pending[] | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function load() {
		setLoading(true)
		setError(null)
		try {
			const res = await fetch(`/api/solutions/moderate?key=${encodeURIComponent(key)}`)
			const data = await res.json()
			if (!data.ok) throw new Error(data.error || "Erreur")
			setItems(data.pending)
		} catch (e: any) {
			setError(e.message)
			setItems(null)
		} finally {
			setLoading(false)
		}
	}

	async function act(id: string, action: "approve" | "reject") {
		try {
			const res = await fetch(`/api/solutions/moderate?key=${encodeURIComponent(key)}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id, action }),
			})
			const data = await res.json()
			if (!data.ok) throw new Error(data.error || "Erreur")
			setItems((prev) => (prev ? prev.filter((p) => p.id !== id) : prev))
		} catch (e: any) {
			setError(e.message)
		}
	}

	return (
		<main dir="rtl" className="mx-auto max-w-3xl p-4">
			<h1 className="mb-4 text-2xl font-bold">🛡️ مراجعة الحلول المقترحة</h1>

			<div className="mb-6 flex gap-2">
				<input
					type="password"
					value={key}
					onChange={(e) => setKey(e.target.value)}
					placeholder="المفتاح السري"
					className="flex-1 rounded-lg border bg-background p-2 text-sm"
				/>
				<button
					type="button"
					onClick={load}
					disabled={loading || !key}
					className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
				>
					{loading ? "جارٍ التحميل..." : "عرض الحلول في الانتظار"}
				</button>
			</div>

			{error && <p className="mb-4 text-sm text-red-500">❌ {error}</p>}

			{items !== null && items.length === 0 && (
				<p className="text-muted-foreground">لا توجد حلول في الانتظار 🎉</p>
			)}

			{items?.map((p) => (
				<div key={p.id} className="mb-4 rounded-xl border bg-muted/30 p-4">
					<p className="mb-1 text-sm font-semibold">
						{p.topicTitle} — التمرين {p.problemIndex}
					</p>
					<p className="mb-2 text-xs text-muted-foreground">
						من: {p.authorName || "طالب مجهول"} • {new Date(p.createdAt).toLocaleString("fr-DZ")}
					</p>
					<p className="mb-3 whitespace-pre-wrap rounded-lg border bg-background p-3 text-sm leading-relaxed">
						{p.contentText}
					</p>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => act(p.id, "approve")}
							className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500"
						>
							✅ موافقة ونشر
						</button>
						<button
							type="button"
							onClick={() => act(p.id, "reject")}
							className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-500"
						>
							❌ رفض
						</button>
					</div>
				</div>
			))}
		</main>
	)
}
