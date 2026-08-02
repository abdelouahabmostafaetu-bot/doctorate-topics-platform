import { NextResponse } from "next/server"
import { editComment, removeComment, MAX_COMMENT_LENGTH } from "@/lib/coffee/comments"

export const dynamic = "force-dynamic"

async function currentUser() {
	try {
		const { auth } = await import("@/auth")
		const session: any = await (auth as any)()
		if (!session?.user) return null
		return {
			id: String(session.user.id ?? session.user.email ?? ""),
			isAdmin:
				session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN",
		}
	} catch {
		return null
	}
}

/** PATCH /api/coffee/comments/:id → { body } */
export async function PATCH(
	req: Request,
	ctx: { params: Promise<{ id: string }> },
) {
	const me = await currentUser()
	if (!me) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 })

	const { id } = await ctx.params
	let payload: any
	try {
		payload = await req.json()
	} catch {
		return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 })
	}

	const body = String(payload?.body ?? "").trim()
	if (!body || body.length > MAX_COMMENT_LENGTH)
		return NextResponse.json({ error: "نص غير صالح" }, { status: 400 })

	const ok = await editComment(id, me.id, me.isAdmin, body).catch(() => false)
	if (!ok) return NextResponse.json({ error: "غير مسموح" }, { status: 403 })
	return NextResponse.json({ ok: true, body })
}

/** DELETE /api/coffee/comments/:id */
export async function DELETE(
	_req: Request,
	ctx: { params: Promise<{ id: string }> },
) {
	const me = await currentUser()
	if (!me) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 })

	const { id } = await ctx.params
	const ok = await removeComment(id, me.id, me.isAdmin).catch(() => false)
	if (!ok) return NextResponse.json({ error: "غير مسموح" }, { status: 403 })
	return NextResponse.json({ ok: true })
}
