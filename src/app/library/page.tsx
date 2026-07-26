import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
	title: "مكتبة الباحث — منصة مواضيع دكتوراه الرياضيات",
	description:
		"كتب ومراجع مجانية في الرياضيات مصنّفة حسب التخصص — تصفح وحمّل مباشرة.",
};

// صفحة المكتبة — قائمة التخصصات (تخصصات مستقلة ينشئها الأدمين)
export default async function LibraryPage() {
	const specialties = await prisma.librarySpecialty.findMany({
		orderBy: { name: "asc" },
		include: { _count: { select: { books: true } } },
	});

	return (
		<main className="mx-auto max-w-3xl px-4 py-8">
			<header className="text-center">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src="/logo-light.png"
					alt="Doc Math DZ"
					className="mx-auto h-16 w-auto dark:hidden"
				/>
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src="/logo-dark.png"
					alt="Doc Math DZ"
					className="mx-auto hidden h-16 w-auto dark:block"
				/>
				<h1 className="mt-3 text-2xl font-bold">مكتبة الباحث</h1>
				<p className="mx-auto mt-1.5 max-w-md text-xs leading-6 text-muted-foreground">
					كتب ومراجع مختارة لمساعدتك في مشوارك — اختر التخصص ثم تصفح الكتب
					وحمّلها مجانًا.
				</p>
			</header>

			{specialties.length > 0 ? (
				<div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3">
					{specialties.map((s) => (
						<Link
							key={s.id}
							href={`/library/${s.slug}`}
							className="group flex items-center gap-2 rounded-lg border border-border/70 bg-card px-3 py-2.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
						>
							<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm transition-transform duration-200 group-hover:scale-110">
								📚
							</span>
							<span className="min-w-0">
								<span className="block truncate text-xs font-semibold">
									{s.name}
								</span>
								<span className="block text-[10px] text-muted-foreground">
									{s._count.books} كتاب
								</span>
							</span>
						</Link>
					))}
				</div>
			) : (
				<p className="mt-10 rounded-xl border bg-card p-8 text-center text-xs text-muted-foreground">
					المكتبة قيد التجهيز — عُد إلينا قريبًا 🌱
				</p>
			)}
		</main>
	);
}
