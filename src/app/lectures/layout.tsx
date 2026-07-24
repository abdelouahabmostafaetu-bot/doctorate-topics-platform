// قسم المحاضرات والدروس — متاح لجميع الزوار
// (رفع/إدارة المحتوى تبقى في /admin/lectures للمشرفين فقط)
// التحميل الفعلي للملفات يبقى للأعضاء عبر /api/lectures/download

export default function LecturesLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <>{children}</>;
}
