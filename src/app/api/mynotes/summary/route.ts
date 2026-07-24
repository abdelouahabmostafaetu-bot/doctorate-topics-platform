// ملخص «ملاحظاتي» لبطاقة الصفحة الرئيسية — للمدير الأعلى فقط
// الصفحة الرئيسية مخزّنة (ISR)، لذا نفحص الجلسة من المتصفح عبر هذا المسار (نفس نمط /api/me)
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getMylibraryDb,
  normalizeNote,
  noteCandidates,
  notebookCandidates,
} from "@/lib/mylibrary";

export const dynamic = "force-dynamic";

const NO_STORE = { headers: { "Cache-Control": "no-store" } };

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ isSuper: false }, NO_STORE);
  }

  try {
    const db = await getMylibraryDb();
    const existing = (await db.listCollections().toArray()).map((c) => c.name);
    const nbCols = notebookCandidates().filter((c) => existing.includes(c));
    const nCols = noteCandidates().filter((c) => existing.includes(c));

    let notebooks = 0;
    for (const col of nbCols) {
      notebooks += await db.collection(col).countDocuments();
    }

    let notes = 0;
    const recent: Array<{ title: string; updatedAt: string | null }> = [];
    for (const col of nCols) {
      notes += await db.collection(col).countDocuments();
      const docs = await db
        .collection(col)
        .find({})
        .sort({ updatedAt: -1 })
        .limit(3)
        .toArray();
      for (const d of docs) {
        const n = normalizeNote(d, col);
        recent.push({ title: n.title, updatedAt: n.updatedAt });
      }
    }
    recent.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));

    return NextResponse.json(
      { isSuper: true, notebooks, notes, recent: recent.slice(0, 3) },
      NO_STORE,
    );
  } catch {
    // إن تعذّر الاتصال بـ mylibrary نظهر البطاقة دون أرقام بدل إخفائها
    return NextResponse.json(
      { isSuper: true, notebooks: null, notes: null, recent: [] },
      NO_STORE,
    );
  }
}
