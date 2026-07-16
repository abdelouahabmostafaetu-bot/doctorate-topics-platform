// ⚠️ هذا الملف يُضاف إلى مشروع موقعك Next.js (وليس مشروع التطبيق)
// المسار: app/api/offline-export/route.ts
// التطبيق يحمّل الامتحانات من هذه النقطة
//
// إذا كان لديك lib/prisma.ts (singleton)، استبدل السطرين أدناه بـ:
// import { prisma } from "@/lib/prisma"

import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export const dynamic = "force-dynamic"

export async function GET() {
	try {
		let topics: any[]
		try {
			// Cas 1: university / specialty sont des relations (tables séparées)
			topics = await prisma.topic.findMany({
				include: { university: true, specialty: true },
			})
		} catch {
			// Cas 2: university / specialty sont des champs texte simples
			topics = await prisma.topic.findMany()
		}

		return NextResponse.json({
			ok: true,
			count: topics.length,
			exportedAt: new Date().toISOString(),
			topics,
		})
	} catch (err: any) {
		return NextResponse.json(
			{ ok: false, error: err?.message ?? "Unknown error" },
			{ status: 500 },
		)
	}
}
