import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, ChevronLeft, FileText, GraduationCap, LibraryBig } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { levelFromParam } from "@/lib/lectures";

export const dynamic = "force-dynamic";

function ListHeader({ title, subtitle }: { title: string; subtitle: string }) {
	return (
		<section className="rounded-2xl border bg-gradient-to-l from-primary/[0.10] via-card to-card p-5 shadow-sm">
			<div className="flex items-center gap-3">
				<span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
					<LibraryBig className="h-5 w-5" />
				</span>
				<div><h1 className="text-lg font-bold">{title}</h1><p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p></div>
			</div>
		</section>
	);
}

export default async function LevelPage({ params }: { params: Promise<{ univ: string; level: string }> }) {
	const { univ, level } = await params;
	const lvl = levelFromParam(level);
	if (!lvl) notFound();
	const university = await prisma.university.findUnique({ where: { slug: univ } });
	if (!university) notFound();
	const univTitle = university.nameAr?.trim() || university.name;

	const crumbs = (
		<nav className="mb-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
			<Link href="/lectures" className="hover:text-primary">المحاضرات</Link><ChevronLeft className="h-3 w-3" />
			<Link href={`/lectures/${university.slug}`} className="max-w-[180px] truncate hover:text-primary">{univTitle}</Link><ChevronLeft className="h-3 w-3" />
			<span>{lvl.label}</span>
		</nav>
	);

	if (lvl.isMaster) {
		const groups = await prisma.module.groupBy({ by: ["specialtyId"], where: { universityId: university.id, level: lvl.value }, _count: { _all: true } });
		const ids = groups.map((g) => g.specialtyId).filter((x): x is string => Boolean(x));
		const specialties = await prisma.specialty.findMany({ where: { id: { in: ids } }, orderBy: { name: "asc" } });
		const countMap = new Map(groups.map((g) => [g.specialtyId, g._count._all]));
		return (
			<main className="mx-auto max-w-3xl px-4 py-7 sm:py-9">
				{crumbs}<ListHeader title={lvl.label} subtitle={`${univTitle} · اختر تخصصك`} />
				<div className="mt-4 overflow-hidden rounded-xl border bg-card shadow-sm">
					{specialties.length ? <div className="divide-y">{specialties.map((s) => (
						<Link key={s.id} href={`/lectures/${university.slug}/${lvl.key}/${s.slug}`} className="group flex items-center gap-3 px-3 py-3 transition hover:bg-primary/[0.045]">
							<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><GraduationCap className="h-4 w-4" /></span>
							<span className="min-w-0 flex-1 truncate text-sm font-semibold">{s.nameAr?.trim() || s.name}</span>
							<span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">{countMap.get(s.id) ?? 0} موديل</span>
							<ChevronLeft className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary" />
						</Link>
					))}</div> : <Empty />}
				</div>
			</main>
		);
	}

	const modules = await prisma.module.findMany({ where: { universityId: university.id, level: lvl.value }, include: { _count: { select: { resources: true } } }, orderBy: [{ semester: "asc" }, { name: "asc" }] });
	return (
		<main className="mx-auto max-w-3xl px-4 py-7 sm:py-9">
			{crumbs}<ListHeader title={lvl.label} subtitle={`${univTitle} · اختر الموديل`} />
			{modules.length ? [1, 2].map((semester) => {
				const list = modules.filter((m) => m.semester === semester); if (!list.length) return null;
				return <section key={semester} className="mt-5">
					<div className="mb-2 flex items-center justify-between"><h2 className="text-xs font-bold">السداسي {semester}</h2><span className="text-[10px] text-muted-foreground">{list.length} موديل</span></div>
					<div className="overflow-hidden rounded-xl border bg-card shadow-sm"><div className="divide-y">{list.map((m) => (
						<Link key={m.id} href={`/lectures/module/${m.id}`} className="group flex items-center gap-3 px-3 py-3 transition hover:bg-primary/[0.045]">
							<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><BookOpen className="h-4 w-4" /></span>
							<span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{m.name}</span>{m.coefficient && <span className="block text-[10px] text-muted-foreground">المعامل {m.coefficient}</span>}</span>
							<span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground"><FileText className="h-3 w-3" />{m._count.resources}</span>
							<ChevronLeft className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary" />
						</Link>
					))}</div></div>
				</section>;
			}) : <div className="mt-4 overflow-hidden rounded-xl border bg-card"><Empty /></div>}
		</main>
	);
}

function Empty() {
	return <div className="px-4 py-10 text-center"><FileText className="mx-auto h-6 w-6 text-muted-foreground/35" /><p className="mt-2 text-xs text-muted-foreground">لم تُضف ملفات هنا بعد.</p><p className="mt-1 text-[10px] text-muted-foreground/70">نعمل على إثراء المكتبة تدريجيًا.</p></div>;
}
