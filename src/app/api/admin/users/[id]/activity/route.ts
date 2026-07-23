import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { USERNAME_EMAIL_SUFFIX } from "@/lib/username";

export const dynamic = "force-dynamic";

// سجل نشاط مستخدم واحد (ماذا تصفّح، ماذا حمّل، وأين هو الآن) — للوحة الإدارة فقط
export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await auth();
	const role = session?.user?.role;
	if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
		return NextResponse.json({ error: "unauthorized" }, { status: 403 });
	}

	const { id } = await params;
	const user = await prisma.user.findUnique({
		where: { id },
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
	if (!user) {
		return NextResponse.json({ error: "not_found" }, { status: 404 });
	}

	const activities = await prisma.userActivity.findMany({
		where: { userId: id },
		orderBy: { createdAt: "desc" },
		take: 50,
		select: {
			id: true,
			action: true,
			path: true,
			label: true,
			createdAt: true,
		},
	});

	return NextResponse.json({
		user: {
			id: user.id,
			name: user.name,
			username: user.email.endsWith(USERNAME_EMAIL_SUFFIX)
				? user.email.slice(0, -USERNAME_EMAIL_SUFFIX.length)
				: user.email,
			image: user.image,
			role: user.role,
			lastSeenAt: user.lastSeenAt,
			lastPath: user.lastPath,
			lastPathTitle: user.lastPathTitle,
		},
		activities,
	});
}
