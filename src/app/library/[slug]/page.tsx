import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PER_PAGE = 20;

function SiteLogo({ className = "h-9" }: { className?: string }) {
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

function pageList(current: number, total: number): (number | "…")[] {
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
	const wanted = new Set<number>([
		1,
		2,
		current - 1,
		current,
		current + 1,
		total - 1,
		total,
	]);
	const sorted = [...wanted]
		.filter((p) => p >= 1 && p <= total)
		.sort((a, b) => a - b);
	const list: (number | "…")[] = [];
	let prev = 0;
	for (const p of sorted) {
		if (p - prev > 1) list.push("…");
		list.push(p);
		prev = p;
	}
	return list;
}

// كتب التخصص — غلاف + عنوان + مؤلف، بلا صناديق ثقيلة
export default async function LibrarySpecialtyPage({
	params,
	searchParams,
}: {
	params: Promise<{ slug: string }>;
	searchParams: Promise<{ page?: string }>;
}) {
	const { slug } = await params;
	const sp = await searchParams;
	const specialty = await prisma.librarySpecialty
		.findUnique({ where: { slug } })
		.catch(() => null);
	if (!specialty) notFound();

	const total = await prisma.libraryBook.count({
		where: { specialtyId: specialty.id },
	});
	const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
	const page = Math.min(totalPages, Math.max(1, Number(sp.page) || 1));
	const books = await prisma.libraryBook.findMany({
		where: { specialtyId: specialty.id },
		orderBy: { createdAt: "desc" },
		skip: (page - 1) * PER_PAGE,
		take: PER_PAGE,
	});

	return (
		<main className="mx-auto max-w-4xl px-5 py-8">
			<header className="flex flex-col items-center text-center">
				<Link href="/library" className="opacity-90 transition hover:opacity-100">
					<SiteLogo className="h-11" />
				</Link>
				<nav className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
					<Link href="/library" className="transition hover:text-primary">
						مكتبة الباحث
					</Link>
					<span className="opacity-40">/</span>
					<span className="text-foreground/80">{specialty.name}</span>
				</nav>
				<h1 className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
					{specialty.name}
				</h1>
				<p className="mt-1 text-[10px] text-muted-foreground">
					{total} كتاب متاح للتحميل مجانًا
				</p>
				<span className="mt-4 h-px w-12 bg-gradient-to-l from-transparent via-primary/35 to-transparent" />
			</header>

			{books.length > 0 ? (
				<div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4">
					{books.map((b) => (
						<article key={b.id} className="group relative">
							<Link href={`/library/book/${b.id}`} className="block">
								<div className="relative aspect-[3/4] overflow-hidden rounded-md bg-secondary/30">
									{b.coverUrl ? (
										// eslint-disable-next-line @next/next/no-img-element
										<img
											src={b.coverUrl}
											alt={b.title}
											loading="lazy"
											className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02] group-hover:opacity-95"
										/>
									) : (
										<div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center">
											<span className="text-[10px] font-medium tracking-wide text-muted-foreground/70">
												BOOK
											</span>
											<span className="line-clamp-4 text-[11px] font-medium leading-4 text-muted-foreground">
												{b.title}
											</span>
										</div>
									)}
								</div>
								<h3 className="mt-2.5 line-clamp-2 text-[12px] font-medium leading-5 tracking-tight">
									{b.title}
								</h3>
								<p className="mt-0.5 truncate text-[10px] text-muted-foreground">
									{b.author}
								</p>
							</Link>
							<Link
								href={`/library/book/${b.id}`}
								title="تحميل الكتاب"
								aria-label="تحميل الكتاب"
								className="absolute left-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-background/85 text-primary shadow-sm backdrop-blur-sm transition hover:bg-primary hover:text-primary-foreground"
							>
								<Download className="h-3.5 w-3.5" strokeWidth={1.75} />
							</Link>
						</article>
					))}
				</div>
			) : (
				<p className="mt-14 text-center text-[11px] text-muted-foreground">
					لا توجد كتب في هذا التخصص بعد.
				</p>
			)}

			{totalPages > 1 && (
				<nav className="mt-10 flex flex-wrap items-center justify-center gap-1">
					{pageList(page, totalPages).map((p, i) =>
						p === "…" ? (
							<span
								key={`e${i}`}
								className="px-1 text-[11px] text-muted-foreground"
							>
								…
							</span>
						) : p === page ? (
							<span
								key={p}
								className="flex h-7 min-w-7 items-center justify-center px-1.5 text-[11px] font-semibold text-primary"
							>
								{p}
							</span>
						) : (
							<Link
								key={p}
								href={`/library/${specialty.slug}?page=${p}`}
								className="flex h-7 min-w-7 items-center justify-center px-1.5 text-[11px] text-muted-foreground transition hover:text-primary"
							>
								{p}
							</Link>
						),
					)}
				</nav>
			)}
		</main>
	);
}
