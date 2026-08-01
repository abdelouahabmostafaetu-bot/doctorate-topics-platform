import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// نبضة تواجد: تحدّث "آخر ظهور" والصفحة الحالية للمستخدم المسجّل
// يستدعيها المتصفح كل 5 دقائق وعند التنقل بين الصفحات
//
// الترويسة x-presence تخبر المتصفح هل سُجّلت النبضة:
//   anonymous → زائر غير مسجّل، فيوقف المتصفح النبض نهائيًا (توفير ضخم)
//   ok        → سُجّلت
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return new NextResponse(null, {
      status: 204,
      headers: { "x-presence": "anonymous" },
    });
  }

  const body = (await request.json().catch(() => null)) as {
    path?: string;
    title?: string;
  } | null;
  const path =
    typeof body?.path === "string" && body.path.startsWith("/")
      ? body.path.slice(0, 300)
      : null;
  const title =
    typeof body?.title === "string" ? body.title.slice(0, 200) : null;

  try {
    // نقرأ آخر صفحة مسجّلة لنعرف هل تغيّرت (فلا نملأ السجل بنبضات مكررة لنفس الصفحة)
    // لا داعي للقراءة إطلاقًا إن لم يرسل المتصفح مسارًا
    const prev = path
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: { lastPath: true },
        })
      : null;

    await prisma.user.update({
      where: { id: userId },
      data: {
        lastSeenAt: new Date(),
        ...(path ? { lastPath: path, lastPathTitle: title } : {}),
      },
    });

    // نسجل حدث "تصفّح" فقط عند تغيّر الصفحة
    if (path && prev && prev.lastPath !== path) {
      await prisma.userActivity.create({
        data: { userId, action: "view", path, label: title },
      });
    }
  } catch {
    // تجاهل الأخطاء (مثل مستخدم محذوف) — النبضة ليست عملية حرجة
  }

  return new NextResponse(null, {
    status: 204,
    headers: { "x-presence": "ok" },
  });
}
