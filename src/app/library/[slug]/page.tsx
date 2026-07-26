import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Download } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PER_PAGE = 20;

// يبني قائمة أرقام الصفحات: 1 2 3 4 … مع نقاط الحذف عند كثرة الصفحات
function pageList(current: number, total: number): (number | "…")[] {
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
	const wanted = new Set<number>([1, 2, current - 1, current, current + 1, total - 1, total]);
	const sorted = [...wanted].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
	const list: (number | "…")[] = [];
	let prev = 0;
	for (const p of sorted) {
		if (p - prev > 1) list.push("…");
		list.push(p);
		prev = p;
	}
	return list;
}

// صفحة كتب التخصص — 20 كتابًا في الصفحة مع ترقيم أنيق
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
		<main className="mx-auto max-w-4xl px-4 py-8">
			<nav className="flex items-center gap-1 text-[11px] text-muted-foreground">
				<Link href="/library" className="transition hover:text-primary">
					مكتبة الباحث
				</Link>
				<ChevronRight className="h-3 w-3 rotate-180" />
				<span className="font-medium text-foreground">{specialty.name}</span>
			</nav>

			<header className="mt-3 flex items-center gap-2.5">
				<span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-lg">
					📚
				</span>
				<div>
					<h1 className="text-lg font-bold leading-6">{specialty.name}</h1>
					<p className="text-[11px] text-muted-foreground">{total} كتاب متاح للتحميل مجانًا</p>
				</div>
			</header>

			{books.length > 0 ? (
				<div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
					{books.map((b) => (
						<div
							key={b.id}
							className="group relative overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
						>
							<Link href={`/library/book/${b.id}`} className="block">
								<div className="relative aspect-[3/4] overflow-hidden bg-secondary/40">
									{b.coverUrl ? (
										// eslint-disable-next-line @next/next/no-img-element
										<img
											src={b.coverUrl}
											alt={b.title}
											loading="lazy"
											className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
										/>
									) : (
										<div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/[0.08] via-secondary/40 to-amber-500/[0.08] p-3 text-center">
											<span className="text-3xl">📕</span>
											<span className="line-clamp-3 text-[10px] font-semibold leading-4 text-muted-foreground">
												{b.title}
											</span>
										</div>
									)}
								</div>
								<div className="p-2.5">
									<h3 className="line-clamp-2 text-xs font-semibold leading-5">
										{b.title}
									</h3>
									<p className="mt-0.5 truncate text-[10px] text-muted-foreground">
										{b.author}
									</p>
								</div>
							</Link>
							{/* أيقونة التحميل — تفتح صفحة تحميل الكتاب */}
							<Link
								href={`/library/book/${b.id}`}
								title="تحميل الكتاب"
								className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 text-primary shadow-md ring-1 ring-border backdrop-blur-sm transition hover:bg-primary hover:text-primary-foreground"
							>
								<Download className="h-4 w-4" />
							</Link>
						</div>
					))}
				</div>
			) : (
				<p className="mt-10 rounded-xl border bg-card p-8 text-center text-xs text-muted-foreground">
					لا توجد كتب في هذا التخصص بعد.
				</p>
			)}

			{totalPages > 1 && (
				<nav className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
					{pageList(page, totalPages).map((p, i) =>
						p === "…" ? (
							<span key={`e${i}`} className="px-1 text-xs text-muted-foreground">
								…
							</span>
						) : p === page ? (
							<span
								key={p}
								className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground shadow-sm"
							>
								{p}
							</span>
						) : (
							<Link
								key={p}
								href={`/library/${specialty.slug}?page=${p}`}
								className="flex h-8 w-8 items-center justify-center rounded-lg border bg-card text-xs font-medium transition hover:border-primary/50 hover:text-primary"
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
