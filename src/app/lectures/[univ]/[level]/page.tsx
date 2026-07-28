import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, ChevronLeft, GraduationCap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { levelFromParam } from "@/lib/lectures";

export const dynamic = "force-dynamic";

function Empty() {
	return (
		<p className="rounded-xl border border-dashed bg-card p-8 text-center text-xs text-muted-foreground">
			لا يوجد محتوى بعد لهذا المستوى — يُضاف تباعًا 🌱
		</p>
	);
}

export default async function LevelPage({
	params,
}: {
	params: Promise<{ univ: string; level: string }>;
}) {
	const { univ, level } = await params;
	const lvl = levelFromParam(level);
	if (!lvl) notFound();
	const university = await prisma.university.findUnique({ where: { slug: univ } });
	if (!university) notFound();
	const universityName = university.nameAr?.trim() || university.name;

	const [specialties, commonModules] = await Promise.all([
		prisma.lectureSpecialty.findMany({
			where: { universityId: university.id, level: lvl.value },
			include: { _count: { select: { modules: true } } },
			orderBy: { name: "asc" },
		}),
		prisma.module.findMany({
			where: {
				universityId: university.id,
				level: lvl.value,
				lectureSpecialtyId: null,
			},
			include: { _count: { select: { resources: true } } },
			orderBy: [{ semester: "asc" }, { name: "asc" }],
		}),
	]);

	return (
		<main
			className="mx-auto max-w-3xl space-y-6 px-4 py-8"
			style={{ fontFamily: "var(--font-article), Amiri, Georgia, serif" }}
		>
			<header className="text-center">
				<h1 className="text-xl font-bold">
					{lvl.icon} {universityName} — {lvl.label}
				</h1>
				<p className="mt-2 text-xs text-muted-foreground">اختر الموديل لعرض الملفات</p>
			</header>

			{specialties.length > 0 && (
				<section>
					<div className="grid gap-2 sm:grid-cols-2">
						{specialties.map((specialty) => (
							<Link
								key={specialty.id}
								href={`/lectures/${univ}/${level}/${specialty.slug}`}
								className="group flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm transition hover:border-primary/50 hover:shadow"
							>
								<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
									<GraduationCap className="h-4 w-4" />
								</span>
								<span className="min-w-0 flex-1">
									<span className="block truncate text-sm font-semibold">{specialty.name}</span>
									<span className="text-[10px] text-muted-foreground">{specialty._count.modules} موديل</span>
								</span>
								<ChevronLeft className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
							</Link>
						))}
					</div>
				</section>
			)}

			{commonModules.length > 0 && (
				<section>
					<div className="grid gap-2 sm:grid-cols-2">
						{commonModules.map((module) => (
							<Link
								key={module.id}
								href={`/lectures/module/${module.id}`}
								className="group flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm transition hover:border-primary/50 hover:shadow"
							>
								<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
									<BookOpen className="h-4 w-4" />
								</span>
								<span className="min-w-0 flex-1">
									<span className="block truncate text-sm font-semibold">{module.name}</span>
									<span className="text-[10px] text-muted-foreground">{module._count.resources} ملف</span>
								</span>
								<ChevronLeft className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
							</Link>
						))}
					</div>
				</section>
			)}

			{!specialties.length && !commonModules.length && <Empty />}

			<p className="text-center">
				<Link href={`/lectures/${univ}`} className="text-[11px] text-primary hover:underline">
					← الرجوع إلى مستويات الجامعة
				</Link>
			</p>
		</main>
	);
}
