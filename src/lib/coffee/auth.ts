import { NextResponse } from "next/server"

/**
 * 🔐 requireAdmin — returns a 401/403 NextResponse when the caller is NOT admin,
 * or null when the caller may proceed.
 *
 * ⚠️ REPLACE the body with your existing auth (you already have /admin, so you
 * already have a session). Two common shapes:
 *
 * — Auth.js / NextAuth v5:
 *     import { auth } from "@/auth"
 *     const session = await auth()
 *     if (!session) return NextResponse.json({ error: "غير مسجل" }, { status: 401 })
 *     if (session.user?.role !== "admin")
 *       return NextResponse.json({ error: "ممنوع" }, { status: 403 })
 *     return null
 *
 * — Simple email allow-list via env ADMIN_EMAILS="a@b.com,c@d.com"
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  try {
    const { auth } = await import("@/auth")
    const session: any = await (auth as any)()

    if (!session?.user)
      return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 })

    const allowed = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)

    const isAdmin =
      session.user.role === "admin" ||
      (allowed.length > 0 && allowed.includes(String(session.user.email).toLowerCase()))

    if (!isAdmin) return NextResponse.json({ error: "ممنوع" }, { status: 403 })
    return null
  } catch {
    // 🚨 Fail closed: if auth cannot be resolved, block writes in production.
    if (process.env.NODE_ENV === "production")
      return NextResponse.json({ error: "المصادقة غير مهيأة" }, { status: 500 })
    return null // allow in local dev
  }
}
