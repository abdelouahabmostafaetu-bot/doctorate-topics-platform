import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { drops } from "@/lib/coffee/db"
import { requireAdmin } from "@/lib/coffee/auth"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/admin/coffee/:id — partial edit (also used by the publish toggle)
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const guard = await requireAdmin()
  if (guard) return guard

  const { id } = await params
  if (!ObjectId.isValid(id))
    return NextResponse.json({ error: "معرف غير صالح" }, { status: 400 })

  const patch = await req.json()
  delete patch._id

  const col = await drops()
  const res = await col.updateOne(
    { _id: new ObjectId(id) },
    { $set: { ...patch, updatedAt: new Date() } },
  )

  if (!res.matchedCount)
    return NextResponse.json({ error: "غير موجود" }, { status: 404 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/coffee/:id
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const guard = await requireAdmin()
  if (guard) return guard

  const { id } = await params
  if (!ObjectId.isValid(id))
    return NextResponse.json({ error: "معرف غير صالح" }, { status: 400 })

  const col = await drops()
  await col.deleteOne({ _id: new ObjectId(id) })
  return NextResponse.json({ ok: true })
}
