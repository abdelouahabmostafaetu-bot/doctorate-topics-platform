import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function SiteLogo({ className = "h-11" }: { className?: string }) {
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

// صفحة تحميل الكتاب — تصميم خفيف أنيق بلا صناديق
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
		<main className="mx-auto max-w-2xl px-5 py-8">
			<header className="flex flex-col items-center text-center">
				<Link href="/library" className="opacity-90 transition hover:opacity-100">
					<SiteLogo className="h-12" />
				</Link>
				<nav className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
					<Link href="/library" className="transition hover:text-primary">
						مكتبة الباحث
					</Link>
					<span className="opacity-40">/</span>
					<Link
						href={`/library/${book.specialty.slug}`}
						className="transition hover:text-primary"
					>
						{book.specialty.name}
					</Link>
					<span className="opacity-40">/</span>
					<span className="max-w-[12rem] truncate text-foreground/75">
						{book.title}
					</span>
				</nav>
			</header>

			<section className="mt-8 grid items-start gap-8 sm:grid-cols-[140px,1fr] sm:gap-10">
				<div className="mx-auto w-36 sm:mx-0 sm:w-full">
					{book.coverUrl ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={book.coverUrl}
							alt={book.title}
							className="aspect-[3/4] w-full rounded-md object-cover shadow-sm"
						/>
					) : (
						<div className="flex aspect-[3/4] w-full flex-col items-center justify-center rounded-md bg-secondary/30 text-center">
							<span className="text-[10px] font-medium tracking-wide text-muted-foreground/70">
								BOOK
							</span>
						</div>
					)}
				</div>

				<div className="text-center sm:text-start">
					<p className="text-[10px] font-medium tracking-[0.14em] text-primary/80">
						{book.specialty.name}
					</p>
					<h1 className="mt-2 text-lg font-semibold leading-7 tracking-tight sm:text-xl">
						{book.title}
					</h1>
					<p className="mt-1.5 text-[12px] text-muted-foreground">{book.author}</p>

					{book.summary && (
						<p className="mt-5 text-[12px] leading-7 text-muted-foreground">
							{book.summary}
						</p>
					)}

					<div className="mt-7 flex flex-col items-center gap-3 sm:items-start">
						<a
							href={`/api/library/download/${book.id}`}
							rel="noopener"
							className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[12px] font-medium text-primary-foreground transition hover:opacity-90"
						>
							<Download className="h-3.5 w-3.5" strokeWidth={1.75} />
							تحميل الكتاب
						</a>
						<p className="text-[10px] text-muted-foreground">
							{book.downloadsCount.toLocaleString("ar-DZ")} تحميل
						</p>
					</div>
				</div>
			</section>

			<p className="mt-12 text-center text-[10px] leading-5 text-muted-foreground/80">
				هدفنا مساعدة أكبر عدد من الطلبة والباحثين — شارك المكتبة مع زملائك
			</p>
		</main>
	);
}
