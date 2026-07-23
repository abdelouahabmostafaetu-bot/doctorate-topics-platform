import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, ChevronLeft, FileText, GraduationCap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { levelFromParam } from "@/lib/lectures";

export const dynamic = "force-dynamic";

export default async function SpecialtyModulesPage({ params }: { params: Promise<{ univ: string; level: string; specialty: string }> }) {
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
		where: { universityId: university.id, level: lvl.value, specialtyId: spec.id },
		include: { _count: { select: { resources: true } } },
		orderBy: [{ semester: "asc" }, { name: "asc" }],
	});

	return (
		<main className="mx-auto max-w-3xl px-4 py-5 sm:py-6" style={{ fontFamily: "var(--font-article), Amiri, Georgia, serif" }}>
			<nav className="mb-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
				<Link href="/lectures" className="hover:text-primary">المحاضرات</Link><ChevronLeft className="h-3 w-3" />
				<Link href={`/lectures/${university.slug}`} className="max-w-[130px] truncate hover:text-primary">{univTitle}</Link><ChevronLeft className="h-3 w-3" />
				<Link href={`/lectures/${university.slug}/${lvl.key}`} className="hover:text-primary">{lvl.label}</Link><ChevronLeft className="h-3 w-3" />
				<span className="truncate">{specTitle}</span>
			</nav>
			<section className="rounded-xl border border-primary/15 bg-gradient-to-l from-blue-500/[0.09] via-card to-amber-500/[0.045] p-3.5 shadow-[0_3px_16px_hsl(var(--primary)/0.045)]">
				<div className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary"><GraduationCap className="h-3.5 w-3.5" /></span><div className="min-w-0"><h1 className="truncate text-base font-bold">{specTitle}</h1><p className="mt-0.5 text-xs text-muted-foreground">{lvl.label} · {univTitle}</p></div></div>
			</section>
			{modules.length ? [1, 2].map((semester) => {
				const list = modules.filter((m) => m.semester === semester); if (!list.length) return null;
				return <section key={semester} className="mt-5"><div className="mb-2 flex items-center justify-between"><h2 className="text-xs font-bold">السداسي {semester}</h2><span className="text-[10px] text-muted-foreground">{list.length} موديل</span></div><div className="overflow-hidden rounded-lg border border-primary/15 bg-card shadow-[0_2px_12px_hsl(var(--primary)/0.04)]"><div className="divide-y divide-primary/[0.08]">{list.map((m) => (
					<Link key={m.id} href={`/lectures/module/${m.id}`} className="group flex items-center gap-2.5 border-r-2 border-r-transparent px-3 py-2 transition hover:border-r-primary hover:bg-primary/[0.035]">
						<span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary"><BookOpen className="h-3.5 w-3.5" /></span>
						<span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{m.name}</span>{m.coefficient && <span className="text-[10px] text-muted-foreground">المعامل {m.coefficient}</span>}</span>
						<span className="flex items-center gap-1 rounded-full border border-primary/10 bg-primary/[0.04] px-1.5 py-0.5 text-[9px] text-muted-foreground"><FileText className="h-3 w-3" />{m._count.resources}</span><ChevronLeft className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary" />
					</Link>
				))}</div></div></section>;
			}) : <div className="mt-4 rounded-xl border bg-card px-4 py-10 text-center"><FileText className="mx-auto h-6 w-6 text-muted-foreground/35" /><p className="mt-2 text-xs text-muted-foreground">لم تُضف ملفات لهذا التخصص بعد.</p></div>}
		</main>
	);
}
