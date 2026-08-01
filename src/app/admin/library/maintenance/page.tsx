import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Combine, Eraser, Trash2 } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
	deleteBooks,
	deleteEmptySpecialties,
	mergeSpecialties,
	purgeSpecialty,
} from "./actions";

export const dynamic = "force-dynamic";

// Library maintenance — SUPER_ADMIN only. Bulk operations that the main page
// deliberately keeps out of reach. English UI, same as the rest of /admin.
export default async function LibraryMaintenancePage() {
	const session = await auth();
	if (session?.user?.role !== "SUPER_ADMIN") notFound();

	const [specialties, books] = await Promise.all([
		prisma.librarySpecialty.findMany({
			orderBy: { name: "asc" },
			include: { _count: { select: { books: true } } },
		}),
		prisma.libraryBook.findMany({
			orderBy: [{ specialtyId: "asc" }, { createdAt: "desc" }],
			take: 500,
			include: { specialty: true },
		}),
	]);
	const emptyCount = specialties.filter((s) => s._count.books === 0).length;

	return (
		<div className="space-y-8 py-3" dir="ltr">
			<header className="flex flex-wrap items-center gap-3">
				<span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-600">
					<AlertTriangle className="h-4 w-4" />
				</span>
				<div>
					<h2 className="text-base font-bold">Library maintenance</h2>
					<p className="text-[11px] text-muted-foreground">
						Super admin only · {books.length} books · {specialties.length} specialties ·{" "}
						{emptyCount} empty
					</p>
				</div>
				<Link
					href="/admin/library"
					className="ml-auto flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition hover:bg-secondary"
				>
					<ArrowLeft className="h-3 w-3" /> Back to library
				</Link>
			</header>

			{/* Merge specialties — moves books, never deletes them */}
			<section>
				<h3 className="mb-1 flex items-center gap-2 text-sm font-bold">
					<Combine className="h-4 w-4 text-primary" /> Merge specialties
				</h3>
				<p className="mb-3 text-[11px] text-muted-foreground">
					Books move to the target specialty, then the selected sources are removed.
					Nothing is deleted.
				</p>
				<form action={mergeSpecialties} className="space-y-3 rounded-xl border bg-card p-3">
					<div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
						{specialties.map((s) => (
							<label
								key={s.id}
								className="flex items-center gap-2 rounded-lg border px-2 py-1.5 text-[11px]"
							>
								<input type="checkbox" name="sourceId" value={s.id} className="h-3 w-3" />
								<span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
								<span className="text-muted-foreground">{s._count.books}</span>
							</label>
						))}
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<span className="text-[11px] text-muted-foreground">Merge into</span>
						<select
							name="targetId"
							required
							className="rounded-lg border bg-background px-2 py-1 text-[11px]"
						>
							<option value="">Choose target specialty</option>
							{specialties.map((s) => (
								<option key={s.id} value={s.id}>
									{s.name}
								</option>
							))}
						</select>
						<button
							type="submit"
							className="rounded-lg bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground transition hover:opacity-90"
						>
							Merge selected
						</button>
					</div>
				</form>
			</section>

			{/* Sweep empty specialties */}
			<section>
				<h3 className="mb-1 flex items-center gap-2 text-sm font-bold">
					<Eraser className="h-4 w-4 text-primary" /> Empty specialties
				</h3>
				<form
					action={deleteEmptySpecialties}
					className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3"
				>
					<span className="text-[11px] text-muted-foreground">
						{emptyCount} specialties currently hold no books.
					</span>
					<button
						type="submit"
						disabled={emptyCount === 0}
						className="rounded-lg border px-3 py-1 text-[11px] font-semibold transition hover:bg-secondary disabled:opacity-40"
					>
						Delete all empty
					</button>
				</form>
			</section>

			{/* Bulk delete books */}
			<section>
				<h3 className="mb-1 flex items-center gap-2 text-sm font-bold">
					<Trash2 className="h-4 w-4 text-red-600" /> Delete books in bulk
				</h3>
				<p className="mb-3 text-[11px] text-muted-foreground">
					Tick every book to remove, then delete once. Stored files are removed too.
				</p>
				{books.length > 0 ? (
					<form action={deleteBooks} className="rounded-xl border bg-card">
						<div className="max-h-[28rem] divide-y overflow-y-auto">
							{books.map((b) => (
								<label key={b.id} className="flex items-center gap-3 px-3 py-2">
									<input type="checkbox" name="bookId" value={b.id} className="h-3.5 w-3.5" />
									<span className="min-w-0 flex-1">
										<span className="block truncate text-xs font-semibold">{b.title}</span>
										<span className="block truncate text-[10px] text-muted-foreground">
											{b.author} · {b.specialty.name}
										</span>
									</span>
								</label>
							))}
						</div>
						<div className="flex items-center justify-between border-t px-3 py-2">
							<span className="text-[10px] text-muted-foreground">
								Showing the newest {books.length} books.
							</span>
							<button
								type="submit"
								className="rounded-lg bg-red-600 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-red-700"
							>
								Delete selected
							</button>
						</div>
					</form>
				) : (
					<p className="rounded-xl border bg-card p-6 text-center text-xs text-muted-foreground">
						The library is empty.
					</p>
				)}
			</section>

			{/* Danger zone — empty a whole specialty */}
			<section>
				<h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-red-600">
					<AlertTriangle className="h-4 w-4" /> Danger zone
				</h3>
				<p className="mb-3 text-[11px] text-muted-foreground">
					Deletes every book inside a specialty, their stored files, and the specialty
					itself. Type DELETE to confirm.
				</p>
				<form
					action={purgeSpecialty}
					className="flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50/40 p-3 dark:border-red-900/50 dark:bg-red-950/20"
				>
					<select
						name="specialtyId"
						required
						className="rounded-lg border bg-background px-2 py-1 text-[11px]"
					>
						<option value="">Choose specialty to empty</option>
						{specialties.map((s) => (
							<option key={s.id} value={s.id}>
								{s.name} ({s._count.books})
							</option>
						))}
					</select>
					<input
						name="confirm"
						placeholder="Type DELETE"
						autoComplete="off"
						className="w-36 rounded-lg border bg-background px-2 py-1 text-[11px]"
					/>
					<button
						type="submit"
						className="rounded-lg bg-red-600 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-red-700"
					>
						Empty specialty
					</button>
				</form>
			</section>
		</div>
	);
}
