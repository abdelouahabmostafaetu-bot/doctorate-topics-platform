// نقطة نهاية خاصة ببوت تيليجرام — تُرجع خيارات الفلاتر (الجامعات/التخصصات/السنوات)
// محمية بمفتاح سري BOT_API_SECRET بدل جلسة تسجيل الدخول
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
	const secret = process.env.BOT_API_SECRET;
	if (!secret) return false;
	return req.headers.get("x-bot-secret") === secret;
}

export async function GET(req: NextRequest) {
	if (!authorized(req)) {
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	}

	const [universities, specialties, years] = await Promise.all([
		prisma.university.findMany({
			orderBy: { nameAr: "asc" },
			select: { slug: true, nameAr: true, name: true },
		}),
		prisma.specialty.findMany({
			orderBy: { nameAr: "asc" },
			select: { slug: true, nameAr: true, name: true },
		}),
		prisma.topic.findMany({
			where: { status: "published" },
			distinct: ["year"],
			orderBy: { year: "desc" },
			select: { year: true },
		}),
	]);

	return NextResponse.json({
		universities: universities.map((u) => ({
			slug: u.slug,
			name: u.nameAr || u.name,
		})),
		specialties: specialties.map((s) => ({
			slug: s.slug,
			name: s.nameAr || s.name,
		})),
		years: years.map((y) => y.year),
	});
}
