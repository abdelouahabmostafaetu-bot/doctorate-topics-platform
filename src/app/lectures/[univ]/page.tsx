import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Building2, ChevronLeft, GraduationCap, Layers3 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { LEVELS } from "@/lib/lectures";

export const dynamic = "force-dynamic";

export default async function UniversityLevelsPage({ params }: { params: Promise<{ univ: string }> }) {
	const { univ } = await params;
	const university = await prisma.university.findUnique({ where: { slug: univ } });
	if (!university) notFound();

	const counts = await prisma.module.groupBy({
		by: ["level"],
		where: { universityId: university.id },
		_count: { _all: true },
	});
	const countFor = (value: string) => counts.find((c) => c.level === value)?._count._all ?? 0;
	const title = university.nameAr?.trim() || university.name;

	return (
		<main className="mx-auto max-w-3xl px-4 py-5 sm:py-6" style={{ fontFamily: "var(--font-article), Amiri, Georgia, serif" }}>
			<nav className="mb-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
				<Link href="/lectures" className="transition hover:text-primary">المحاضرات</Link>
				<ChevronLeft className="h-3 w-3" />
				<span className="truncate">{title}</span>
			</nav>

			<section className="rounded-xl border border-primary/15 bg-gradient-to-l from-blue-500/[0.09] via-card to-amber-500/[0.045] p-3.5 shadow-[0_3px_16px_hsl(var(--primary)/0.045)]">
				<div className="flex items-center gap-3">
					{university.logoUrl ? (
						<span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-primary/10 bg-white shadow-sm">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img src={university.logoUrl} alt={title} className="h-full w-full object-contain p-0.5" />
						</span>
					) : (
						<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
							<Building2 className="h-3.5 w-3.5" />
						</span>
					)}
					<div className="min-w-0">
						<h1 className="truncate text-base font-bold">{title}</h1>
						<p className="mt-0.5 text-xs text-muted-foreground">اختر مرحلتك الدراسية</p>
					</div>
				</div>
			</section>

			<div className="mt-4 overflow-hidden rounded-lg border border-primary/15 bg-card shadow-[0_2px_12px_hsl(var(--primary)/0.04)]">
				<div className="divide-y divide-primary/[0.08]">
					{LEVELS.map((level) => {
						const count = countFor(level.value);
						const Icon = level.isMaster ? GraduationCap : Layers3;
						return (
							<Link
								key={level.key}
								href={`/lectures/${university.slug}/${level.key}`}
								className="group flex items-center gap-2.5 border-r-2 border-r-transparent px-3 py-2 transition hover:border-r-primary hover:bg-primary/[0.035]"
							>
								<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
									<Icon className="h-3.5 w-3.5" />
								</span>
								<span className="min-w-0 flex-1">
									<span className="block text-sm font-semibold">{level.label}</span>
									<span className="block text-[10px] text-muted-foreground">
										{level.isMaster ? "اختر التخصص ثم الموديل" : "اختر الموديل والسداسي"}
									</span>
								</span>
								<span className="rounded-full border border-primary/10 bg-primary/[0.04] px-1.5 py-0.5 text-[9px] text-muted-foreground">
									{count > 0 ? `${count} موديل` : "قريبًا"}
								</span>
								<ChevronLeft className="h-4 w-4 text-muted-foreground/50 transition group-hover:-translate-x-0.5 group-hover:text-primary" />
							</Link>
						);
					})}
				</div>
			</div>

			<p className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
				<BookOpen className="h-3 w-3" /> الملفات المتاحة مجانية لخدمة الطلبة
			</p>
		</main>
	);
}
