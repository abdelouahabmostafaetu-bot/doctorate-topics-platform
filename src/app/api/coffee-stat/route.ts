import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// عدّادات صفحة القهوة: زيارة الصفحة ونسخ حساب CCP
const KEYS: Record<string, string> = {
  view: "coffee_view",
  copy: "coffee_copy",
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as {
      type?: string;
    } | null;
    const key = KEYS[body?.type ?? ""];
    if (!key) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    await prisma.counter.upsert({
      where: { key },
      update: { value: { increment: 1 } },
      create: { key, value: 1 },
    });
    if (key === "coffee_copy") {
      await logCcpCopy(req).catch(() => undefined);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// نوع الجهاز والمتصفح باختصار (بدون حفظ عنوان IP)
function describeDevice(ua: string): string {
  const os = /android/i.test(ua)
    ? "Android"
    : /iphone|ipad|ipod/i.test(ua)
      ? "iOS"
      : /windows/i.test(ua)
        ? "Windows"
        : /mac os/i.test(ua)
          ? "macOS"
          : /linux/i.test(ua)
            ? "Linux"
            : "?";
  const browser = /edg\//i.test(ua)
    ? "Edge"
    : /opr\/|opera/i.test(ua)
      ? "Opera"
      : /chrome|crios/i.test(ua)
        ? "Chrome"
        : /firefox|fxios/i.test(ua)
          ? "Firefox"
          : /safari/i.test(ua)
            ? "Safari"
            : "?";
  const kind = /mobi|android|iphone/i.test(ua) ? "📱" : "💻";
  return `${kind} ${os} · ${browser}`;
}

// يسجّل من نسخ حساب CCP: المستخدم المسجّل باسمه، والزائر كـ"غير مسجّل"
async function logCcpCopy(req: Request) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true },
      })
    : null;
  const device = describeDevice(req.headers.get("user-agent") ?? "");

  await prisma.ccpCopyEvent.create({
    data: {
      userId: user?.id ?? null,
      userName: user?.name ?? null,
      userEmail: user?.email ?? null,
      device,
    },
  });

  if (user) {
    await prisma.userActivity.create({
      data: {
        userId: user.id,
        action: "ccp_copy",
        path: "/coffee",
        label: "نسخ حساب CCP",
      },
    });
  }
}
