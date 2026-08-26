import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function signInRedirect(req: Request) {
  const url = new URL("/signin", req.url);
  const destination = new URL(req.url);
  url.searchParams.set("callbackUrl", `${destination.pathname}${destination.search}`);
  return NextResponse.redirect(url);
}

// تحميل كتاب من المكتبة — لا يبدأ إلا للمستخدم المسجّل، ثم يزيد العداد
// ويحوّل إلى رابط الملف (R2 أو Drive...).
export async function GET(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return signInRedirect(req);

  const { id } = await params;
  const book = await prisma.libraryBook
    .update({
      where: { id },
      data: { downloadsCount: { increment: 1 } },
    })
    .catch(() => null);
  if (!book?.downloadUrl) {
    return NextResponse.json({ error: "الكتاب غير موجود." }, { status: 404 });
  }
  return NextResponse.redirect(book.downloadUrl);
}
