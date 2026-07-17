import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Moderation endpoint. Auth: ?key=SECRET or "Authorization: Bearer SECRET"
// where SECRET = process.env.ADMIN_SECRET or process.env.MCP_SECRET.
function isAuthorized(req: NextRequest): boolean {
	const secret = process.env.ADMIN_SECRET || process.env.MCP_SECRET
	if (!secret) return false
	const key = new URL(req.url).searchParams.get("key")
	const auth = req.headers.get("authorization")
	return key === secret || auth === `Bearer ${secret}`
}

// GET /api/solutions/moderate?key=SECRET -> list PENDING suggestions
export async function GET(req: NextRequest) {
	if (!isAuthorized(req)) {
		return NextResponse.json(
			{ ok: false, error: "Unauthorized" },
			{ status: 401 },
		)
	}
	try {
		const pending = await prisma.solutionSuggestion.findMany({
			where: { status: "PENDING" },
			orderBy: { createdAt: "asc" },
		})

		const topicIds = Array.from(new Set(pending.map((p) => p.topicId)))
		const topics = await prisma.topic.findMany({
			where: { id: { in: topicIds } },
			select: { id: true, title: true },
		})
		const titleById = new Map(topics.map((t) => [t.id, t.title]))

		return NextResponse.json({
			ok: true,
			pending: pending.map((p) => ({
				id: p.id,
				topicId: p.topicId,
				topicTitle: titleById.get(p.topicId) ?? "",
				problemIndex: p.problemIndex,
				authorName: p.authorName,
				contentText: p.contentText,
				createdAt: p.createdAt,
			})),
		})
	} catch {
		return NextResponse.json(
			{ ok: false, error: "Database error" },
			{ status: 500 },
		)
	}
}

// POST /api/solutions/moderate?key=SECRET
// Body: { id, action: "approve" | "reject" }
export async function POST(req: NextRequest) {
	if (!isAuthorized(req)) {
		return NextResponse.json(
			{ ok: false, error: "Unauthorized" },
			{ status: 401 },
		)
	}

	let body: { id?: string; action?: string }
	try {
		body = await req.json()
	} catch {
		return NextResponse.json(
			{ ok: false, error: "Invalid JSON body" },
			{ status: 400 },
		)
	}

	const { id, action } = body ?? {}
	if (!id || (action !== "approve" && action !== "reject")) {
		return NextResponse.json(
			{ ok: false, error: "id and action (approve|reject) are required" },
			{ status: 400 },
		)
	}

	try {
		const updated = await prisma.solutionSuggestion.update({
			where: { id },
			data: { status: action === "approve" ? "APPROVED" : "REJECTED" },
		})
		return NextResponse.json({ ok: true, id: updated.id, status: updated.status })
	} catch {
		return NextResponse.json(
			{ ok: false, error: "Database error" },
			{ status: 500 },
		)
	}
}
