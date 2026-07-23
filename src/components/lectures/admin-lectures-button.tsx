"use client";
// زر "المحاضرات والدروس" — يظهر للأدمين فقط (الصفحة الرئيسية مخزّنة ISR، لذا نفحص الجلسة من المتصفح)
import Link from "next/link";
import { useEffect, useState } from "react";

export function AdminLecturesButton() {
	const [isAdmin, setIsAdmin] = useState(false);

	useEffect(() => {
		let active = true;
		fetch("/api/me", { cache: "no-store" })
			.then((r) => (r.ok ? r.json() : { isAdmin: false }))
			.then((d: { isAdmin?: boolean }) => {
				if (active) setIsAdmin(Boolean(d?.isAdmin));
			})
			.catch(() => {});
		return () => {
			active = false;
		};
	}, []);

	if (!isAdmin) return null;

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
