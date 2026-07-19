// app/api/admin/ai-settings/route.ts
// إدارة إعدادات AI الخاصة بوضع القراءة (GET / PUT)
// ملاحظة: أضف حماية الأدمن الخاصة بمشروعك (نفس الحماية المستعملة في باقي صفحات /api/admin)

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma" // عدّل المسار حسب مشروعك

const KEY = "reading_mode"

async function getOrCreate() {
	let s = await prisma.aiSetting.findUnique({ where: { key: KEY } })
	if (!s) {
		s = await prisma.aiSetting.create({ data: { key: KEY } })
	}
	return s
}

export async function GET() {
	// TODO: تحقق من صلاحيات الأدمن هنا (مثل باقي مسارات /api/admin في مشروعك)
	const s = await getOrCreate()
	return NextResponse.json({
		enabled: s.enabled,
		baseUrl: s.baseUrl,
		model: s.model,
		systemPrompt: s.systemPrompt,
		temperature: s.temperature,
		maxTokens: s.maxTokens,
		// لا نرجع المفتاح كاملاً أبداً — فقط آخر 4 أحرف للتأكيد
		hasApiKey: s.apiKey.length > 0,
		apiKeyHint: s.apiKey ? `...${s.apiKey.slice(-4)}` : "",
	})
}

export async function PUT(req: NextRequest) {
	// TODO: تحقق من صلاحيات الأدمن هنا
	const body = await req.json()
	const s = await getOrCreate()

	const data: Record<string, unknown> = {}
	if (typeof body.enabled === "boolean") data.enabled = body.enabled
	if (typeof body.baseUrl === "string") data.baseUrl = body.baseUrl.trim().replace(/\/+$/, "")
	if (typeof body.model === "string") data.model = body.model.trim()
	if (typeof body.systemPrompt === "string") data.systemPrompt = body.systemPrompt
	if (typeof body.temperature === "number") data.temperature = Math.min(2, Math.max(0, body.temperature))
	if (typeof body.maxTokens === "number") data.maxTokens = Math.min(16000, Math.max(100, Math.round(body.maxTokens)))
	// المفتاح: إذا أُرسل نص غير فارغ نستبدله، وإذا أُرسل "" نحذفه، وإذا لم يُرسل نتركه
	if (typeof body.apiKey === "string") {
		data.apiKey = body.apiKey.trim()
	}

	const updated = await prisma.aiSetting.update({ where: { key: KEY }, data })
	return NextResponse.json({ ok: true, hasApiKey: updated.apiKey.length > 0 })
}
