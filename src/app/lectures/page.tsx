// المحاضرات والدروس — اختيار الجامعة (تصميم بسيط ومضغوط)
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
	title: "المحاضرات والدروس — منصة مواضيع دكتوراه الرياضيات",
	description:
		"محاضرات، سلاسل TD، ملخصات وملفات دراسية لكل الجامعات — من ليسانس 1 إلى ماستر 2",
};

export default async function LecturesPage() {
	const universities = await prisma.university.findMany({
		orderBy: { nameAr: "asc" },
		include: { _count: { select: { modules: true } } },
	});

	return (
		<div className="mx-auto max-w-3xl px-4 py-6">
			<h1 className="text-lg font-bold">المحاضرات والدروس</h1>
			<p className="mt-1 text-xs text-muted-foreground">
				اختر جامعتك ثم المستوى ثم الموديل
			</p>

			<div className="mt-4 divide-y rounded-lg border bg-card">
				{universities.map((u) => {
					const label = u.nameAr?.trim() || u.name;
					return (
						<Link
							key={u.id}
							href={"/lectures/" + u.slug}
							className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition hover:bg-secondary/60"
						>
							<span className="min-w-0 truncate font-medium">{label}</span>
							<span className="shrink-0 text-[11px] text-muted-foreground">
								{u._count.modules > 0
									? u._count.modules + " موديل"
									: "—"}
								{" "}
								<span aria-hidden>‹</span>
							</span>
						</Link>
					);
				})}
			</div>

			{universities.length === 0 && (
				<p className="mt-8 text-center text-xs text-muted-foreground">
					لا توجد جامعات بعد.
				</p>
			)}
		</div>
	);
}
