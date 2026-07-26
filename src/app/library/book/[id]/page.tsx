import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Download, UserRound } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// صفحة تحميل الكتاب — بنفس هوية الموقع
export default async function LibraryBookPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const book = await prisma.libraryBook
		.findUnique({ where: { id }, include: { specialty: true } })
		.catch(() => null);
	if (!book) notFound();

	return (
		<main className="mx-auto max-w-2xl px-4 py-8">
			<nav className="flex items-center gap-1 text-[11px] text-muted-foreground">
				<Link href="/library" className="transition hover:text-primary">
					مكتبة الباحث
				</Link>
				<ChevronRight className="h-3 w-3 rotate-180" />
				<Link
					href={`/library/${book.specialty.slug}`}
					className="transition hover:text-primary"
				>
					{book.specialty.name}
				</Link>
				<ChevronRight className="h-3 w-3 rotate-180" />
				<span className="max-w-40 truncate font-medium text-foreground">
					{book.title}
				</span>
			</nav>

			<section className="mt-4 overflow-hidden rounded-2xl border bg-gradient-to-l from-primary/[0.06] via-card to-card shadow-sm">
				<div className="grid gap-5 p-5 sm:grid-cols-[150px,1fr]">
					<div className="mx-auto w-36 overflow-hidden rounded-lg border shadow-sm sm:w-full">
						{book.coverUrl ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img
								src={book.coverUrl}
								alt={book.title}
								className="aspect-[3/4] w-full object-cover"
							/>
						) : (
							<div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/[0.08] via-secondary/40 to-amber-500/[0.08] p-3 text-center">
								<span className="text-4xl">📕</span>
							</div>
						)}
					</div>

					<div className="flex flex-col">
						<span className="self-start rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
							📚 {book.specialty.name}
						</span>
						<h1 className="mt-2 text-lg font-bold leading-7">{book.title}</h1>
						<p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
							<UserRound className="h-3.5 w-3.5" />
							{book.author}
						</p>
						{book.summary && (
							<p className="mt-3 rounded-lg bg-secondary/35 p-3 text-xs leading-6 text-muted-foreground">
								{book.summary}
							</p>
						)}
						<div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
							<a
								href={`/api/library/download/${book.id}`}
								rel="noopener"
								className="group flex items-center gap-2.5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25"
							>
								<span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 transition-transform duration-300 group-hover:scale-110">
									<Download className="h-3.5 w-3.5" />
								</span>
								تحميل الكتاب
							</a>
							<span className="text-[10px] text-muted-foreground">
								⬇️ {book.downloadsCount.toLocaleString("ar-DZ")} تحميل
							</span>
						</div>
					</div>
				</div>
			</section>

			<p className="mt-4 text-center text-[10px] text-muted-foreground">
				هدفنا مساعدة أكبر عدد من الطلبة والباحثين — شارك المكتبة مع زملائك 💙
			</p>
		</main>
	);
}
