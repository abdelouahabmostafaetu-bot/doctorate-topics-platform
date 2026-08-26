import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
	title: "مكتبة الباحث — منصة مواضيع دكتوراه الرياضيات",
	description:
		"كتب ومراجع مجانية في الرياضيات مصنّفة حسب التخصص — سجّل الدخول للوصول إلى التحميل.",
};

function SiteLogo({ className = "h-14" }: { className?: string }) {
	return (
		<>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src="/logo-light.png"
				alt="Doc Math DZ"
				className={`${className} w-auto dark:hidden`}
			/>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src="/logo-dark.png"
				alt="Doc Math DZ"
				className={`${className} hidden w-auto dark:block`}
			/>
		</>
	);
}

// صفحة المكتبة — تصميم خفيف أنيق بلا صناديق
export default async function LibraryPage() {
	const specialties = await prisma.librarySpecialty.findMany({
		orderBy: { name: "asc" },
		include: { _count: { select: { books: true } } },
	});

	return (
		<main className="mx-auto max-w-2xl px-5 py-10">
			<header className="flex flex-col items-center text-center">
				<SiteLogo className="h-16" />
				<p className="mt-4 text-[11px] font-medium tracking-[0.18em] text-primary/80">
					LIBRARY
				</p>
				<h1 className="mt-1.5 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
					مكتبة الباحث
				</h1>
				<p className="mx-auto mt-2 max-w-sm text-[11px] leading-6 text-muted-foreground">
					كتب ومراجع مختارة لمساعدتك في مشوارك — اختر التخصص ثم تصفح الكتب
					وحمّلها مجانًا بعد تسجيل الدخول.
				</p>
				<span className="mt-5 h-px w-16 bg-gradient-to-l from-transparent via-primary/40 to-transparent" />
			</header>

			{specialties.length > 0 ? (
				<ul className="mt-10 divide-y divide-border/40">
					{specialties.map((s) => (
						<li key={s.id}>
							<Link
								href={`/library/${s.slug}`}
								className="group flex items-baseline justify-between gap-4 py-3.5 transition-colors"
							>
								<span className="min-w-0 text-[13px] font-medium tracking-tight text-foreground transition-colors group-hover:text-primary">
									{s.name}
								</span>
								<span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/80">
									{s._count.books} كتاب
									<span className="mr-1.5 inline-block text-muted-foreground/50 transition-transform group-hover:-translate-x-0.5">
										←
									</span>
								</span>
							</Link>
						</li>
					))}
				</ul>
			) : (
				<p className="mt-14 text-center text-[11px] text-muted-foreground">
					المكتبة قيد التجهيز — عُد إلينا قريبًا
				</p>
			)}
		</main>
	);
}
