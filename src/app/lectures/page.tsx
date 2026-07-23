import { BookOpen, HeartHandshake } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { UniversityDirectory } from "@/components/lectures/university-directory";

export const dynamic = "force-dynamic";

export const metadata = {
	title: "المحاضرات والدروس — منصة مواضيع دكتوراه الرياضيات",
	description: "محاضرات وسلاسل وملخصات دراسية مجانية لكل الجامعات الجزائرية.",
};

export default async function LecturesPage() {
	const universities = await prisma.university.findMany({
		orderBy: { nameAr: "asc" },
		include: { _count: { select: { modules: true } } },
	});
	const items = universities.map((u) => ({
		id: u.id,
		slug: u.slug,
		name: u.name,
		nameAr: u.nameAr,
		city: u.city,
		logoUrl: u.logoUrl,
		modulesCount: u._count.modules,
	}));

	return (
		<main className="mx-auto max-w-3xl px-4 py-5 sm:py-6" style={{ fontFamily: "var(--font-article), Amiri, Georgia, serif" }}>
			<section className="relative overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-l from-blue-500/[0.10] via-card to-amber-500/[0.06] px-3.5 py-3 shadow-[0_3px_18px_hsl(var(--primary)/0.05)]">
				<div className="absolute -left-5 -top-8 h-20 w-20 rounded-full bg-amber-400/10 blur-xl" />
				<span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-primary/15 bg-card/90 px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
					<svg viewBox="0 0 30 20" className="h-3.5 w-[21px] shrink-0 rounded-[3px] shadow-sm ring-1 ring-black/10" aria-label="علم الجزائر">
						<rect width="15" height="20" fill="#006233" />
						<rect x="15" width="15" height="20" fill="#ffffff" />
						<path d="M 18.15 5.49 A 5.5 5.5 0 1 0 18.15 14.51 A 4.8 4.8 0 1 1 18.15 5.49 Z" fill="#d21034" />
						<polygon points="17.5,7.4 18.12,9.15 19.97,9.2 18.5,10.32 19.03,12.1 17.5,11.05 15.97,12.1 16.5,10.32 15.03,9.2 16.88,9.15" fill="#d21034" />
					</svg>
					<span>الجزائر</span>
				</span>
				<div className="relative flex items-center gap-2.5">
					<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-blue-500 text-primary-foreground shadow-sm">
						<BookOpen className="h-4 w-4" />
					</span>
					<div className="min-w-0 flex-1">
						<h1 className="text-base font-bold leading-6 text-foreground">المحاضرات والدروس</h1>
						<p className="text-[11px] leading-5 text-muted-foreground">
							مكتبة مجانية للمحاضرات والسلاسل والملخصات والكتب.
						</p>
					</div>
				</div>
				<div className="relative mt-2 flex items-center gap-1.5 border-t border-primary/10 pt-2 text-[10px] text-primary/80">
					<HeartHandshake className="h-3 w-3 text-amber-500" />
					<span>اختر الجامعة، المستوى، ثم الموديل.</span>
				</div>
			</section>

			<UniversityDirectory items={items} />
		</main>
	);
}
