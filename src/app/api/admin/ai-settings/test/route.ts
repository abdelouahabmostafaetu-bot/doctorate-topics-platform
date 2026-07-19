// app/api/admin/ai-settings/test/route.ts
// زر "اختبار الاتصال" في صفحة الإعدادات: يجرب طلباً صغيراً على المزود للتأكد أن المفتاح والموديل يعملان

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma" // عدّل المسار حسب مشروعك

export async function POST() {
	// TODO: تحقق من صلاحيات الأدمن هنا
	const s = await prisma.aiSetting.findUnique({ where: { key: "reading_mode" } })
	if (!s || !s.apiKey) {
		return NextResponse.json({ ok: false, error: "لا يوجد مفتاح API محفوظ" }, { status: 400 })
	}
	try {
		const r = await fetch(`${s.baseUrl}/chat/completions`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${s.apiKey}`,
			},
			body: JSON.stringify({
				model: s.model,
				messages: [{ role: "user", content: "قل: جاهز" }],
				max_tokens: 10,
			}),
			// مهلة قصيرة
			signal: AbortSignal.timeout(20000),
		})
		if (!r.ok) {
			const t = await r.text()
			return NextResponse.json({ ok: false, error: `HTTP ${r.status}: ${t.slice(0, 300)}` }, { status: 400 })
		}
		const j = await r.json()
		const reply = j?.choices?.[0]?.message?.content ?? ""
		return NextResponse.json({ ok: true, reply })
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : String(e)
		return NextResponse.json({ ok: false, error: msg }, { status: 400 })
	}
}
