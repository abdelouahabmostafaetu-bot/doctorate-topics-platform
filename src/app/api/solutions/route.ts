// API Ø§Ù„Ø­Ù„ÙˆÙ„ Ø§Ù„Ù…Ù‚ØªØ±Ø­Ø© â€” Ø§Ù„Ù…Ø³Ø§Ø±: app/api/solutions/route.ts
//
// Ø¥Ø°Ø§ ÙƒØ§Ù† Ù„Ø¯ÙŠÙƒ lib/prisma.ts (singleton)ØŒ Ø§Ø³ØªØ¨Ø¯Ù„ Ø§Ù„Ø³Ø·Ø±ÙŠÙ† Ø£Ø¯Ù†Ø§Ù‡ Ø¨Ù€:
// import { prisma } from "@/lib/prisma"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"


export const dynamic = "force-dynamic"

// GET /api/solutions?topicId=...&problemIndex=0
// ÙŠØ±Ø¬Ø¹ Ø§Ù„Ø­Ù„ÙˆÙ„ Ø§Ù„Ù…ÙˆØ§ÙÙ‚ Ø¹Ù„ÙŠÙ‡Ø§ ÙÙ‚Ø· (APPROVED)
export async function GET(req: NextRequest) {
	try {
		const topicId = req.nextUrl.searchParams.get("topicId")
		const problemIndexRaw = req.nextUrl.searchParams.get("problemIndex")
		if (!topicId) {
			return NextResponse.json({ ok: false, error: "topicId requis" }, { status: 400 })
		}
		const where: any = { topicId, status: "APPROVED" }
		if (problemIndexRaw != null && problemIndexRaw !== "") {
			where.problemIndex = Number(problemIndexRaw)
		}
		const solutions = await prisma.solutionSuggestion.findMany({
			where,
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				problemIndex: true,
				authorName: true,
				contentText: true,
				createdAt: true,
			},
		})
		return NextResponse.json({ ok: true, solutions })
	} catch (err: any) {
		return NextResponse.json({ ok: false, error: err?.message ?? "Erreur" }, { status: 500 })
	}
}

// POST /api/solutions
// body: { topicId, problemIndex, authorName?, contentText }
// ÙŠÙ†Ø´Ø¦ Ø§Ù‚ØªØ±Ø§Ø­ Ø­Ù„ Ø¨Ø­Ø§Ù„Ø© PENDING (Ù„Ø§ ÙŠØ¸Ù‡Ø± Ù„Ù„Ø²ÙˆØ§Ø± Ù‚Ø¨Ù„ Ù…ÙˆØ§ÙÙ‚ØªÙƒ)
export async function POST(req: NextRequest) {
	try {
		const body = await req.json()
		const topicId = typeof body.topicId === "string" ? body.topicId.trim() : ""
		const problemIndex = Number(body.problemIndex)
		const authorName =
			typeof body.authorName === "string" ? body.authorName.trim().slice(0, 80) : null
		const contentText = typeof body.contentText === "string" ? body.contentText.trim() : ""

		if (!topicId || !Number.isFinite(problemIndex) || problemIndex < 0) {
			return NextResponse.json({ ok: false, error: "DonnÃ©es invalides" }, { status: 400 })
		}
		if (contentText.length < 20) {
			return NextResponse.json(
				{ ok: false, error: "La solution est trop courte (minimum 20 caractÃ¨res)" },
				{ status: 400 },
			)
		}
		if (contentText.length > 20000) {
			return NextResponse.json(
				{ ok: false, error: "La solution est trop longue (maximum 20000 caractÃ¨res)" },
				{ status: 400 },
			)
		}

		// Ø§Ù„ØªØ£ÙƒØ¯ Ø£Ù† Ø§Ù„Ø§Ù…ØªØ­Ø§Ù† Ù…ÙˆØ¬ÙˆØ¯ ÙØ¹Ù„Ø§Ù‹
		const topic = await prisma.topic.findUnique({ where: { id: topicId } })
		if (!topic) {
			return NextResponse.json({ ok: false, error: "Examen introuvable" }, { status: 404 })
		}

		const created = await prisma.solutionSuggestion.create({
			data: { topicId, problemIndex, authorName, contentText, status: "PENDING" },
		})

		return NextResponse.json({ ok: true, id: created.id })
	} catch (err: any) {
		return NextResponse.json({ ok: false, error: err?.message ?? "Erreur" }, { status: 500 })
	}
}

