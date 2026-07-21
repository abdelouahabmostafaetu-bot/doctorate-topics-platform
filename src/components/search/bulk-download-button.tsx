// زر تحميل كل مواضيع الفلترة في ملف PDF واحد (للأعضاء فقط — بدون حلول)
// يوجّه المستخدم إلى صفحة /download الموحّدة (شعار + مؤقّت + مراحل) نفس الطريقة المعتمدة لموضوع واحد
import Link from "next/link";

const btnClass =
	"inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary transition hover:bg-primary hover:text-primary-foreground";

export function BulkDownloadButton({
	university,
	specialty,
	year,
	count,
	isLoggedIn,
}: {
	university: string;
	specialty: string;
	year: string;
	count: number;
	isLoggedIn: boolean;
}) {
	const params = new URLSearchParams();
	if (university) params.set("university", university);
	if (specialty) params.set("specialty", specialty);
	if (year) params.set("year", year);
	const qs = params.toString() ? "?" + params.toString() : "";

	// التحميل الجماعي للأعضاء المسجّلين فقط — نفس القاعدة المطبّقة في صفحة الموضوع الواحد
	if (!isLoggedIn) {
		return (
			<Link
				href="/signin"
				title="التحميل الجماعي متاح للأعضاء المسجلين فقط"
				className={btnClass}
			>
				⬇️ تحميل الكل ({count}) — سجّل دخولك
			</Link>
		);
	}

	return (
		<Link
			href={"/download" + qs}
			title="ملف PDF واحد: غلاف + فهرس + كل موضوع في صفحة مستقلة — بدون حلول"
			className={btnClass}
		>
			⬇️ تحميل الكل ({count}) PDF
		</Link>
	);
}
