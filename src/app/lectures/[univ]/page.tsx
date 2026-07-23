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
		<main className="mx-auto max-w-3xl px-4 py-7 sm:py-9">
			<nav className="mb-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
				<Link href="/lectures" className="transition hover:text-primary">المحاضرات</Link>
				<ChevronLeft className="h-3 w-3" />
				<span className="truncate">{title}</span>
			</nav>

			<section className="rounded-2xl border bg-gradient-to-l from-primary/[0.10] via-card to-card p-5 shadow-sm">
				<div className="flex items-center gap-3">
					<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
						<Building2 className="h-5 w-5" />
					</span>
					<div className="min-w-0">
						<h1 className="truncate text-lg font-bold">{title}</h1>
						<p className="mt-0.5 text-xs text-muted-foreground">اختر مرحلتك الدراسية</p>
					</div>
				</div>
			</section>

			<div className="mt-4 overflow-hidden rounded-xl border bg-card shadow-sm">
				<div className="divide-y">
					{LEVELS.map((level) => {
						const count = countFor(level.value);
						const Icon = level.isMaster ? GraduationCap : Layers3;
						return (
							<Link
								key={level.key}
								href={`/lectures/${university.slug}/${level.key}`}
								className="group flex items-center gap-3 px-3 py-3 transition hover:bg-primary/[0.045]"
							>
								<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
									<Icon className="h-4 w-4" />
								</span>
								<span className="min-w-0 flex-1">
									<span className="block text-sm font-semibold">{level.label}</span>
									<span className="block text-[10px] text-muted-foreground">
										{level.isMaster ? "اختر التخصص ثم الموديل" : "اختر الموديل والسداسي"}
									</span>
								</span>
								<span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
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
