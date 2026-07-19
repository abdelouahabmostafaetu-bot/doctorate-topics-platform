// src/app/admin/settings/ai/page.tsx
// صفحة إعدادات AI — الموديل يُجلب تلقائياً من المزود والأدمن يختار من القائمة
"use client"

import { useEffect, useState } from "react"

type Settings = {
	enabled: boolean
	baseUrl: string
	model: string
	systemPrompt: string
	hasApiKey: boolean
	apiKeyHint: string
}

const PRESETS = [
	{ name: "Groq (سريع ومجاني)", baseUrl: "https://api.groq.com/openai/v1" },
	{ name: "OpenRouter (فيه موديلات مجانية)", baseUrl: "https://openrouter.ai/api/v1" },
	{ name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1" },
	{ name: "OpenAI", baseUrl: "https://api.openai.com/v1" },
]

// موديلات مقترحة لكل مزود (سريعة ومناسبة لشرح التمارين)
const SUGGESTED: Array<{ match: string; ids: string[] }> = [
	{ match: "groq.com", ids: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "deepseek-r1-distill-llama-70b"] },
	{ match: "openai.com", ids: ["gpt-4o-mini", "gpt-4.1-mini"] },
	{ match: "deepseek.com", ids: ["deepseek-chat", "deepseek-reasoner"] },
]

function tagFor(baseUrl: string, id: string): string {
	const sug = SUGGESTED.find((x) => baseUrl.includes(x.match))
	if (sug && sug.ids.includes(id)) return "⭐ مقترح"
	if (baseUrl.includes("openrouter.ai") && id.endsWith(":free")) return "مجاني"
	if (baseUrl.includes("groq.com")) return "مجاني"
	return ""
}

function rankFor(baseUrl: string, id: string): number {
	const t = tagFor(baseUrl, id)
	if (t.includes("مقترح")) return 0
	if (t === "مجاني") return 1
	return 2
}

