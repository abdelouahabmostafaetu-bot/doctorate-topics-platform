// src/app/api/admin/ai-settings/models/route.ts
// جلب قائمة الموديلات المتاحة تلقائياً من أي مزود متوافق مع OpenAI

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma" // عدّل المسار حسب مشروعك

export const dynamic = "force-dynamic"

const KEY = "reading_mode"

export async function POST(req: NextRequest) {
	// TODO: تحقق من صلاحيات الأدمن هنا (مثل باقي مسارات /api/admin)
	const body = await req.json().catch(() => ({}))
	const s = await prisma.aiSetting.findUnique({ where: { key: KEY } })

	const baseUrl = (typeof body.baseUrl === "string" && body.baseUrl.trim() ? body.baseUrl : s?.baseUrl || "")
		.trim()
		.replace(/\/+$/, "")
	const apiKey = typeof body.apiKey === "string" && body.apiKey.trim() ? body.apiKey.trim() : s?.apiKey || ""

	if (!baseUrl) return NextResponse.json({ error: "أدخل Base URL أولاً" }, { status: 400 })
	if (!apiKey) return NextResponse.json({ error: "أدخل مفتاح API أولاً (أو احفظه ثم أعد المحاولة)" }, { status: 400 })

	try {
		const r = await fetch(`${baseUrl}/models`, {
			headers: { Authorization: `Bearer ${apiKey}` },
			signal: AbortSignal.timeout(20000),
		})
		if (!r.ok) {
			const t = await r.text()
			return NextResponse.json(
				{ error: `فشل جلب الموديلات (${r.status}): ${t.slice(0, 200)}` },
				{ status: 502 },
			)
		}
		const j = await r.json()
		const ids: string[] = Array.isArray(j?.data)
			? j.data.map((m: { id?: unknown }) => String(m?.id ?? "")).filter(Boolean)
			: []
		return NextResponse.json({ models: ids })
	} catch {
		return NextResponse.json({ error: "تعذر الاتصال بالمزود — تحقق من Base URL والمفتاح" }, { status: 502 })
	}
}
