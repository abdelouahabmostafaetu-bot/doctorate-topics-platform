import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { MathContent } from "@/components/math-content";
import { FavoriteButton } from "@/components/favorite-button";
import { ReportButton } from "@/components/report-button";

export const dynamic = "force-dynamic";

const examTypeLabel: Record<string, string> = {
	general: "مسابقة عامة",
	specialty: "مسابقة تخصص",
};

const difficultyLabel: Record<string, string> = {
	easy: "سهل",
	medium: "متوسط",
	hard: "صعب",
};

const difficultyClass: Record<string, string> = {
	easy: "bg-emerald-100 text-emerald-800",
	medium: "bg-amber-100 text-amber-800",
	hard: "bg-red-100 text-red-800",
};

export default async function TopicPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const topic = await prisma.topic.findUnique({
		where: { slug },
		include: { university: true, specialty: true },
	});
	if (!topic || topic.status !== "published") notFound();

	const session = await auth();
	const userId = session?.user?.id ?? null;
	const favorite = userId
		? await prisma.favorite.findUnique({
				where: { userId_topicId: { userId, topicId: topic.id } },
			})
		: null;

	const duration = topic.durationMinutes
		? `${Math.floor(topic.durationMinutes / 60)}سا${topic.durationMinutes % 60 ? ` ${topic.durationMinutes % 60}د` : ""}`
		: null;

	const chips = [
		`${topic.year}`,
		examTypeLabel[topic.examType] ?? topic.examType,
		topic.specialty.nameAr,
		topic.coefficient != null ? `المعامل: ${topic.coefficient}` : null,
		duration ? `المدة: ${duration}` : null,
	].filter(Boolean) as string[];

	const downloadHref = `/download?slug=${topic.slug}`;

	return (
		<div className="mx-auto max-w-3xl px-4 py-10">
			{/* زر تحميل عائم على يسار الموضوع (شاشات كبيرة) */}
			<Link
				href={downloadHref}
				title="تحميل الموضوع PDF (بدون حلول)"
				aria-label="تحميل الموضوع PDF"
				className="fixed bottom-8 left-6 z-40 hidden h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl text-primary-foreground shadow-lg transition hover:scale-110 lg:flex"
			>
				⬇
			</Link>

			<nav className="text-sm text-muted-foreground">
				<Link href="/search" className="hover:text-primary">
					المواضيع
				</Link>
				{" / "}
				<span>{topic.university.nameAr}</span>
				{" / "}
				{topic.year}
			</nav>

			<header className="mt-4">
				<h1 className="text-2xl font-bold leading-relaxed">
					مسابقة دكتوراه {topic.year} — {topic.university.nameAr}
					{topic.examNumber != null &&
						` — الموضوع ${String(topic.examNumber).padStart(2, "0")}`}
				</h1>
				<div className="mt-3 flex flex-wrap gap-2 text-xs">
					{chips.map((chip) => (
						<span
							key={chip}
							className="rounded-full bg-secondary px-3 py-1 text-secondary-foreground"
						>
							{chip}
						</span>
					))}
				</div>

				{/* أزرار الإجراءات: تحميل PDF — مفضلة — تبليغ */}
				<div className="mt-4 flex flex-wrap items-center gap-2">
					<Link
						href={downloadHref}
						className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
					>
						📄 تحميل PDF{" "}
						<span className="text-xs opacity-80">(بدون حلول)</span>
					</Link>
					<FavoriteButton
						topicId={topic.id}
						slug={topic.slug}
						initialFavorited={Boolean(favorite)}
						isLoggedIn={Boolean(userId)}
					/>
					<ReportButton topicId={topic.id} />
				</div>

				{topic.source && (
					<p
						dir="ltr"
						className="mt-3 rounded-md bg-muted px-3 py-2 text-left text-xs text-muted-foreground"
					>
						{topic.source}
					</p>
				)}
			</header>

			<div className="mt-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
				<strong>تنبيه:</strong> تمت إعادة كتابة هذا الموضوع باستخدام الذكاء
				الاصطناعي، وقد يكون الحل المرفق مولّدًا بالذكاء الاصطناعي. يُنصح
				بالتحقق من صحته قبل الاعتماد عليه، والإبلاغ عن أي خطأ يتم اكتشافه.{" "}
				<Link href="/about#ai-notice" className="font-medium underline">
					التفاصيل
				</Link>
			</div>

			<div className="mt-8 space-y-8">
				{topic.problems.map((p) => (
					<article
						key={p.problemNumber}
						className="rounded-lg border bg-card p-5 shadow-sm"
					>
						<div className="flex flex-wrap items-center justify-between gap-2">
							<h2 className="text-lg font-semibold">
								التمرين {p.problemNumber}
							</h2>
							<div className="flex items-center gap-2">
								<ReportButton
									topicId={topic.id}
									problemNumber={p.problemNumber}
									compact
								/>
								<span
									className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${difficultyClass[p.difficulty] ?? "bg-muted"}`}
								>
									{difficultyLabel[p.difficulty] ?? p.difficulty}
								</span>
							</div>
						</div>
						<p
							dir="ltr"
							className="mt-1 text-left text-sm font-medium text-muted-foreground"
						>
							{p.title}
						</p>
						{p.tags.length > 0 && (
							<div
								dir="ltr"
								className="mt-2 flex flex-wrap justify-start gap-1.5"
							>
								{p.tags.map((tag) => (
									<span
										key={tag}
										className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
									>
										{tag}
									</span>
								))}
							</div>
						)}

						<div className="mt-4">
							<MathContent content={p.statement} />
						</div>

						{p.remark && (
							<div className="mt-3 rounded-md border-s-4 border-warning bg-muted/60 p-3">
								<MathContent content={p.remark} className="text-sm" />
							</div>
						)}

						{p.hasSolution && p.solution && (
							<details className="mt-4 rounded-lg border bg-muted/40">
								<summary className="cursor-pointer select-none px-4 py-3 font-semibold text-primary">
									عرض الحل ✅
								</summary>
								<div className="border-t px-4 py-3">
									<MathContent content={p.solution} />
								</div>
							</details>
						)}
					</article>
				))}
			</div>
		</div>
	);
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const topic = await prisma.topic.findUnique({
		where: { slug },
		include: { university: true },
	});
	if (!topic) return { title: "موضوع غير موجود" };
	return {
		title: `مسابقة دكتوراه ${topic.year} — ${topic.university.nameAr}`,
	};
}
