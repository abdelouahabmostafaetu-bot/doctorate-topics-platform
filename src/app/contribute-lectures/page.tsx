import Link from "next/link";
import { BookOpenCheck, Gift, Sparkles, UploadCloud } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fmtSize } from "@/lib/lectures";
import { LectureContributionForm } from "@/components/contribute/lecture-contribution-form";

export const dynamic = "force-dynamic";

export const metadata = {
	title: "ساهم بدروس جامعتك — منصة مواضيع دكتوراه الرياضيات",
};

function StatusChip({ status, points }: { status: string; points: number | null }) {
	if (status === "accepted") return <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600">✅ مقبولة{points ? ` — +${points} نقطة ⭐` : ""}</span>;
	if (status === "rejected") return <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-600">❌ مرفوضة</span>;
	return <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600">⏳ قيد المراجعة</span>;
}

export default async function ContributeLecturesPage() {
	const session = await auth();

	if (!session?.user?.id) {
		return (
			<main className="mx-auto max-w-2xl px-4 py-12 text-center" style={{ fontFamily: "var(--font-article), Amiri, Georgia, serif" }}>
				<h1 className="text-2xl font-bold">📚 ساهم بدروس جامعتك</h1>
				<p className="mt-3 text-sm leading-7 text-muted-foreground">شارك محاضراتك وملخصاتك مع آلاف الطلبة. للمساهمة، سجّل دخولك أولًا حتى نحسب لك نقاطك. ⭐</p>
				<Link href="/signin" className="mt-6 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90">تسجيل الدخول</Link>
			</main>
		);
	}

	const mine = await prisma.lectureContribution.findMany({
		where: { userId: session.user.id },
		orderBy: { createdAt: "desc" },
		take: 20,
	});

	return (
		<main className="mx-auto max-w-3xl space-y-6 px-4 py-8" style={{ fontFamily: "var(--font-article), Amiri, Georgia, serif" }}>
			<header className="text-center">
				<h1 className="text-2xl font-bold">📚 ساهم بدروس جامعتك</h1>
				<p className="mt-3 text-sm leading-7 text-muted-foreground">
					عندك محاضرات، سلاسل TD، ملخصات أو كتب؟ ارفعها كما هي — دون أي ترتيب.
					نحن نصنّفها وننشرها للطلبة، وتحصل أنت على نقاط. ⭐
				</p>
			</header>

			<div className="grid gap-2 sm:grid-cols-3">
				<div className="rounded-xl border border-primary/15 bg-card p-3 text-center"><UploadCloud className="mx-auto h-5 w-5 text-primary" /><p className="mt-1.5 text-xs font-semibold">1. ارفع أي ملف</p><p className="mt-0.5 text-[10px] text-muted-foreground">دون ترتيب أو تصنيف</p></div>
				<div className="rounded-xl border border-primary/15 bg-card p-3 text-center"><BookOpenCheck className="mx-auto h-5 w-5 text-primary" /><p className="mt-1.5 text-xs font-semibold">2. نحن نفرز وننشر</p><p className="mt-0.5 text-[10px] text-muted-foreground">يصبح متاحًا للتحميل للجميع</p></div>
				<div className="rounded-xl border border-primary/15 bg-card p-3 text-center"><Gift className="mx-auto h-5 w-5 text-primary" /><p className="mt-1.5 text-xs font-semibold">3. تحصل على نقاط</p><p className="mt-0.5 text-[10px] text-muted-foreground">تقديرًا لمساعدتك للطلبة</p></div>
			</div>

			<section className="overflow-hidden rounded-2xl border border-primary/15 bg-card shadow-sm">
				<div className="flex items-center gap-2 border-b bg-secondary/25 px-4 py-3"><Sparkles className="h-4 w-4 text-primary" /><h2 className="text-sm font-bold">أرسل مساهمتك</h2></div>
				<div className="p-4"><LectureContributionForm /></div>
			</section>

			{mine.length > 0 && (
				<section>
					<h2 className="mb-2 text-sm font-bold">📋 مساهماتي في الدروس</h2>
					<div className="overflow-hidden rounded-xl border bg-card"><div className="divide-y">
						{mine.map((c) => (
							<div key={c.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
								<span className="min-w-0 flex-1">
									<span className="block truncate text-xs font-medium" dir="ltr">{c.fileName}</span>
									<span className="text-[10px] text-muted-foreground">{c.universityName || "—"}{c.levelText ? ` · ${c.levelText}` : ""} · {fmtSize(c.fileSizeBytes)} · {c.createdAt.toLocaleDateString("ar-DZ")}</span>
								</span>
								<StatusChip status={c.status} points={c.pointsAwarded} />
							</div>
						))}
					</div></div>
				</section>
			)}

			<p className="text-center text-[11px] text-muted-foreground">تريد المساهمة بمواضيع أو حلول؟ <Link href="/contribute" className="text-primary hover:underline">اذهب إلى صفحة ساهم معنا</Link></p>
		</main>
	);
}
