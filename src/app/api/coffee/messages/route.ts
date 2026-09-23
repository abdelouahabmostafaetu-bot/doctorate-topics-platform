import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getClientIp, isRateLimited, recordHit } from "@/lib/rate-limit"
import {
  addCoffeeMessage,
  MAX_COFFEE_MESSAGE_LENGTH,
} from "@/lib/coffee/messages"

export const dynamic = "force-dynamic"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** POST /api/coffee/messages — رسائل خاصة تصل إلى لوحة الإدارة فقط. */
export async function POST(req: Request) {
  const ip = await getClientIp()
  const bucketKey = `coffee-message:${ip}`
  const limit = isRateLimited(bucketKey, 5)
  if (limit.limited) {
    return NextResponse.json(
      { ok: false, error: "أرسلتَ رسائل كثيرة. حاول بعد قليل." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    )
  }
  recordHit(bucketKey, 60 * 60 * 1000)

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "الطلب غير صالح" }, { status: 400 })
  }

  // حقل مخفي؛ نجيب طلبات الروبوتات بهدوء دون إظهار نجاح حقيقي.
  if (String(payload?.website ?? "").trim()) {
    return NextResponse.json({ ok: true })
  }

  const body = String(payload?.body ?? "").trim()
  const name = String(payload?.name ?? "").trim()
  const email = String(payload?.email ?? "").trim()

  if (body.length < 3) {
    return NextResponse.json({ ok: false, error: "اكتب رسالة قصيرة أولًا." }, { status: 400 })
  }
  if (body.length > MAX_COFFEE_MESSAGE_LENGTH) {
    return NextResponse.json({ ok: false, error: "الرسالة طويلة جدًا." }, { status: 400 })
  }
  if (name.length > 80) {
    return NextResponse.json({ ok: false, error: "الاسم طويل جدًا." }, { status: 400 })
  }
  if (email && (email.length > 160 || !EMAIL_RE.test(email))) {
    return NextResponse.json({ ok: false, error: "البريد الإلكتروني غير صالح." }, { status: 400 })
  }

  try {
    const session = await auth()
    const user = session?.user as { id?: string; name?: string | null } | undefined
    await addCoffeeMessage({
      name: name || null,
      email: email || null,
      body,
      userId: user?.id || null,
      userName: user?.name || null,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[coffee-messages] POST failed:", error)
    return NextResponse.json({ ok: false, error: "تعذّر حفظ الرسالة. حاول لاحقًا." }, { status: 500 })
  }
}
