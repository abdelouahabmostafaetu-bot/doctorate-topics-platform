// المحاضرات — موديلات التخصص (تصميم بسيط)
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { levelFromParam } from "@/lib/lectures";

export const dynamic = "force-dynamic";

export default async function SpecialtyModulesPage({
	params,
}: {
	params: Promise<{ univ: string; level: string; specialty: string }>;
}) {
	const { univ, level, specialty } = await params;
	const lvl = levelFromParam(level);
	if (!lvl || !lvl.isMaster) notFound();
	const [university, spec] = await Promise.all([
		prisma.university.findUnique({ where: { slug: univ } }),
		prisma.specialty.findUnique({ where: { slug: specialty } }),
	]);
	if (!university || !spec) notFound();

	const univTitle = university.nameAr?.trim() || university.name;
	const specTitle = spec.nameAr?.trim() || spec.name;

	const modules = await prisma.module.findMany({
		where: {
			universityId: university.id,
			level: lvl.value,
			specialtyId: spec.id,
		},
		include: { _count: { select: { resources: true } } },
		orderBy: [{ semester: "asc" }, { name: "asc" }],
	});

	return (
		<div className="mx-auto max-w-3xl px-4 py-6">
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
				<Link
					href={"/lectures/" + university.slug + "/" + lvl.key}
					className="hover:text-primary"
				>
					{lvl.label}
				</Link>
				<span className="mx-1">‹</span>
				<span>{specTitle}</span>
			</nav>

			<h1 className="mt-2 text-base font-bold">{specTitle}</h1>
			<p className="mt-0.5 text-xs text-muted-foreground">{lvl.label}</p>

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
