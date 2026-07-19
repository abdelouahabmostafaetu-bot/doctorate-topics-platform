import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// نبضة تواجد: تحدّث "آخر ظهور" للمستخدم المسجّل — يستدعيها المتصفح كل دقيقة
export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return new NextResponse(null, { status: 204 });

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: new Date() },
    });
  } catch {
    // تجاهل الأخطاء (مثل مستخدم محذوف) — النبضة ليست عملية حرجة
  }

  return new NextResponse(null, { status: 204 });
}
