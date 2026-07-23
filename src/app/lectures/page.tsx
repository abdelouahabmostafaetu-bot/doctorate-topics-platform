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
		modulesCount: u._count.modules,
	}));

	return (
		<main className="mx-auto max-w-3xl px-4 py-7 sm:py-9">
			<section className="relative overflow-hidden rounded-2xl border bg-gradient-to-l from-primary/[0.11] via-card to-card px-5 py-5 shadow-sm">
				<div className="absolute -left-10 -top-12 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
				<div className="relative flex items-start gap-3">
					<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
						<BookOpen className="h-5 w-5" />
					</span>
					<div>
						<h1 className="text-lg font-bold sm:text-xl">المحاضرات والدروس</h1>
						<p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
							مكتبة دراسية مجانية: محاضرات، سلاسل TD وTP، ملخصات وكتب تساعد الطلبة في كل المراحل.
						</p>
					</div>
				</div>
				<div className="relative mt-4 flex items-center gap-2 border-t border-primary/10 pt-3 text-[11px] text-muted-foreground">
					<HeartHandshake className="h-3.5 w-3.5 text-primary" />
					<span>اختر جامعتك، ثم المستوى والموديل للوصول إلى الملفات.</span>
				</div>
			</section>

			<UniversityDirectory items={items} />
		</main>
	);
}
