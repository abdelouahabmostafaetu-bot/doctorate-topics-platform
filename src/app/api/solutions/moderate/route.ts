// Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø­Ù„ÙˆÙ„ Ø§Ù„Ù…Ù‚ØªØ±Ø­Ø© (Ù„Ù„Ù…Ø´Ø±Ù ÙÙ‚Ø·) â€” Ø§Ù„Ù…Ø³Ø§Ø±: app/api/solutions/moderate/route.ts
// Ù…Ø­Ù…ÙŠ Ø¨Ù…ÙØªØ§Ø­ Ø³Ø±ÙŠ: Ø£Ø¶Ù ADMIN_SECRET ÙÙŠ Environment Variables Ø¹Ù„Ù‰ Vercel
// (Ø£Ùˆ Ø³ÙŠØ³ØªØ®Ø¯Ù… MCP_SECRET Ø§Ù„Ù…ÙˆØ¬ÙˆØ¯ Ø¹Ù†Ø¯Ùƒ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹)
//
// Ø¥Ø°Ø§ ÙƒØ§Ù† Ù„Ø¯ÙŠÙƒ lib/prisma.ts (singleton)ØŒ Ø§Ø³ØªØ¨Ø¯Ù„ Ø§Ù„Ø³Ø·Ø±ÙŠÙ† Ø£Ø¯Ù†Ø§Ù‡ Ø¨Ù€:
// import { prisma } from "@/lib/prisma"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"


export const dynamic = "force-dynamic"

function checkKey(req: NextRequest): boolean {
	const secret = process.env.ADMIN_SECRET || process.env.MCP_SECRET
	if (!secret) return false
	const key =
		req.nextUrl.searchParams.get("key") ||
		(req.headers.get("authorization") || "").replace("Bearer ", "")
	return key === secret
}

// GET /api/solutions/moderate?key=SECRET
// ÙŠØ¹Ø±Ø¶ ÙƒÙ„ Ø§Ù„Ø­Ù„ÙˆÙ„ ÙÙŠ Ø§Ù„Ø§Ù†ØªØ¸Ø§Ø± (PENDING)
export async function GET(req: NextRequest) {
	if (!checkKey(req)) {
		return NextResponse.json({ ok: false, error: "Non autorisÃ©" }, { status: 401 })
	}
	try {
		const pending = await prisma.solutionSuggestion.findMany({
			where: { status: "PENDING" },
			orderBy: { createdAt: "asc" },
		})
		// Ø¥Ø¶Ø§ÙØ© Ø¹Ù†ÙˆØ§Ù† Ø§Ù„Ø§Ù…ØªØ­Ø§Ù† Ù„ÙƒÙ„ Ø§Ù‚ØªØ±Ø§Ø­ Ù„ØªØ³Ù‡ÙŠÙ„ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©
		const topicIds = Array.from(new Set(pending.map((p) => p.topicId)))
		const topics = await prisma.topic.findMany({ where: { id: { in: topicIds } } })
		const titleById = new Map(topics.map((t: any) => [t.id, t.title ?? t.name ?? t.id]))
		return NextResponse.json({
			ok: true,
			count: pending.length,
			pending: pending.map((p) => ({
				...p,
				topicTitle: titleById.get(p.topicId) ?? p.topicId,
			})),
		})
	} catch (err: any) {
		return NextResponse.json({ ok: false, error: err?.message ?? "Erreur" }, { status: 500 })
	}
}

// POST /api/solutions/moderate?key=SECRET
// body: { id, action: "approve" | "reject" }
export async function POST(req: NextRequest) {
	if (!checkKey(req)) {
		return NextResponse.json({ ok: false, error: "Non autorisÃ©" }, { status: 401 })
	}
	try {
		const body = await req.json()
		const id = typeof body.id === "string" ? body.id : ""
		const action = body.action
		if (!id || (action !== "approve" && action !== "reject")) {
			return NextResponse.json({ ok: false, error: "DonnÃ©es invalides" }, { status: 400 })
		}
		const updated = await prisma.solutionSuggestion.update({
			where: { id },
			data: { status: action === "approve" ? "APPROVED" : "REJECTED" },
		})
		return NextResponse.json({ ok: true, id: updated.id, status: updated.status })
	} catch (err: any) {
		return NextResponse.json({ ok: false, error: err?.message ?? "Erreur" }, { status: 500 })
	}
}

