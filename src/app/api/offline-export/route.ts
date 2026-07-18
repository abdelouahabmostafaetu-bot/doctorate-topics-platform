import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// مكتبة القراءة دون اتصال: تصدّر كل المواضيع المنشورة دفعة واحدة
// تطلبها صفحة /library ثم تخزنها في جهاز المستخدم (IndexedDB)
export const revalidate = 3600;

export async function GET() {
  try {
    const topics = await prisma.topic.findMany({
      where: { status: "published" },
      orderBy: [{ year: "desc" }, { examNumber: "asc" }],
      select: {
        slug: true,
        title: true,
        year: true,
        examType: true,
        examNumber: true,
        durationMinutes: true,
        university: { select: { name: true, nameAr: true } },
        specialty: { select: { name: true, nameAr: true } },
        problems: true,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        count: topics.length,
        exportedAt: new Date().toISOString(),
        topics,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "export_failed" },
      { status: 500 },
    );
  }
}
