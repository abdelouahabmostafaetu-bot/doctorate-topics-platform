import { NextResponse } from "next/server"
import { addComment, listComments, MAX_COMMENT_LENGTH } from "@/lib/coffee/comments"
import { getProblem } from "@/lib/coffee/problems"

export const dynamic = "force-dynamic"

type SessionUser = {
	id?: string
	name?: string | null
	email?: string | null
	image?: string | null
	role?: string
}

async function currentUser(): Promise<SessionUser | null> {
	try {
		const { auth } = await import("@/auth")
		const session: any = await (auth as any)()
		return session?.user ?? null
	} catch {
		return null
	}
}

function userId(u: SessionUser): string {
	return String(u.id ?? u.email ?? "")
}

/** GET /api/coffee/comments?slug=… → the whole thread of one problem. */
export async function GET(req: Request) {
	const slug = new URL(req.url).searchParams.get("slug") ?? ""
	if (!slug) return NextResponse.json({ comments: [] })

	const me = await currentUser()
	const myId = me ? userId(me) : ""
	const rows = await listComments(slug)

	return NextResponse.json({
		comments: rows.map((c) => ({
			id: String(c._id),
			parentId: c.parentId ?? null,
			authorId: c.authorId,
			authorName: c.authorName,
			authorImage: c.authorImage ?? null,
			body: c.body,
			likes: (c.likes ?? []).length,
			likedByMe: Boolean(myId) && (c.likes ?? []).includes(myId),
			mine: Boolean(myId) && c.authorId === myId,
			createdAt: c.createdAt,
			editedAt: c.editedAt ?? null,
		})),
	})
}

/** POST /api/coffee/comments → { slug, body, parentId? } */
export async function POST(req: Request) {
	const me = await currentUser()
	if (!me) return NextResponse.json({ error: "يجب تسجيل الدخول للتعليق" }, { status: 401 })

	let payload: any
	try {
		payload = await req.json()
	} catch {
		return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 })
	}

	const slug = String(payload?.slug ?? "")
	const body = String(payload?.body ?? "").trim()
	const parentId = payload?.parentId ? String(payload.parentId) : null

	if (!getProblem(slug) || !slug)
		return NextResponse.json({ error: "مسألة غير معروفة" }, { status: 400 })
	if (body.length < 1)
		return NextResponse.json({ error: "التعليق فارغ" }, { status: 400 })
	if (body.length > MAX_COMMENT_LENGTH)
		return NextResponse.json({ error: "التعليق طويل جدًا" }, { status: 400 })

	try {
		const saved = await addComment({
			problemSlug: slug,
			parentId,
			authorId: userId(me),
			authorName: me.name || "مستخدم",
			authorImage: me.image ?? null,
			body,
		})

		return NextResponse.json({
			comment: {
				id: String(saved._id),
				parentId: saved.parentId,
				authorId: saved.authorId,
				authorName: saved.authorName,
				authorImage: saved.authorImage,
				body: saved.body,
				likes: 0,
				likedByMe: false,
				mine: true,
				createdAt: saved.createdAt,
				editedAt: null,
			},
		})
	} catch (err) {
		console.error("[comments] POST failed:", err)
		return NextResponse.json({ error: "تعذّر حفظ التعليق" }, { status: 500 })
	}
}
