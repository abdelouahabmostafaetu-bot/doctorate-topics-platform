// app/admin/settings/ai/page.tsx
// صفحة إعدادات AI في لوحة الأدمن — خاصة بمساعد وضع القراءة
"use client"

import { useEffect, useState } from "react"

type Settings = {
	enabled: boolean
	baseUrl: string
	model: string
	systemPrompt: string
	temperature: number
	maxTokens: number
	hasApiKey: boolean
	apiKeyHint: string
}

const PRESETS = [
	{ name: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
	{ name: "Groq (سريع جداً ومجاني)", baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
	{ name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" },
	{ name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", model: "google/gemini-2.0-flash-001" },
]

export default function AiSettingsPage() {
	const [s, setS] = useState<Settings | null>(null)
	const [apiKey, setApiKey] = useState("")
	const [saving, setSaving] = useState(false)
	const [testing, setTesting] = useState(false)
	const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

	useEffect(() => {
		fetch("/api/admin/ai-settings")
			.then((r) => r.json())
			.then(setS)
			.catch(() => setMsg({ ok: false, text: "فشل تحميل الإعدادات" }))
	}, [])

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
				temperature: s.temperature,
				maxTokens: s.maxTokens,
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
					هذه الإعدادات خاصة بمساعد AI الذي يظهر داخل وضع القراءة لشرح التمارين والإجابة عن أسئلة الطلبة.
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
				<div className="font-medium mb-1">قوالب جاهزة للمزودين</div>
				<div className="flex flex-wrap gap-2">
					{PRESETS.map((p) => (
						<button
							key={p.name}
							onClick={() => setS({ ...s, baseUrl: p.baseUrl, model: p.model })}
							className="px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50"
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
						onChange={(e) => setS({ ...s, baseUrl: e.target.value })}
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
						placeholder={s.hasApiKey ? "اتركه فارغاً للإبقاء على المفتاح الحالي" : "sk-..."}
					/>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div className="sm:col-span-1">
						<label className="block text-sm font-medium mb-1">الموديل</label>
						<input
							dir="ltr"
							value={s.model}
							onChange={(e) => setS({ ...s, model: e.target.value })}
							className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium mb-1">Temperature</label>
						<input
							dir="ltr"
							type="number"
							step={0.1}
							min={0}
							max={2}
							value={s.temperature}
							onChange={(e) => setS({ ...s, temperature: Number(e.target.value) })}
							className="w-full border rounded-lg px-3 py-2 text-sm"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium mb-1">أقصى Tokens للرد</label>
						<input
							dir="ltr"
							type="number"
							step={100}
							min={100}
							max={16000}
							value={s.maxTokens}
							onChange={(e) => setS({ ...s, maxTokens: Number(e.target.value) })}
							className="w-full border rounded-lg px-3 py-2 text-sm"
						/>
					</div>
				</div>
				<div>
					<label className="block text-sm font-medium mb-1">تعليمات إضافية للموديل (اختياري)</label>
					<textarea
						value={s.systemPrompt}
						onChange={(e) => setS({ ...s, systemPrompt: e.target.value })}
						rows={4}
						className="w-full border rounded-lg px-3 py-2 text-sm"
						placeholder="مثال: ركّز على الشرح خطوة بخطوة، واذكر المراجع النظرية عند الحاجة..."
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
