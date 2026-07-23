// حماية قسم المحاضرات بالكامل — يفتحه الأدمين فقط، وغيره يُعاد للصفحة الرئيسية
// (حتى لو عرف المستخدم الرابط مباشرة، لن يستطيع الدخول)
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function LecturesLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await auth();
	const role = session?.user?.role;
	if (role !== "ADMIN" && role !== "SUPER_ADMIN") redirect("/");
	return <>{children}</>;
}
