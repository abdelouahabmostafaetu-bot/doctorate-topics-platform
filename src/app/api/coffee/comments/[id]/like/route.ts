import { NextResponse } from "next/server"
import { toggleLike } from "@/lib/coffee/comments"

export const dynamic = "force-dynamic"

/** POST /api/coffee/comments/:id/like → toggles the like of the current user. */
export async function POST(
	_req: Request,
	ctx: { params: Promise<{ id: string }> },
) {
	let userId = ""
	try {
		const { auth } = await import("@/auth")
		const session: any = await (auth as any)()
		userId = String(session?.user?.id ?? session?.user?.email ?? "")
	} catch {
		userId = ""
	}

	if (!userId)
		return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 })

	const { id } = await ctx.params
	const res = await toggleLike(id, userId).catch(() => null)
	if (!res) return NextResponse.json({ error: "غير موجود" }, { status: 404 })
	return NextResponse.json(res)
}
