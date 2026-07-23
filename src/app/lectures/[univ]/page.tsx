// المحاضرات — اختيار المستوى (تصميم بسيط)
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LEVELS } from "@/lib/lectures";

export const dynamic = "force-dynamic";

export default async function UniversityLevelsPage({
	params,
}: {
	params: Promise<{ univ: string }>;
}) {
	const { univ } = await params;
	const university = await prisma.university.findUnique({
		where: { slug: univ },
	});
	if (!university) notFound();

	const counts = await prisma.module.groupBy({
		by: ["level"],
		where: { universityId: university.id },
		_count: { _all: true },
	});
	const countFor = (v: string) =>
		counts.find((c) => c.level === v)?._count._all ?? 0;

	const title = university.nameAr?.trim() || university.name;

	return (
		<div className="mx-auto max-w-3xl px-4 py-6">
			<nav className="text-[11px] text-muted-foreground">
				<Link href="/lectures" className="hover:text-primary">
					المحاضرات
				</Link>
				<span className="mx-1">‹</span>
				<span>{title}</span>
			</nav>

			<h1 className="mt-2 text-base font-bold">{title}</h1>
			<p className="mt-0.5 text-xs text-muted-foreground">اختر المستوى</p>

			<div className="mt-4 divide-y rounded-lg border bg-card">
				{LEVELS.map((l) => {
					const n = countFor(l.value);
					return (
						<Link
							key={l.key}
							href={"/lectures/" + university.slug + "/" + l.key}
							className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition hover:bg-secondary/60"
						>
							<span className="font-medium">{l.label}</span>
							<span className="text-[11px] text-muted-foreground">
								{n > 0 ? n + " موديل" : "—"}
								{" "}
								<span aria-hidden>‹</span>
							</span>
						</Link>
					);
				})}
			</div>
		</div>
	);
}
