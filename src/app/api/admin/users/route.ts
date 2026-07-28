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
    viewerRole: role,
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      username: toUsername(user.email),
      image: user.image,
      role: user.role,
      points: user.points,
      blocked: user.blocked,
      createdAt: user.createdAt,
      lastSeenAt: user.lastSeenAt,
    })),
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    userId?: string;
    blocked?: boolean;
    action?: "promote";
  } | null;
  if (!body?.userId) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: body.userId },
    select: { id: true, role: true },
  });
  if (!target) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (body.action === "promote") {
    if (role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "super_admin_required" }, { status: 403 });
    }
    if (target.role !== "USER") {
      return NextResponse.json({ error: "already_admin" }, { status: 400 });
    }
    const updated = await prisma.user.update({
      where: { id: body.userId },
      data: { role: "ADMIN", adminPerms: [] },
      select: { id: true, role: true },
    });
    return NextResponse.json({ user: updated });
  }

  if (typeof body.blocked !== "boolean") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (body.userId === session?.user?.id) {
    return NextResponse.json({ error: "cannot_block_self" }, { status: 400 });
  }
  if (target.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "cannot_block_super_admin" }, { status: 403 });
  }
  if (target.role === "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "admin_requires_super_admin" }, { status: 403 });
  }

  const updated = await prisma.user.update({
    where: { id: body.userId },
    data: { blocked: body.blocked },
    select: { id: true, blocked: true },
  });

  return NextResponse.json({ user: updated });
}
