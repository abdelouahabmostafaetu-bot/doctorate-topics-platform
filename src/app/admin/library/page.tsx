import { BookMarked, Library, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { BookForm } from "@/components/admin/book-form";
import { deleteBook, deleteSpecialty } from "./actions";

export const dynamic = "force-dynamic";

// Library admin — intentionally minimal: one form, one list. English UI.
export default async function AdminLibraryPage() {
	const [specialties, books] = await Promise.all([
		prisma.librarySpecialty.findMany({
			orderBy: { name: "asc" },
			include: { _count: { select: { books: true } } },
		}),
		prisma.libraryBook.findMany({
			orderBy: { createdAt: "desc" },
			take: 200,
			include: { specialty: true },
		}),
	]);
	const totalDownloads = books.reduce((n, b) => n + b.downloadsCount, 0);

	return (
		<div className="space-y-8 py-3" dir="ltr">
			<header className="flex flex-wrap items-center gap-3">
				<span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
					<Library className="h-4 w-4" />
				</span>
				<div>
					<h2 className="text-base font-bold">Library</h2>
					<p className="text-[11px] text-muted-foreground">
						{books.length} books · {specialties.length} specialties ·{" "}
						{totalDownloads.toLocaleString("en")} downloads
					</p>
				</div>
			</header>

			{/* Add a book — only the necessary fields, no heavy boxes */}
			<section>
				<h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
					<BookMarked className="h-4 w-4 text-primary" /> Add a book
				</h3>
				<BookForm
					specialties={specialties.map((s) => ({ id: s.id, name: s.name }))}
				/>
			</section>

			{/* Specialties — delete is allowed only when empty */}
			{specialties.length > 0 && (
				<section>
					<h3 className="mb-2 text-sm font-bold">Specialties</h3>
					<div className="flex flex-wrap gap-1.5">
						{specialties.map((s) => (
							<span
								key={s.id}
								className="flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-[11px]"
							>
								<span className="font-medium">{s.name}</span>
								<span className="text-muted-foreground">
									{s._count.books}
								</span>
								{s._count.books === 0 && (
									<form action={deleteSpecialty}>
										<input type="hidden" name="id" value={s.id} />
										<button
											type="submit"
											title="Delete empty specialty"
											className="text-muted-foreground transition hover:text-red-600"
										>
											<Trash2 className="h-3 w-3" />
										</button>
									</form>
								)}
							</span>
						))}
					</div>
				</section>
			)}

			{/* Books list — simple rows, no boxes */}
			<section>
				<h3 className="mb-2 text-sm font-bold">Books</h3>
				{books.length > 0 ? (
					<div className="divide-y rounded-xl border bg-card">
						{books.map((b) => (
							<div key={b.id} className="flex items-center gap-3 px-3 py-2">
								{b.coverUrl ? (
									// eslint-disable-next-line @next/next/no-img-element
									<img
										src={b.coverUrl}
										alt=""
										className="h-12 w-9 shrink-0 rounded object-cover ring-1 ring-border"
									/>
								) : (
									<span className="flex h-12 w-9 shrink-0 items-center justify-center rounded bg-secondary/50 text-sm">
										📕
									</span>
								)}
								<span className="min-w-0 flex-1">
									<span className="block truncate text-xs font-semibold">
										{b.title}
									</span>
									<span className="block truncate text-[10px] text-muted-foreground">
										{b.author} · {b.specialty.name} · {b.downloadsCount}{" "}
										downloads
									</span>
								</span>
								<form action={deleteBook}>
									<input type="hidden" name="id" value={b.id} />
									<button
										type="submit"
										title="Delete book"
										className="rounded-md p-1.5 text-muted-foreground transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
									>
										<Trash2 className="h-3.5 w-3.5" />
									</button>
								</form>
							</div>
						))}
					</div>
				) : (
					<p className="rounded-xl border bg-card p-6 text-center text-xs text-muted-foreground">
						No books yet — add your first one above.
					</p>
				)}
			</section>
		</div>
	);
}
