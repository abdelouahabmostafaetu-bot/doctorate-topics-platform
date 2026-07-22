import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// نصائح عامة — يتحكم فيها الأدمن من /admin/tips
export async function GET() {
  try {
    const tips = await prisma.siteTip.findMany({
      where: { active: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      select: { text: true, href: true, cta: true },
      take: 50,
    });
    return NextResponse.json(
      { tips },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch {
    // الجدول غير موجود بعد — لا نكسر الواجهة
    return NextResponse.json({ tips: [] });
  }
}
