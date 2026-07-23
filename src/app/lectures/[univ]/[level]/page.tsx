// المحاضرات — ليسانس: موديلات · ماستر: تخصصات (تصميم بسيط)
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { levelFromParam } from "@/lib/lectures";

export const dynamic = "force-dynamic";

export default async function LevelPage({
	params,
}: {
	params: Promise<{ univ: string; level: string }>;
}) {
	const { univ, level } = await params;
	const lvl = levelFromParam(level);
	if (!lvl) notFound();
	const university = await prisma.university.findUnique({
		where: { slug: univ },
	});
	if (!university) notFound();

	const univTitle = university.nameAr?.trim() || university.name;

	const crumbs = (
		<nav className="text-[11px] text-muted-foreground">
			<Link href="/lectures" className="hover:text-primary">
				المحاضرات
			</Link>
			<span className="mx-1">‹</span>
			<Link
				href={"/lectures/" + university.slug}
				className="hover:text-primary"
			>
				{univTitle}
			</Link>
			<span className="mx-1">‹</span>
			<span>{lvl.label}</span>
		</nav>
	);

	if (lvl.isMaster) {
		const groups = await prisma.module.groupBy({
			by: ["specialtyId"],
			where: { universityId: university.id, level: lvl.value },
			_count: { _all: true },
		});
		const ids = groups
			.map((g) => g.specialtyId)
			.filter((x): x is string => Boolean(x));
		const specialtiesList = await prisma.specialty.findMany({
			where: { id: { in: ids } },
			orderBy: { name: "asc" },
		});
		const countMap = new Map(
			groups.map((g) => [g.specialtyId, g._count._all]),
		);

		return (
			<div className="mx-auto max-w-3xl px-4 py-6">
				{crumbs}
				<h1 className="mt-2 text-base font-bold">{lvl.label}</h1>
				<p className="mt-0.5 text-xs text-muted-foreground">اختر التخصص</p>

				{specialtiesList.length === 0 ? (
					<p className="mt-6 text-center text-xs text-muted-foreground">
						لا يوجد محتوى بعد.
					</p>
				) : (
					<div className="mt-4 divide-y rounded-lg border bg-card">
						{specialtiesList.map((s) => (
							<Link
								key={s.id}
								href={
									"/lectures/" +
									university.slug +
									"/" +
									lvl.key +
									"/" +
									s.slug
								}
								className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition hover:bg-secondary/60"
							>
								<span className="min-w-0 truncate font-medium">
									{s.nameAr?.trim() || s.name}
								</span>
								<span className="shrink-0 text-[11px] text-muted-foreground">
									{(countMap.get(s.id) ?? 0) + " موديل"} ‹
								</span>
							</Link>
						))}
					</div>
				)}
			</div>
		);
	}

	const modules = await prisma.module.findMany({
		where: { universityId: university.id, level: lvl.value },
		include: { _count: { select: { resources: true } } },
		orderBy: [{ semester: "asc" }, { name: "asc" }],
	});

	return (
		<div className="mx-auto max-w-3xl px-4 py-6">
			{crumbs}
			<h1 className="mt-2 text-base font-bold">{lvl.label}</h1>

			{modules.length === 0 ? (
				<p className="mt-6 text-center text-xs text-muted-foreground">
					لا يوجد محتوى بعد.
				</p>
			) : (
				[1, 2].map((sem) => {
					const list = modules.filter((m) => m.semester === sem);
					if (list.length === 0) return null;
					return (
						<section key={sem} className="mt-5">
							<h2 className="mb-2 text-[11px] font-semibold text-muted-foreground">
								السداسي {sem}
							</h2>
							<div className="divide-y rounded-lg border bg-card">
								{list.map((m) => (
									<Link
										key={m.id}
										href={"/lectures/module/" + m.id}
										className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition hover:bg-secondary/60"
									>
										<span className="min-w-0 truncate font-medium">
											{m.name}
										</span>
										<span className="shrink-0 text-[11px] text-muted-foreground">
											{m._count.resources} ملف
											{m.coefficient ? " · م" + m.coefficient : ""}{" "}
											‹
										</span>
									</Link>
								))}
							</div>
						</section>
					);
				})
			)}
		</div>
	);
}
