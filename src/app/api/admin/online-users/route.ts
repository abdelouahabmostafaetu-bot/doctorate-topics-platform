import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { USERNAME_EMAIL_SUFFIX } from "@/lib/username";

export const dynamic = "force-dynamic";

// نعتبر المستخدم متصلًا إذا وصلت منه نبضة تواجد خلال آخر دقيقتين
const ONLINE_WINDOW_MS = 2 * 60 * 1000;

export async function GET() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const since = new Date(Date.now() - ONLINE_WINDOW_MS);
  const users = await prisma.user.findMany({
    where: { lastSeenAt: { gte: since } },
    orderBy: { lastSeenAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      lastSeenAt: true,
      lastPath: true,
      lastPathTitle: true,
    },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      // اسم المستخدم مخزّن كبريد داخلي username@users.local — نعيده كاسم مستخدم
      username: u.email.endsWith(USERNAME_EMAIL_SUFFIX)
        ? u.email.slice(0, -USERNAME_EMAIL_SUFFIX.length)
        : u.email,
      image: u.image,
      role: u.role,
      lastSeenAt: u.lastSeenAt,
      lastPath: u.lastPath,
      lastPathTitle: u.lastPathTitle,
    })),
  });
}
