// يعيد حالة المستخدم الحالي (هل هو أدمين؟) — تستعمله الواجهة لإظهار أزرار الأدمين فقط
// الصفحة الرئيسية مخزّنة (ISR)، لذا لا يمكن فحص الجلسة داخلها مباشرة — نفحصها من المتصفح عبر هذا المسار
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
	const session = await auth();
	const role = session?.user?.role ?? null;
	const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
	return NextResponse.json(
		{ isAdmin },
		{ headers: { "Cache-Control": "no-store" } },
	);
}
