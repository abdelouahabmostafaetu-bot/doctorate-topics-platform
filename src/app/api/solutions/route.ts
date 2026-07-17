import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/solutions?topicId=...&problemIndex=...
// Returns APPROVED solutions for one exercise.
export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url)
	const topicId = searchParams.get("topicId")
	const problemIndexRaw = searchParams.get("problemIndex")

	if (!topicId || problemIndexRaw === null) {
		return NextResponse.json(
			{ ok: false, error: "topicId and problemIndex are required" },
			{ status: 400 },
		)
	}
	const problemIndex = parseInt(problemIndexRaw, 10)
	if (Number.isNaN(problemIndex)) {
		return NextResponse.json(
			{ ok: false, error: "problemIndex must be a number" },
			{ status: 400 },
		)
	}

	try {
		const solutions = await prisma.solutionSuggestion.findMany({
			where: { topicId, problemIndex, status: "APPROVED" },
			orderBy: { createdAt: "asc" },
			select: {
				id: true,
				problemIndex: true,
				authorName: true,
				contentText: true,
				createdAt: true,
			},
		})
		return NextResponse.json({ ok: true, solutions })
	} catch {
		return NextResponse.json(
			{ ok: false, error: "Database error" },
			{ status: 500 },
		)
	}
}

// POST /api/solutions
// Body: { topicId, problemIndex, authorName?, contentText }
// Creates a PENDING suggestion (moderated before publication).
export async function POST(req: NextRequest) {
	let body: {
		topicId?: string
		problemIndex?: number
		authorName?: string | null
		contentText?: string
	}
	try {
		body = await req.json()
	} catch {
		return NextResponse.json(
			{ ok: false, error: "Invalid JSON body" },
			{ status: 400 },
		)
	}

	const { topicId, problemIndex, authorName, contentText } = body ?? {}

	if (!topicId || typeof problemIndex !== "number" || problemIndex < 0) {
		return NextResponse.json(
			{ ok: false, error: "topicId and problemIndex are required" },
			{ status: 400 },
		)
	}
	if (
		typeof contentText !== "string" ||
		contentText.trim().length < 20 ||
		contentText.length > 20000
	) {
		return NextResponse.json(
			{ ok: false, error: "contentText must be between 20 and 20000 characters" },
			{ status: 400 },
		)
	}

	try {
		const topic = await prisma.topic.findUnique({ where: { id: topicId } })
		if (!topic) {
			return NextResponse.json(
				{ ok: false, error: "Topic not found" },
				{ status: 404 },
			)
		}

		const created = await prisma.solutionSuggestion.create({
			data: {
				topicId,
				problemIndex,
				authorName: authorName && authorName.trim() ? authorName.trim() : null,
				contentText: contentText.trim(),
				status: "PENDING",
			},
		})
		return NextResponse.json({ ok: true, id: created.id })
	} catch {
		return NextResponse.json(
			{ ok: false, error: "Database error" },
			{ status: 500 },
		)
	}
}
