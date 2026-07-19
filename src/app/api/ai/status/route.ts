// app/api/ai/status/route.ts
// مسار عام (بدون أدمن): هل مساعد AI متاح في وضع القراءة؟
// زر AI في وضع القراءة يظهر فقط إذا كانت الإجابة available: true

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma" // عدّل المسار حسب مشروعك

export const dynamic = "force-dynamic"

export async function GET() {
	try {
		const s = await prisma.aiSetting.findUnique({ where: { key: "reading_mode" } })
		const available = Boolean(s && s.enabled && s.apiKey)
		return NextResponse.json({ available })
	} catch {
		return NextResponse.json({ available: false })
	}
}