export default function AiSettingsPage() {
	const [s, setS] = useState<Settings | null>(null)
	const [apiKey, setApiKey] = useState("")
	const [models, setModels] = useState<string[]>([])
	const [loadingModels, setLoadingModels] = useState(false)
	const [saving, setSaving] = useState(false)
	const [testing, setTesting] = useState(false)
	const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

	useEffect(() => {
		fetch("/api/admin/ai-settings")
			.then((r) => r.json())
			.then(setS)
			.catch(() => setMsg({ ok: false, text: "فشل تحميل الإعدادات" }))
	}, [])

	async function fetchModels(baseUrlOverride?: string) {
		if (!s) return
		const baseUrl = baseUrlOverride ?? s.baseUrl
		setLoadingModels(true)
		setMsg(null)
		try {
			const r = await fetch("/api/admin/ai-settings/models", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ baseUrl, apiKey: apiKey.trim() || undefined }),
			})
			const j = await r.json()
			if (!r.ok) {
				setModels([])
				setMsg({ ok: false, text: j.error || "فشل جلب الموديلات" })
				return
			}
			const list: string[] = j.models || []
			list.sort((a, b) => {
				const ra = rankFor(baseUrl, a)
				const rb = rankFor(baseUrl, b)
				return ra !== rb ? ra - rb : a.localeCompare(b)
			})
			setModels(list)
			// إذا لم يكن هناك موديل مختار أو غير موجود في القائمة، اختر أول مقترح تلقائياً
			if (list.length > 0 && (!s.model || !list.includes(s.model))) {
				setS({ ...s, baseUrl, model: list[0] })
			} else {
				setS({ ...s, baseUrl })
			}
			setMsg({ ok: true, text: `تم جلب ${list.length} موديل ✓ — اختر واحداً ثم احفظ` })
		} catch {
			setMsg({ ok: false, text: "فشل جلب الموديلات" })
		} finally {
			setLoadingModels(false)
		}
	}

	async function save() {
		if (!s) return
		setSaving(true)
		setMsg(null)
		try {
			const body: Record<string, unknown> = {
				enabled: s.enabled,
				baseUrl: s.baseUrl,
				model: s.model,
				systemPrompt: s.systemPrompt,
			}
			if (apiKey.trim().length > 0) body.apiKey = apiKey.trim()
			const r = await fetch("/api/admin/ai-settings", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			})
			const j = await r.json()
			if (r.ok) {
				setMsg({ ok: true, text: "تم الحفظ بنجاح ✓" })
				setS({ ...s, hasApiKey: j.hasApiKey })
				setApiKey("")
			} else {
				setMsg({ ok: false, text: j.error || "فشل الحفظ" })
			}
		} catch {
			setMsg({ ok: false, text: "فشل الحفظ" })
		} finally {
			setSaving(false)
		}
	}

	async function testConnection() {
		setTesting(true)
		setMsg(null)
		try {
			const r = await fetch("/api/admin/ai-settings/test", { method: "POST" })
			const j = await r.json()
			setMsg(j.ok ? { ok: true, text: `الاتصال يعمل ✓ — رد الموديل: ${j.reply}` } : { ok: false, text: j.error })
		} catch {
			setMsg({ ok: false, text: "فشل الاختبار" })
		} finally {
			setTesting(false)
		}
	}

	if (!s) return <div className="p-8 text-center text-gray-500">جاري التحميل...</div>

	return (
		<div dir="rtl" className="max-w-2xl mx-auto p-6 space-y-6">
			<div>
				<h1 className="text-2xl font-bold">إعدادات الذكاء الاصطناعي — وضع القراءة</h1>
				<p className="text-sm text-gray-500 mt-1">
					أدخل المزود والمفتاح، ثم اضغط "جلب الموديلات" لاختيار الموديل من قائمة تلقائية.
				</p>
			</div>

			{/* تفعيل */}
			<label className="flex items-center gap-3 p-4 rounded-xl border bg-white shadow-sm cursor-pointer">
				<input
					type="checkbox"
					checked={s.enabled}
					onChange={(e) => setS({ ...s, enabled: e.target.checked })}
					className="w-5 h-5 accent-emerald-600"
				/>
				<span className="font-medium">تفعيل مساعد AI في وضع القراءة</span>
			</label>

			{/* قوالب جاهزة */}
			<div className="p-4 rounded-xl border bg-white shadow-sm space-y-2">
				<div className="font-medium mb-1">اختر المزود</div>
				<div className="flex flex-wrap gap-2">
					{PRESETS.map((p) => (
						<button
							key={p.name}
							onClick={() => {
								setModels([])
								setS({ ...s, baseUrl: p.baseUrl })
							}}
							className={`px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50 ${s.baseUrl === p.baseUrl ? "border-emerald-500 bg-emerald-50" : ""}`}
						>
							{p.name}
						</button>
					))}
				</div>
			</div>

			{/* الحقول */}
			<div className="p-4 rounded-xl border bg-white shadow-sm space-y-4">
				<div>
					<label className="block text-sm font-medium mb-1">Base URL (متوافق مع OpenAI)</label>
					<input
						dir="ltr"
						value={s.baseUrl}
						onChange={(e) => {
							setModels([])
							setS({ ...s, baseUrl: e.target.value })
						}}
						className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
						placeholder="https://api.groq.com/openai/v1"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium mb-1">
						مفتاح API {s.hasApiKey && <span className="text-emerald-600 text-xs">(محفوظ: {s.apiKeyHint})</span>}
					</label>
					<input
						dir="ltr"
						type="password"
						value={apiKey}
						onChange={(e) => setApiKey(e.target.value)}
						className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
						placeholder={s.hasApiKey ? "اتركه فارغاً للإبقاء على المفتاح الحالي" : "gsk_... أو sk-..."}
					/>
				</div>

				{/* الموديل — يُجلب تلقائياً */}
				<div>
					<div className="flex items-center justify-between mb-1">
						<label className="block text-sm font-medium">الموديل</label>
						<button
							onClick={() => fetchModels()}
							disabled={loadingModels}
							className="px-3 py-1.5 text-sm rounded-lg border font-medium hover:bg-gray-50 disabled:opacity-50"
						>
							{loadingModels ? "جاري الجلب..." : "جلب الموديلات المتاحة"}
						</button>
					</div>
					{models.length > 0 ? (
						<select
							dir="ltr"
							value={s.model}
							onChange={(e) => setS({ ...s, model: e.target.value })}
							className="w-full border rounded-lg px-3 py-2 font-mono text-sm bg-white"
						>
							{models.map((m) => {
								const tag = tagFor(s.baseUrl, m)
								return (
									<option key={m} value={m}>
										{m}{tag ? ` — ${tag}` : ""}
									</option>
								)
							})}
						</select>
					) : (
						<div className="text-sm text-gray-500 border rounded-lg px-3 py-2 bg-gray-50">
							{s.model ? (
								<>الموديل المحفوظ: <span dir="ltr" className="font-mono">{s.model}</span> — اضغط "جلب الموديلات" للتغيير</>
							) : (
								<>أدخل المفتاح ثم اضغط "جلب الموديلات المتاحة"</>
							)}
						</div>
					)}
				</div>

				<div>
					<label className="block text-sm font-medium mb-1">تعليمات إضافية للموديل (اختياري)</label>
					<textarea
						value={s.systemPrompt}
						onChange={(e) => setS({ ...s, systemPrompt: e.target.value })}
						rows={3}
						className="w-full border rounded-lg px-3 py-2 text-sm"
						placeholder="مثال: ركّز على الشرح خطوة بخطوة..."
					/>
				</div>
			</div>

			{/* أزرار */}
			<div className="flex items-center gap-3">
				<button
					onClick={save}
					disabled={saving}
					className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50"
				>
					{saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
				</button>
				<button
					onClick={testConnection}
					disabled={testing}
					className="px-5 py-2.5 rounded-lg border font-medium hover:bg-gray-50 disabled:opacity-50"
				>
					{testing ? "جاري الاختبار..." : "اختبار الاتصال"}
				</button>
			</div>

			{msg && (
				<div
					className={`p-3 rounded-lg text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}
				>
					{msg.text}
				</div>
			)}
		</div>
	)
}
