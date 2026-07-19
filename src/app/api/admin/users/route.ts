import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { USERNAME_EMAIL_SUFFIX } from "@/lib/username";

export const dynamic = "force-dynamic";

function toUsername(email: string): string {
  return email.endsWith(USERNAME_EMAIL_SUFFIX)
    ? email.slice(0, -USERNAME_EMAIL_SUFFIX.length)
    : email;
}

// قائمة كل المستخدمين المسجلين — للوحة الإدارة فقط
export async function GET() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 1000,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      points: true,
      blocked: true,
      createdAt: true,
      lastSeenAt: true,
    },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      username: toUsername(u.email),
      image: u.image,
      role: u.role,
      points: u.points,
      blocked: u.blocked,
      createdAt: u.createdAt,
      lastSeenAt: u.lastSeenAt,
    })),
  });
}

// حظر / فك حظر مستخدم
export async function PATCH(request: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    userId?: string;
    blocked?: boolean;
  } | null;
  if (!body?.userId || typeof body.blocked !== "boolean") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  // لا يمكنك حظر نفسك
  if (body.userId === session?.user?.id) {
    return NextResponse.json({ error: "cannot_block_self" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: body.userId },
    select: { id: true, role: true },
  });
  if (!target) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // لا يمكن حظر مدير أعلى، وحظر مدير يتطلب مديرًا أعلى
  if (target.role === "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "cannot_block_super_admin" },
      { status: 403 },
    );
  }
  if (target.role === "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "admin_requires_super_admin" },
      { status: 403 },
    );
  }

  const updated = await prisma.user.update({
    where: { id: body.userId },
    data: { blocked: body.blocked },
    select: { id: true, blocked: true },
  });

  return NextResponse.json({ user: updated });
}
