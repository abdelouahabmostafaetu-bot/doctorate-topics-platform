// زر "المحاضرات والدروس" — متاح لجميع الزوار (التصفح عام؛ التحميل يبقى للأعضاء المسجّلين)
import Link from "next/link";

export function AdminLecturesButton() {
	return (
		<Link
			href="/lectures"
			className="group flex items-center gap-2.5 rounded-full border border-violet-400/50 bg-white px-5 py-2.5 font-medium text-violet-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-lg hover:shadow-violet-500/15 dark:bg-transparent dark:text-violet-400"
		>
			<span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/10 text-sm transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-[12deg]">
				🎓
			</span>
			المحاضرات والدروس
		</Link>
	);
}
