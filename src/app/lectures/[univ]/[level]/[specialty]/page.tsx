import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { levelFromParam } from "@/lib/lectures";

export const dynamic = "force-dynamic";

export default async function SpecialtyPage({ params }: { params: Promise<{ univ: string; level: string; specialty: string }> }) {
	const { univ, level, specialty } = await params;
	const lvl = levelFromParam(level);
	if (!lvl) notFound();
	const [university, spec] = await Promise.all([
		prisma.university.findUnique({ where: { slug: univ } }),
		prisma.lectureSpecialty.findUnique({ where: { slug: specialty } }),
	]);
	if (!university || !spec || spec.universityId !== university.id || spec.level !== lvl.value) notFound();
	const uName = university.nameAr?.trim() || university.name;

	const modules = await prisma.module.findMany({
		where: { universityId: university.id, level: lvl.value, lectureSpecialtyId: spec.id },
		include: { _count: { select: { resources: true } } },
		orderBy: [{ semester: "asc" }, { name: "asc" }],
	});

	return (
		<main className="mx-auto max-w-3xl space-y-6 px-4 py-8" style={{ fontFamily: "var(--font-article), Amiri, Georgia, serif" }}>
			<header className="text-center">
				<h1 className="text-xl font-bold">{lvl.icon} {spec.name}</h1>
				<p className="mt-2 text-xs text-muted-foreground">{uName} — {lvl.label}</p>
			</header>

			{[1, 2].map((sem) => {
				const list = modules.filter((m) => m.semester === sem);
				if (!list.length) return null;
				return (
					<section key={sem}>
						<h2 className="mb-2 text-sm font-bold">السداسي {sem}</h2>
						<div className="grid gap-2 sm:grid-cols-2">
							{list.map((m) => (
								<Link key={m.id} href={`/lectures/module/${m.id}`} className="group flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm transition hover:border-primary/50 hover:shadow">
									<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><BookOpen className="h-4 w-4" /></span>
									<span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{m.name}</span><span className="text-[10px] text-muted-foreground">{m._count.resources} ملف{m.coefficient ? ` · معامل ${m.coefficient}` : ""}</span></span>
									<ChevronLeft className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
								</Link>
							))}
						</div>
					</section>
				);
			})}

			{!modules.length && <p className="rounded-xl border border-dashed bg-card p-8 text-center text-xs text-muted-foreground">لا توجد موديلات بعد في هذا التخصص 🌱</p>}

			<p className="text-center"><Link href={`/lectures/${univ}/${level}`} className="text-[11px] text-primary hover:underline">→ الرجوع</Link></p>
		</main>
	);
}
